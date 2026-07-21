/**
 * Unit tests for bikeModel.js
 *
 * bikeModel reads/writes bikes.json directly via fs.promises. That's mocked
 * with a simple in-memory array instead of touching the real data file.
 */

jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn(),
        writeFile: jest.fn()
    }
}));
const fs = require("fs");

let store;

beforeEach(() => {
    store = [
        { id: 1, name: "City Cruiser", description: "A bike", price: 5, status: "Available", image: "/images/default-bike.jpg" }
    ];

    fs.promises.readFile.mockImplementation(async () => JSON.stringify(store));
    fs.promises.writeFile.mockImplementation(async (_path, data) => {
        store = JSON.parse(data);
    });
});

const bikeModel = require("./bikeModel");

describe("getAllBikes / getBikeById", () => {
    test("getAllBikes returns every bike in the file", async () => {
        const bikes = await bikeModel.getAllBikes();
        expect(bikes).toHaveLength(1);
    });

    test("getBikeById finds a bike by numeric id, even if a string id is passed in", async () => {
        const bike = await bikeModel.getBikeById("1");
        expect(bike.name).toBe("City Cruiser");
    });

    test("getBikeById returns undefined for a bike that doesn't exist", async () => {
        const bike = await bikeModel.getBikeById(999);
        expect(bike).toBeUndefined();
    });
});

describe("addBike", () => {
    test("assigns the next id after the highest existing id", async () => {
        const newBike = await bikeModel.addBike({ name: "Mountain Bike", description: "Rugged", price: "8" });
        expect(newBike.id).toBe(2);
    });

    test("defaults status to Available and converts price to a number", async () => {
        const newBike = await bikeModel.addBike({ name: "Mountain Bike", description: "Rugged", price: "8" });
        expect(newBike.status).toBe("Available");
        expect(newBike.price).toBe(8);
        expect(typeof newBike.price).toBe("number");
    });

    test("the first bike ever added gets id 1", async () => {
        store = [];
        const newBike = await bikeModel.addBike({ name: "First Bike", description: "x", price: 5 });
        expect(newBike.id).toBe(1);
    });
});

describe("updateBike", () => {
    test("throws when the bike doesn't exist", async () => {
        await expect(
            bikeModel.updateBike(999, { name: "x", description: "x", price: 1, status: "Available", image: "x" })
        ).rejects.toThrow(/not found/i);
    });

    test("updates an existing bike's fields", async () => {
        const updated = await bikeModel.updateBike(1, {
            name: "Renamed Bike", description: "New desc", price: "12", status: "Maintenance", image: "/img.jpg"
        });
        expect(updated.name).toBe("Renamed Bike");
        expect(updated.price).toBe(12);
        expect(updated.status).toBe("Maintenance");
    });
});

describe("deleteBike", () => {
    test("removes the bike with the matching id", async () => {
        await bikeModel.deleteBike(1);
        expect(store).toHaveLength(0);
    });

    test("leaves other bikes untouched", async () => {
        store.push({ id: 2, name: "Bike 2", description: "x", price: 5, status: "Available", image: "x" });
        await bikeModel.deleteBike(1);
        expect(store).toHaveLength(1);
        expect(store[0].id).toBe(2);
    });
});

describe("updateBikeStatus", () => {
    test("throws when the bike doesn't exist", async () => {
        await expect(bikeModel.updateBikeStatus(999, "Rented")).rejects.toThrow(/not found/i);
    });

    test("updates only the status field, leaving everything else alone", async () => {
        const updated = await bikeModel.updateBikeStatus(1, "Rented");
        expect(updated.status).toBe("Rented");
        expect(updated.name).toBe("City Cruiser");
    });
});
