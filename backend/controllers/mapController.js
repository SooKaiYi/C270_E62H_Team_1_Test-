const pool = require("../config/database");

async function showMap(req, res) {
    try {
        const [bikeStations] = await pool.execute(`
            SELECT
                id,
                name,
                latitude AS lat,
                longitude AS lng
            FROM bike_stations
            ORDER BY id
        `);

        res.render("index", {
            bikeStations
        });
    } catch (error) {
        console.error("Unable to load map:", error);

        res.status(500).send(
            "Unable to load the map."
        );
    }
}

module.exports = {
    showMap
};