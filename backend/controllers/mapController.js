const bikeStations = require("../data/bikeStations");

exports.showMap = (req, res) => {
    res.render("index", {
        bikeStations
    });
};