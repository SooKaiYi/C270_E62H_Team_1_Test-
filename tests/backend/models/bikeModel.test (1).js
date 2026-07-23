jest.mock('../../../backend/config/database');

const db = require('../../../backend/config/database');
const bikeModel = require('../../../backend/models/bikeModel');

beforeEach(() => {
    db._reset();
});

describe('getAllBikes / getBikeById', () => {
    test('getAllBikes returns every bike', async () => {
        await bikeModel.addBike({ name: 'Bike A', description: '', price: 5 });
        await bikeModel.addBike({ name: 'Bike B', description: '', price: 8 });
        const bikes = await bikeModel.getAllBikes();
        expect(bikes).toHaveLength(2);
    });

    test('getBikeById finds a bike by id', async () => {
        const created = await bikeModel.addBike({ name: 'Bike A', description: '', price: 5 });
        const found = await bikeModel.getBikeById(created.id);
        expect(found.name).toBe('Bike A');
    });

    test('getBikeById returns null for a bike that does not exist', async () => {
        const found = await bikeModel.getBikeById(999);
        expect(found).toBeNull();
    });
});

describe('addBike', () => {
    test('assigns sequential ids starting from 1', async () => {
        const first = await bikeModel.addBike({ name: 'Bike A', description: '', price: 5 });
        const second = await bikeModel.addBike({ name: 'Bike B', description: '', price: 8 });
        expect(first.id).toBe(1);
        expect(second.id).toBe(2);
    });

    test('defaults status to Available and converts price to a number', async () => {
        const bike = await bikeModel.addBike({ name: 'Bike A', description: '', price: '8' });
        expect(bike.status).toBe('Available');
        expect(bike.price).toBe(8);
        expect(typeof bike.price).toBe('number');
    });

    test('rejects a missing name', async () => {
        await expect(bikeModel.addBike({ name: '  ', description: '', price: 5 }))
            .rejects.toThrow(/name is required/i);
    });

    test('rejects an invalid price', async () => {
        await expect(bikeModel.addBike({ name: 'Bike A', description: '', price: -5 }))
            .rejects.toThrow(/valid number/i);
    });

    test('defaults to the placeholder image when none is given', async () => {
        const bike = await bikeModel.addBike({ name: 'Bike A', description: '', price: 5 });
        expect(bike.image).toBe('/images/default-bike.jpg');
    });
});

describe('updateBike', () => {
    test('throws when the bike does not exist', async () => {
        await expect(
            bikeModel.updateBike(999, { name: 'x', description: 'x', price: 1, status: 'Available', image: 'x' })
        ).rejects.toThrow(/not found/i);
    });

    test('updates every field correctly', async () => {
        const bike = await bikeModel.addBike({ name: 'Bike A', description: '', price: 5 });
        const updated = await bikeModel.updateBike(bike.id, {
            name: 'Renamed', description: 'New desc', price: '12', status: 'Maintenance', image: '/img.jpg',
        });
        expect(updated).toMatchObject({
            name: 'Renamed', description: 'New desc', price: 12, status: 'Maintenance', image: '/img.jpg',
        });
    });
});

describe('deleteBike', () => {
    test('removes the bike with the matching id', async () => {
        const bike = await bikeModel.addBike({ name: 'Bike A', description: '', price: 5 });
        await bikeModel.deleteBike(bike.id);
        expect(await bikeModel.getAllBikes()).toHaveLength(0);
    });

    test('throws when the bike does not exist', async () => {
        await expect(bikeModel.deleteBike(999)).rejects.toThrow(/not found/i);
    });
});

describe('updateBikeStatus', () => {
    test('rejects an invalid status', async () => {
        const bike = await bikeModel.addBike({ name: 'Bike A', description: '', price: 5 });
        await expect(bikeModel.updateBikeStatus(bike.id, 'Broken')).rejects.toThrow(/invalid bike status/i);
    });

    test('updates only the status, leaving other fields untouched', async () => {
        const bike = await bikeModel.addBike({ name: 'Bike A', description: '', price: 5 });
        const updated = await bikeModel.updateBikeStatus(bike.id, 'Rented');
        expect(updated.status).toBe('Rented');
        expect(updated.name).toBe('Bike A');
    });
});
