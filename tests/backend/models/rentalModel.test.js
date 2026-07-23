jest.mock('../../../backend/config/database');

const db = require('../../../backend/config/database');
const bikeModel = require('../../../backend/models/bikeModel');
const walletModel = require('../../../backend/models/walletModel');
const rentalModel = require('../../../backend/models/rentalModel');

beforeEach(() => {
  db._reset();
});

async function seedBikeAndWallet({
  price = 5,
  balance = 0,
  tripCredits = 0,
  dayPassCredits = 0,
} = {}) {
  const bike = await bikeModel.addBike({
    name: 'City Bike',
    description: '',
    price,
  });
  await walletModel.getOrCreateWallet(2);
  const wallet = db._store().wallets.find((w) => w.userId === 2);
  Object.assign(wallet, { balance, tripCredits, dayPassCredits });
  return bike;
}

describe('rentBike payment priority', () => {
  test('throws when the bike does not exist', async () => {
    await walletModel.getOrCreateWallet(2);
    await expect(
      rentalModel.rentBike({ userId: 2, userName: 'x', bikeId: 999 })
    ).rejects.toThrow(/bike not found/i);
  });

  test('throws when the bike is already rented', async () => {
    const bike = await seedBikeAndWallet({ balance: 100 });
    db._store().bikes.find((b) => b.id === bike.id).status = 'Rented';
    await expect(
      rentalModel.rentBike({ userId: 2, userName: 'x', bikeId: bike.id })
    ).rejects.toThrow(/already been rented/i);
  });

  test('throws when the wallet does not exist', async () => {
    const bike = await bikeModel.addBike({
      name: 'City Bike',
      description: '',
      price: 5,
    });
    await expect(
      rentalModel.rentBike({ userId: 999, userName: 'x', bikeId: bike.id })
    ).rejects.toThrow(/wallet not found/i);
  });

  test('day pass credits are used first, even with trip credits and balance available', async () => {
    const bike = await seedBikeAndWallet({
      price: 5,
      balance: 100,
      tripCredits: 2,
      dayPassCredits: 3,
    });
    const rental = await rentalModel.rentBike({
      userId: 2,
      userName: 'x',
      bikeId: bike.id,
    });
    expect(rental.paymentMethod).toBe('Day Pass');
    expect(rental.amount).toBe(0);
    const wallet = db._store().wallets.find((w) => w.userId === 2);
    expect(wallet.dayPassCredits).toBe(2);
    expect(wallet.tripCredits).toBe(2);
    expect(wallet.balance).toBe(100);
  });

  test('trip credits are used second, when there is no day pass credit', async () => {
    const bike = await seedBikeAndWallet({
      price: 5,
      balance: 100,
      tripCredits: 2,
      dayPassCredits: 0,
    });
    const rental = await rentalModel.rentBike({
      userId: 2,
      userName: 'x',
      bikeId: bike.id,
    });
    expect(rental.paymentMethod).toBe('2 Way Trip');
    expect(rental.amount).toBe(0);
    const wallet = db._store().wallets.find((w) => w.userId === 2);
    expect(wallet.tripCredits).toBe(1);
  });

  test('wallet balance is used last', async () => {
    const bike = await seedBikeAndWallet({ price: 5, balance: 20 });
    const rental = await rentalModel.rentBike({
      userId: 2,
      userName: 'x',
      bikeId: bike.id,
    });
    expect(rental.paymentMethod).toBe('Wallet');
    expect(rental.amount).toBe(5);
    const wallet = db._store().wallets.find((w) => w.userId === 2);
    expect(wallet.balance).toBe(15);
  });

  test('throws InsufficientBalanceError when there is no credit and not enough balance', async () => {
    const bike = await seedBikeAndWallet({ price: 5, balance: 2 });
    await expect(
      rentalModel.rentBike({ userId: 2, userName: 'x', bikeId: bike.id })
    ).rejects.toThrow(walletModel.InsufficientBalanceError);
  });

  test('a successful rental marks the bike as Rented', async () => {
    const bike = await seedBikeAndWallet({ balance: 20 });
    await rentalModel.rentBike({ userId: 2, userName: 'x', bikeId: bike.id });
    expect((await bikeModel.getBikeById(bike.id)).status).toBe('Rented');
  });
});

describe('returnBike', () => {
  test('throws when the rental does not exist', async () => {
    await expect(rentalModel.returnBike(999)).rejects.toThrow(
      /rental not found/i
    );
  });

  test('marks the rental Returned and frees the bike', async () => {
    const bike = await seedBikeAndWallet({ balance: 20 });
    const rental = await rentalModel.rentBike({
      userId: 2,
      userName: 'x',
      bikeId: bike.id,
    });
    const returned = await rentalModel.returnBike(rental.id);
    expect(returned.status).toBe('Returned');
    expect(returned.returnedAt).not.toBeNull();
    expect((await bikeModel.getBikeById(bike.id)).status).toBe('Available');
  });
});

describe('getUserRentals', () => {
  test('only returns rentals belonging to the requested user', async () => {
    const bike1 = await seedBikeAndWallet({ balance: 100 });
    await walletModel.getOrCreateWallet(3);
    Object.assign(
      db._store().wallets.find((w) => w.userId === 3),
      { balance: 100 }
    );
    const bike2 = await bikeModel.addBike({
      name: 'Bike 2',
      description: '',
      price: 3,
    });

    await rentalModel.rentBike({ userId: 2, userName: 'A', bikeId: bike1.id });
    await rentalModel.rentBike({ userId: 3, userName: 'B', bikeId: bike2.id });

    const rentals = await rentalModel.getUserRentals(2);
    expect(rentals).toHaveLength(1);
    expect(rentals[0].userId).toBe(2);
  });
});

describe('deleteRental', () => {
  test('throws when the rental does not exist', async () => {
    await expect(rentalModel.deleteRental(999)).rejects.toThrow(
      /rental not found/i
    );
  });

  test('removes the rental and frees the bike if it was active', async () => {
    const bike = await seedBikeAndWallet({ balance: 20 });
    const rental = await rentalModel.rentBike({
      userId: 2,
      userName: 'x',
      bikeId: bike.id,
    });
    await rentalModel.deleteRental(rental.id);
    expect(await rentalModel.getUserRentals(2)).toHaveLength(0);
    expect((await bikeModel.getBikeById(bike.id)).status).toBe('Available');
  });
});
