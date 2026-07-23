jest.mock('../../../backend/config/database');

const db = require('../../../backend/config/database');
const walletModel = require('../../../backend/models/walletModel');

beforeEach(() => {
    db._reset();
});

describe('getOrCreateWallet', () => {
    test('creates a new wallet with 0 balance for a first-time user', async () => {
        const wallet = await walletModel.getOrCreateWallet(2);
        expect(wallet).toMatchObject({ userId: 2, balance: 0, tripCredits: 0, dayPassCredits: 0 });
    });

    test('rejects an invalid user id', async () => {
        await expect(walletModel.getOrCreateWallet(-1)).rejects.toThrow(/invalid user id/i);
        await expect(walletModel.getOrCreateWallet('abc')).rejects.toThrow(/invalid user id/i);
    });

    test('returns the same wallet on a second call, does not reset it', async () => {
        await walletModel.getOrCreateWallet(2);
        db._store().wallets.find((w) => w.userId === 2).balance = 100;
        const second = await walletModel.getOrCreateWallet(2);
        expect(second.balance).toBe(100);
    });
});

describe('topUpWallet', () => {
    test('rejects a top-up of 0 or less', async () => {
        await expect(walletModel.topUpWallet(2, 0)).rejects.toThrow(/more than 0/i);
        await expect(walletModel.topUpWallet(2, -10)).rejects.toThrow(/more than 0/i);
    });

    test('adds the amount to the wallet balance', async () => {
        const newBalance = await walletModel.topUpWallet(2, 25.5);
        expect(newBalance).toBe(25.5);
    });

    test('accumulates across multiple top-ups', async () => {
        await walletModel.topUpWallet(2, 10);
        const finalBalance = await walletModel.topUpWallet(2, 15);
        expect(finalBalance).toBe(25);
    });

    test('logs a Top Up transaction each time', async () => {
        await walletModel.topUpWallet(2, 10);
        const history = await walletModel.getTransactionHistory(2);
        expect(history).toHaveLength(1);
        expect(history[0].type).toBe('Top Up');
        expect(history[0].status).toBe('Success');
    });
});

describe('purchasePass', () => {
    test('rejects an unknown pass type', async () => {
        await walletModel.topUpWallet(2, 100);
        await expect(walletModel.purchasePass(2, 'not_a_real_pass')).rejects.toThrow(/valid pass/i);
    });

    test('throws InsufficientBalanceError and logs a Failed transaction when balance is too low', async () => {
        await expect(walletModel.purchasePass(2, 'day_pass')).rejects.toThrow(walletModel.InsufficientBalanceError);
        const history = await walletModel.getTransactionHistory(2);
        expect(history).toHaveLength(1);
        expect(history[0].status).toBe('Failed');
    });

    test('successfully buys a day pass: deducts price, grants 10 day-pass credits', async () => {
        await walletModel.topUpWallet(2, 20);
        const result = await walletModel.purchasePass(2, 'day_pass');
        expect(result.balanceAfter).toBe(10);
        expect(result.pass.credits).toBe(10);
        const wallet = await walletModel.getOrCreateWallet(2);
        expect(wallet.dayPassCredits).toBe(10);
    });

    test('successfully buys a two-way-trip pass: deducts price, grants 2 trip credits', async () => {
        await walletModel.topUpWallet(2, 10);
        await walletModel.purchasePass(2, 'two_way_trip');
        const wallet = await walletModel.getOrCreateWallet(2);
        expect(wallet.tripCredits).toBe(2);
        expect(wallet.balance).toBe(5);
    });
});

describe('getTransactionHistory', () => {
    test('only returns transactions for the requested user', async () => {
        await walletModel.topUpWallet(2, 10);
        await walletModel.topUpWallet(3, 10);
        const history = await walletModel.getTransactionHistory(2);
        expect(history).toHaveLength(1);
        expect(history[0].userId).toBe(2);
    });

    test('newest transaction comes first', async () => {
        await walletModel.topUpWallet(2, 10);
        await walletModel.topUpWallet(2, 20);
        const history = await walletModel.getTransactionHistory(2);
        expect(history[0].amount).toBe(20);
        expect(history[1].amount).toBe(10);
    });
});
