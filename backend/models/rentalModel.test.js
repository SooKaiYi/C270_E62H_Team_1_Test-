/**
 * Unit tests for rentalModel.js
 *
 * rentalModel reads/writes through jsonFileModel, mocked here with an
 * in-memory store. It also imports InsufficientBalanceError from
 * walletModel -- that's left as the real module since it's just an Error
 * class and walletModel's own file-touching functions are never called
 * from here (walletModel's own dependency, jsonFileModel, is mocked too,
 * so it's safe either way).
 */

jest.mock("./jsonFileModel");
const { readJson, writeJson } = require("./jsonFileModel");

let store;

beforeEach(() => {
    store = {
        "rentals.json": [],
        "bikes.json": [{ id: 1, name: "City Cruiser", price: 5, status: "Available" }],
        "wallets.json": [],
        "wallet_transactions.json": []
    };

    readJson.mockImplementation(async (fileName) => {
        return JSON.parse(JSON.stringify(store[fileName] || []));
    });

    writeJson.mockImplementation(async (fileName, data) => {
        store[fileName] = JSON.parse(JSON.stringify(data));
    });
});

const rentalModel = require("./rentalModel");

function setWallet(wallet) {
    store["wallets.json"] = [{ userId: 5, balance: 0, tripCredits: 0, dayPassCredits: 0, ...wallet }];
}

// =======================================
// rentBike -- payment priority
// =======================================

describe("rentBike payment priority", () => {
    test("throws when the bike doesn't exist", async () => {
        setWallet({ balance: 100 });
        await expect(rentalModel.rentBike({ userId: 5, bikeId: 999 })).rejects.toThrow(/bike not found/i);
    });

    test("throws when the bike is already rented", async () => {
        store["bikes.json"][0].status = "Rented";
        setWallet({ balance: 100 });
        await expect(rentalModel.rentBike({ userId: 5, bikeId: 1 })).rejects.toThrow(/already been rented/i);
    });

    test("throws when the wallet doesn't exist at all", async () => {
        store["wallets.json"] = [];
        await expect(rentalModel.rentBike({ userId: 5, bikeId: 1 })).rejects.toThrow(/wallet not found/i);
    });

    test("day pass credits are used first, even if trip credits and balance are also available", async () => {
        setWallet({ balance: 100, tripCredits: 2, dayPassCredits: 3 });

        const rental = await rentalModel.rentBike({ userId: 5, userName: "Test", bikeId: 1 });

        expect(rental.paymentMethod).toBe("Day Pass");
        expect(rental.amount).toBe(0);

        const wallet = store["wallets.json"][0];
        expect(wallet.dayPassCredits).toBe(2); // consumed one
        expect(wallet.tripCredits).toBe(2);    // untouched
        expect(wallet.balance).toBe(100);      // untouched
    });

    test("trip credits are used second, when there's no day pass credit", async () => {
        setWallet({ balance: 100, tripCredits: 2, dayPassCredits: 0 });

        const rental = await rentalModel.rentBike({ userId: 5, userName: "Test", bikeId: 1 });

        expect(rental.paymentMethod).toBe("2 Way Trip");
        expect(rental.amount).toBe(0);

        const wallet = store["wallets.json"][0];
        expect(wallet.tripCredits).toBe(1);
        expect(wallet.balance).toBe(100);
    });

    test("wallet balance is used last, when there's no day pass or trip credit", async () => {
        setWallet({ balance: 20, tripCredits: 0, dayPassCredits: 0 });

        const rental = await rentalModel.rentBike({ userId: 5, userName: "Test", bikeId: 1 });

        expect(rental.paymentMethod).toBe("Wallet");
        expect(rental.amount).toBe(5); // the bike's price

        const wallet = store["wallets.json"][0];
        expect(wallet.balance).toBe(15); // 20 - 5
    });

    test("throws InsufficientBalanceError when there's no credit and not enough balance", async () => {
        setWallet({ balance: 2, tripCredits: 0, dayPassCredits: 0 });
        await expect(rentalModel.rentBike({ userId: 5, userName: "Test", bikeId: 1 })).rejects.toThrow(/insufficient/i);
    });

    test("a successful rental marks the bike as Rented", async () => {
        setWallet({ balance: 20 });
        await rentalModel.rentBike({ userId: 5, userName: "Test", bikeId: 1 });

        expect(store["bikes.json"][0].status).toBe("Rented");
    });

    test("rental ids increment sequentially", async () => {
        setWallet({ balance: 100 });
        store["bikes.json"].push({ id: 2, name: "Bike 2", price: 3, status: "Available" });

        const rental1 = await rentalModel.rentBike({ userId: 5, userName: "Test", bikeId: 1 });
        const rental2 = await rentalModel.rentBike({ userId: 5, userName: "Test", bikeId: 2 });

        expect(rental1.id).toBe(1);
        expect(rental2.id).toBe(2);
    });
});

// =======================================
// returnBike
// =======================================

describe("returnBike", () => {
    test("throws when the rental doesn't exist", async () => {
        await expect(rentalModel.returnBike(999)).rejects.toThrow(/rental not found/i);
    });

    test("marks the rental as Returned and frees up the bike", async () => {
        setWallet({ balance: 20 });
        const rental = await rentalModel.rentBike({ userId: 5, userName: "Test", bikeId: 1 });

        const returned = await rentalModel.returnBike(rental.id);

        expect(returned.status).toBe("Returned");
        expect(returned.returnedAt).not.toBeNull();
        expect(store["bikes.json"][0].status).toBe("Available");
    });
});

// =======================================
// getUserRentals
// =======================================

describe("getUserRentals", () => {
    test("only returns rentals belonging to the requested user", async () => {
        setWallet({ balance: 100 });
        store["wallets.json"].push({ userId: 9, balance: 100, tripCredits: 0, dayPassCredits: 0 });
        store["bikes.json"].push({ id: 2, name: "Bike 2", price: 3, status: "Available" });

        await rentalModel.rentBike({ userId: 5, userName: "A", bikeId: 1 });
        await rentalModel.rentBike({ userId: 9, userName: "B", bikeId: 2 });

        const rentalsForUser5 = await rentalModel.getUserRentals(5);
        expect(rentalsForUser5).toHaveLength(1);
        expect(rentalsForUser5[0].userId).toBe(5);
    });
});

// =======================================
// deleteRental
// =======================================

describe("deleteRental", () => {
    test("throws when the rental doesn't exist", async () => {
        await expect(rentalModel.deleteRental(999)).rejects.toThrow(/rental not found/i);
    });

    test("removes the rental and frees the bike", async () => {
        setWallet({ balance: 20 });
        const rental = await rentalModel.rentBike({ userId: 5, userName: "Test", bikeId: 1 });

        await rentalModel.deleteRental(rental.id);

        expect(store["rentals.json"]).toHaveLength(0);
        expect(store["bikes.json"][0].status).toBe("Available");
    });
});
