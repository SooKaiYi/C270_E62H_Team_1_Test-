const fs = require("fs").promises;
const path = require("path");

const bikeFile = path.join(__dirname, "../data/bikes.json");

// ==============================
// Read bikes.json
// ==============================
async function getAllBikes() {
    const data = await fs.readFile(bikeFile, "utf8");
    return JSON.parse(data);
}

// ==============================
// Find bike by ID
// ==============================
async function getBikeById(id) {
    const bikes = await getAllBikes();

    return bikes.find(
        bike => bike.id === Number(id)
    );
}

// ==============================
// Save bikes.json
// ==============================
async function saveBikes(bikes) {
    await fs.writeFile(
        bikeFile,
        JSON.stringify(bikes, null, 2)
    );
}

// ==============================
// Add Bike
// ==============================
async function addBike(bikeData) {

    const bikes = await getAllBikes();

    const newBike = {
        id: bikes.length
            ? Math.max(...bikes.map(b => b.id)) + 1
            : 1,

        name: bikeData.name,
        description: bikeData.description,
        price: Number(bikeData.price),
        status: "Available",
        image: bikeData.image || "/images/default-bike.jpg"
    };

    bikes.push(newBike);

    await saveBikes(bikes);

    return newBike;
}

// ==============================
// Update Bike
// ==============================
async function updateBike(id, bikeData) {

    const bikes = await getAllBikes();

    const bike = bikes.find(
        b => b.id === Number(id)
    );

    if (!bike) {
        throw new Error("Bike not found.");
    }

    bike.name = bikeData.name;
    bike.description = bikeData.description;
    bike.price = Number(bikeData.price);
    bike.status = bikeData.status;
    bike.image = bikeData.image;

    await saveBikes(bikes);

    return bike;
}

// ==============================
// Delete Bike
// ==============================
async function deleteBike(id) {

    const bikes = await getAllBikes();

    const updatedBikes = bikes.filter(
        bike => bike.id !== Number(id)
    );

    await saveBikes(updatedBikes);
}

// ==============================
// Change Bike Status
// ==============================
async function updateBikeStatus(id, status) {

    const bikes = await getAllBikes();

    const bike = bikes.find(
        b => b.id === Number(id)
    );

    if (!bike) {
        throw new Error("Bike not found.");
    }

    bike.status = status;

    await saveBikes(bikes);

    return bike;
}

module.exports = {
    getAllBikes,
    getBikeById,
    addBike,
    updateBike,
    deleteBike,
    updateBikeStatus
};