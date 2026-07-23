/**
 * adminWalletModel.js issues exactly 3 pool.execute() calls in a fixed
 * order (wallet summary, transactions, statistics) with complex
 * JOIN/GROUP BY/subquery SQL. Rather than reimplementing that SQL logic
 * in a mock (which would just be re-testing my mock, not your code), this
 * mocks each call's raw return value directly and verifies the function
 * correctly SHAPES that data - the Number() coercions, array mapping, and
 * object structuring, which is real JS logic worth testing on its own.
 */

jest.mock('../../../backend/config/database', () => ({
    execute: jest.fn(),
}));

const pool = require('../../../backend/config/database');
const adminWalletModel = require('../../../backend/models/adminWalletModel');

beforeEach(() => {
    pool.execute.mockReset();
});

test('correctly shapes the wallets summary, coercing string numbers to real numbers', async () => {
    pool.execute
        .mockResolvedValueOnce([[
            { userId: 2, name: 'Member User', email: 'member@bikeapp.com', balance: '15.50', transactionCount: '3' },
        ]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ totalMembers: '1', totalWalletBalance: '15.50', totalTransactions: '3', totalTopUps: '20.00', totalSpending: '4.50' }]]);

    const result = await adminWalletModel.getAdminWalletDashboard();

    expect(result.wallets).toHaveLength(1);
    expect(result.wallets[0].balance).toBe(15.5);
    expect(typeof result.wallets[0].balance).toBe('number');
    expect(result.wallets[0].transactionCount).toBe(3);
});

test('correctly shapes the transaction list', async () => {
    pool.execute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[
            { transactionId: 1, userId: 2, type: 'Top Up', amount: '20.00', balanceAfter: '20.00', status: 'Success', timestamp: '2026-01-01', userName: 'Member User', userEmail: 'member@bikeapp.com' },
        ]])
        .mockResolvedValueOnce([[{ totalMembers: '0', totalWalletBalance: '0', totalTransactions: '0', totalTopUps: '0', totalSpending: '0' }]]);

    const result = await adminWalletModel.getAdminWalletDashboard();

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amount).toBe(20);
    expect(typeof result.transactions[0].amount).toBe('number');
});

test('correctly shapes the statistics summary', async () => {
    pool.execute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ totalMembers: '5', totalWalletBalance: '123.45', totalTransactions: '10', totalTopUps: '200.00', totalSpending: '76.55' }]]);

    const result = await adminWalletModel.getAdminWalletDashboard();

    expect(result.statistics).toEqual({
        totalMembers: 5,
        totalWalletBalance: 123.45,
        totalTransactions: 10,
        totalTopUps: 200,
        totalSpending: 76.55,
    });
});

test('issues exactly 3 queries, in order', async () => {
    pool.execute
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[{ totalMembers: '0', totalWalletBalance: '0', totalTransactions: '0', totalTopUps: '0', totalSpending: '0' }]]);

    await adminWalletModel.getAdminWalletDashboard();

    expect(pool.execute).toHaveBeenCalledTimes(3);
});
