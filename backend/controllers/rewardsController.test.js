/**
 * Unit tests for rewardsController.js
 *
 * The controller reads/writes rewards.json and transactions.json directly
 * via fs.readFileSync / fs.writeFileSync. To test the business logic in
 * isolation (without touching real data files, and without needing to
 * restructure the source), fs is mocked with a simple in-memory store that
 * resets before every test.
 */

jest.mock("fs");
const fs = require("fs");

let mockRewardsData;
let mockTransactionsData;

beforeEach(() => {
    mockRewardsData = {};
    mockTransactionsData = [];

    fs.existsSync = jest.fn(() => true);

    fs.readFileSync = jest.fn((filePath) => {
        if (String(filePath).includes("transactions.json")) {
            return JSON.stringify(mockTransactionsData);
        }
        return JSON.stringify(mockRewardsData);
    });

    fs.writeFileSync = jest.fn((filePath, data) => {
        if (String(filePath).includes("transactions.json")) {
            mockTransactionsData = JSON.parse(data);
        } else {
            mockRewardsData = JSON.parse(data);
        }
    });
});

const rewardsController = require("./rewardsController");

const member = { id: 2, name: "Member User", email: "member@bikeapp.com", role: "Member" };
const admin = { id: 1, name: "Administrator", email: "admin@bikeapp.com", role: "Admin" };

// =======================================
// calculatePoints
// =======================================

describe("calculatePoints", () => {
    test("rides under 10 minutes earn 0 points", () => {
        const result = rewardsController.calculatePoints(9.5);
        expect(result.points).toBe(0);
        expect(result.message).toMatch(/too short/i);
    });

    test("rounds down to the nearest 10 minutes for points", () => {
        // 34 minutes -> floor(34/10) = 3 points, NOT 3.4
        const result = rewardsController.calculatePoints(34);
        expect(result.points).toBe(3);
        expect(result.roundedMinutes).toBe(34);
    });

    test("65 minutes earns 15 points (the 60+ minute minimum), not 6", () => {
        const result = rewardsController.calculatePoints(65);
        expect(result.points).toBe(15);
    });

    test("120 minutes still respects the normal formula once it exceeds the minimum", () => {
        // floor(120/10) = 12, but minimum is 15, so 15 wins
        const result = rewardsController.calculatePoints(120);
        expect(result.points).toBe(15);
    });

    test("180 minutes earns more than the minimum once the formula exceeds it", () => {
        // floor(180/10) = 18, which is > the 15-point minimum
        const result = rewardsController.calculatePoints(180);
        expect(result.points).toBe(18);
    });

    test("exactly 10 minutes earns 1 point (boundary case)", () => {
        const result = rewardsController.calculatePoints(10);
        expect(result.points).toBe(1);
    });
});

// =======================================
// getOrCreateUserRewards
// =======================================

describe("getOrCreateUserRewards", () => {
    test("creates a fresh record with 0 points for a first-time user", () => {
        const record = rewardsController.getOrCreateUserRewards(member);
        expect(record.points).toBe(0);
        expect(record.rides).toBe(0);
        expect(record.referredBy).toBeNull();
    });

    test("auto-generates a referral code containing the user's id", () => {
        const record = rewardsController.getOrCreateUserRewards(member);
        expect(record.referralCode).toContain(String(member.id));
    });

    test("returns the same record on a second call, does not reset points", () => {
        const first = rewardsController.getOrCreateUserRewards(member);
        first.points = 42;
        mockRewardsData[String(member.id)] = first;

        const second = rewardsController.getOrCreateUserRewards(member);
        expect(second.points).toBe(42);
    });
});

// =======================================
// addRidePoints
// =======================================

