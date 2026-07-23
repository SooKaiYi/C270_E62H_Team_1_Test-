/**
 * Unit tests for rewardsController.js (MySQL-backed version).
 *
 * Uses a mock of ../config/database (backend/config/database.js in this
 * folder) that simulates the rewards / reward_transactions / users tables
 * in memory, including real transaction semantics (getConnection,
 * beginTransaction, commit, rollback) and row-locking (FOR UPDATE) query
 * patterns the real controller relies on.
 *
 * The mock was independently verified against the real rewardsController.js
 * before being wrapped in these Jest tests - see verify.js in this folder.
 */

jest.mock('../../../backend/config/database');

const db = require('../../../backend/config/database');
const rewardsController = require('../../../backend/controllers/rewardsController');

const member = { id: 2, name: 'Member User' };
const admin = { id: 1, name: 'Administrator' };
const jason = { id: 3, name: 'jason' };

beforeEach(() => {
    db._reset();
});

// =======================================
// calculatePoints (pure function, no DB)
// =======================================

describe('calculatePoints', () => {
    test('rides under 10 minutes earn 0 points', () => {
        const result = rewardsController.calculatePoints(9.5);
        expect(result.points).toBe(0);
        expect(result.message).toMatch(/too short/i);
    });

    test('rounds down to the nearest 10 minutes for points', () => {
        const result = rewardsController.calculatePoints(34);
        expect(result.points).toBe(3);
        expect(result.roundedMinutes).toBe(34);
    });

    test('65 minutes earns 15 points (the 60+ minute minimum), not 6', () => {
        const result = rewardsController.calculatePoints(65);
        expect(result.points).toBe(15);
    });

    test('180 minutes earns more than the minimum once the formula exceeds it', () => {
        const result = rewardsController.calculatePoints(180);
        expect(result.points).toBe(18);
    });

    test('exactly 10 minutes earns 1 point (boundary case)', () => {
        const result = rewardsController.calculatePoints(10);
        expect(result.points).toBe(1);
    });
});

// =======================================
// getOrCreateUserRewards
// =======================================

describe('getOrCreateUserRewards', () => {
    test('creates a fresh record with 0 points for a first-time user', async () => {
        const record = await rewardsController.getOrCreateUserRewards(member);
        expect(record.points).toBe(0);
        expect(record.rides).toBe(0);
        expect(record.referredBy).toBeNull();
    });

    test('auto-generates a referral code containing the user\'s id', async () => {
        const record = await rewardsController.getOrCreateUserRewards(member);
        expect(record.referralCode).toContain(String(member.id));
    });

    test('returns the same record on a second call, does not reset points', async () => {
        await rewardsController.getOrCreateUserRewards(member);
        db._store().rewards.find((r) => r.userId === member.id).points = 42;

        const second = await rewardsController.getOrCreateUserRewards(member);
        expect(second.points).toBe(42);
    });

    test('all numeric fields come back as real numbers, not strings', async () => {
        const record = await rewardsController.getOrCreateUserRewards(member);
        expect(typeof record.points).toBe('number');
        expect(typeof record.freeHours).toBe('number');
        expect(typeof record.rides).toBe('number');
        expect(typeof record.totalMinutes).toBe('number');
        expect(typeof record.friendsReferred).toBe('number');
    });
});

// =======================================
// addRidePoints
// =======================================

describe('addRidePoints', () => {
    test('a ride under 10 minutes fails and does not touch the balance', async () => {
        const result = await rewardsController.addRidePoints(member, 5);
        expect(result.success).toBe(false);
        expect(result.points).toBe(0);
    });

    test('a valid ride adds points, increments ride count, and logs a transaction', async () => {
        const result = await rewardsController.addRidePoints(member, 25);

        expect(result.success).toBe(true);
        expect(result.points).toBe(2);
        expect(result.newBalance).toBe(2);
        expect(result.transaction.type).toBe('earned');
    });

    test('points accumulate correctly across multiple rides', async () => {
        await rewardsController.addRidePoints(member, 25); // +2
        await rewardsController.addRidePoints(member, 65); // +15

        const record = await rewardsController.getOrCreateUserRewards(member);
        expect(record.points).toBe(17);
        expect(record.rides).toBe(2);
    });

    test('the transaction is actually recorded in reward_transactions', async () => {
        await rewardsController.addRidePoints(member, 65);
        const transactions = await rewardsController.getUserTransactions(member.id);
        expect(transactions).toHaveLength(1);
        expect(transactions[0].points).toBe(15);
        expect(transactions[0].type).toBe('earned');
    });
});

// =======================================
// processReferral
// =======================================