describe("addRidePoints", () => {
    test("a ride under 10 minutes fails and does not touch the balance", () => {
        const result = rewardsController.addRidePoints(member, 5);
        expect(result.success).toBe(false);
        expect(result.points).toBe(0);
    });

    test("a valid ride adds points, increments ride count, and logs a transaction", () => {
        const result = rewardsController.addRidePoints(member, 25);

        expect(result.success).toBe(true);
        expect(result.points).toBe(2);
        expect(result.newBalance).toBe(2);
        expect(mockTransactionsData).toHaveLength(1);
        expect(mockTransactionsData[0].type).toBe("earned");
    });

    test("points accumulate correctly across multiple rides", () => {
        rewardsController.addRidePoints(member, 25); // +2
        rewardsController.addRidePoints(member, 65); // +15

        const record = rewardsController.getOrCreateUserRewards(member);
        expect(record.points).toBe(17);
        expect(record.rides).toBe(2);
    });
});

// =======================================
// processReferral
// =======================================

describe("processReferral", () => {
    test("rejects an invalid / unknown referral code", () => {
        const result = rewardsController.processReferral(member, "NOTAREALCODE");
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/invalid/i);
    });

    test("rejects a user trying to use their own code", () => {
        const record = rewardsController.getOrCreateUserRewards(member);
        const result = rewardsController.processReferral(member, record.referralCode);
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/own code/i);
    });

    test("a valid referral gives the new user 5 points and the referrer 20 (first referral)", () => {
        const adminRecord = rewardsController.getOrCreateUserRewards(admin);

        const result = rewardsController.processReferral(member, adminRecord.referralCode);

        expect(result.success).toBe(true);
        expect(result.pointsEarned).toBe(20); // referrer's first-friend bonus
        expect(result.newPoints).toBe(5);      // new user's welcome bonus

        const updatedAdmin = rewardsController.getOrCreateUserRewards(admin);
        expect(updatedAdmin.points).toBe(20);
        expect(updatedAdmin.friendsReferred).toBe(1);
    });

    test("a second referral to the same referrer only earns 5 points, not 20", () => {
        const adminRecord = rewardsController.getOrCreateUserRewards(admin);
        const thirdUser = { id: 3, name: "Jason", email: "jason@bikeapp.com", role: "Member" };

        rewardsController.processReferral(member, adminRecord.referralCode);   // 1st -> +20
        rewardsController.processReferral(thirdUser, adminRecord.referralCode); // 2nd -> +5

        const updatedAdmin = rewardsController.getOrCreateUserRewards(admin);
        expect(updatedAdmin.points).toBe(25); // 20 + 5
        expect(updatedAdmin.friendsReferred).toBe(2);
    });

    test("a user cannot redeem a second referral code after already using one", () => {
        const adminRecord = rewardsController.getOrCreateUserRewards(admin);
        rewardsController.processReferral(member, adminRecord.referralCode);

        const secondAttempt = rewardsController.processReferral(member, adminRecord.referralCode);
        expect(secondAttempt.success).toBe(false);
        expect(secondAttempt.message).toMatch(/already used/i);
    });
});

// =======================================
// redeem
// =======================================

describe("redeem", () => {
    test("fails when the user does not have enough points", () => {
        const result = rewardsController.redeem(member, 25);
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/not enough points/i);
    });

    test("successfully redeems 25 points for 0.5 free hours", () => {
        rewardsController.addRidePoints(member, 65); // gives 15 points... not enough yet
        rewardsController.addRidePoints(member, 65); // +15 more = 30 points total

        const result = rewardsController.redeem(member, 25);

        expect(result.success).toBe(true);
        expect(result.newPoints).toBe(5); // 30 - 25
        expect(result.freeHours).toBe(0.5);
    });

    test("does not grant free hours for a point amount that isn't a defined reward tier", () => {
        rewardsController.addRidePoints(member, 65); // 15 points

        const result = rewardsController.redeem(member, 10);

        expect(result.success).toBe(true);
        expect(result.freeHours).toBe(0); // 10 points isn't 25/50/100, so no hours granted
    });
});