describe('processReferral', () => {
    test('rejects an invalid / unknown referral code', async () => {
        await rewardsController.getOrCreateUserRewards(member);
        const result = await rewardsController.processReferral(member, 'NOTAREALCODE');
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/invalid/i);
    });

    test('rejects a user trying to use their own code', async () => {
        const record = await rewardsController.getOrCreateUserRewards(member);
        const result = await rewardsController.processReferral(member, record.referralCode);
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/own code/i);
    });

    test('a valid referral gives the new user 5 points and the referrer 20 (first referral)', async () => {
        const adminRecord = await rewardsController.getOrCreateUserRewards(admin);

        const result = await rewardsController.processReferral(member, adminRecord.referralCode);

        expect(result.success).toBe(true);
        expect(result.pointsEarned).toBe(20); // referrer's first-friend bonus
        expect(result.newPoints).toBe(5);      // new user's welcome bonus

        const updatedAdmin = await rewardsController.getOrCreateUserRewards(admin);
        expect(updatedAdmin.points).toBe(20);
        expect(updatedAdmin.friendsReferred).toBe(1);
    });

    test('a second referral to the same referrer only earns 5 points, not 20', async () => {
        const adminRecord = await rewardsController.getOrCreateUserRewards(admin);

        await rewardsController.processReferral(member, adminRecord.referralCode);  // 1st -> +20
        await rewardsController.processReferral(jason, adminRecord.referralCode);   // 2nd -> +5

        const updatedAdmin = await rewardsController.getOrCreateUserRewards(admin);
        expect(updatedAdmin.points).toBe(25); // 20 + 5
        expect(updatedAdmin.friendsReferred).toBe(2);
    });

    test('a user cannot redeem a second referral code after already using one', async () => {
        const adminRecord = await rewardsController.getOrCreateUserRewards(admin);
        await rewardsController.processReferral(member, adminRecord.referralCode);

        const secondAttempt = await rewardsController.processReferral(member, adminRecord.referralCode);
        expect(secondAttempt.success).toBe(false);
        expect(secondAttempt.message).toMatch(/already used/i);
    });

    test('referral codes are matched case-insensitively', async () => {
        const adminRecord = await rewardsController.getOrCreateUserRewards(admin);
        const result = await rewardsController.processReferral(
            member,
            adminRecord.referralCode.toLowerCase()
        );
        expect(result.success).toBe(true);
    });

    test('both users get correctly-attributed transactions logged', async () => {
        const adminRecord = await rewardsController.getOrCreateUserRewards(admin);
        await rewardsController.processReferral(member, adminRecord.referralCode);

        const memberTxns = await rewardsController.getUserTransactions(member.id);
        const adminTxns = await rewardsController.getUserTransactions(admin.id);

        expect(memberTxns).toHaveLength(1);
        expect(memberTxns[0].points).toBe(5);
        expect(memberTxns[0].desc).toMatch(/welcome bonus/i);

        expect(adminTxns).toHaveLength(1);
        expect(adminTxns[0].points).toBe(20);
        expect(adminTxns[0].desc).toMatch(/referral bonus/i);
    });
});

// =======================================
// redeem
// =======================================

describe('redeem', () => {
    test('fails when the user does not have enough points', async () => {
        await rewardsController.getOrCreateUserRewards(member);
        const result = await rewardsController.redeem(member, 25);
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/not enough points/i);
    });

    test('rejects a point amount that is not a defined reward tier', async () => {
        await rewardsController.addRidePoints(member, 65); // 15 points
        const result = await rewardsController.redeem(member, 10);
        expect(result.success).toBe(false);
        expect(result.message).toMatch(/invalid reward option/i);
    });

    test('successfully redeems 25 points for 0.5 free hours', async () => {
        await rewardsController.addRidePoints(member, 65); // +15
        await rewardsController.addRidePoints(member, 65); // +15 = 30 total

        const result = await rewardsController.redeem(member, 25);

        expect(result.success).toBe(true);
        expect(result.newPoints).toBe(5); // 30 - 25
        expect(result.freeHours).toBe(0.5);
    });

    test('successfully redeems 50 points for 1 free hour', async () => {
        await rewardsController.addRidePoints(member, 180); // 18 points
        await rewardsController.addRidePoints(member, 180); // +18 = 36
        await rewardsController.addRidePoints(member, 180); // +18 = 54

        const result = await rewardsController.redeem(member, 50);

        expect(result.success).toBe(true);
        expect(result.newPoints).toBe(4); // 54 - 50
        expect(result.freeHours).toBe(1);
    });

    test('a redeem transaction is logged with the correct type', async () => {
        await rewardsController.addRidePoints(member, 65);
        await rewardsController.addRidePoints(member, 65); // 30 points

        await rewardsController.redeem(member, 25);

        const transactions = await rewardsController.getUserTransactions(member.id);
        const redeemTxn = transactions.find((t) => t.type === 'redeemed');
        expect(redeemTxn).toBeDefined();
        expect(redeemTxn.points).toBe(25);
    });
});

// =======================================
// getUserTransactions
// =======================================

describe('getUserTransactions', () => {
    test('only returns transactions belonging to the requested user', async () => {
        await rewardsController.addRidePoints(member, 65);
        await rewardsController.addRidePoints(admin, 65);

        const memberTxns = await rewardsController.getUserTransactions(member.id);
        expect(memberTxns).toHaveLength(1);
        expect(memberTxns[0].userId).toBe(member.id);
    });

    test('returns newest transaction first', async () => {
        await rewardsController.addRidePoints(member, 25);
        await rewardsController.addRidePoints(member, 65);

        const transactions = await rewardsController.getUserTransactions(member.id);
        expect(transactions).toHaveLength(2);
        expect(transactions[0].points).toBe(15); // the later, bigger ride
        expect(transactions[1].points).toBe(2);  // the earlier, smaller ride
    });

    test('returns an empty array for a user with no activity', async () => {
        await rewardsController.getOrCreateUserRewards(member);
        const transactions = await rewardsController.getUserTransactions(member.id);
        expect(transactions).toEqual([]);
    });
});
