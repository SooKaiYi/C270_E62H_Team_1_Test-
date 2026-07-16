/* global L */
const bikeStations = JSON.parse(
    document.getElementById("bike-data").textContent
);

let markers = [];

let selectingLocation = false;
let userMarker = null;
let nearestLine = null;

// Singapore bounds
const singaporeBounds = [
  [1.15, 103.60],
  [1.47, 104.10]
];

// Initialize map
const map = L.map("map", {
  maxBounds: singaporeBounds,
  maxBoundsViscosity: 1.0,
  minZoom: 12,
  maxZoom: 18
}).setView([1.3000, 103.8000], 13);

// OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// Add markers
bikeStations.forEach(station => {

    const marker = L.marker([station.lat, station.lng])
        .addTo(map)
        .bindPopup(`<b>${station.name}</b><br>Rented bicycles here`);

    markers.push({
        marker,
        station
    });

});

// Distance calculation
function calculateDistance(lat1, lng1, lat2, lng2) {

    const R = 6371;

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

// Search
function searchLocation() {

    const searchInput =
        document.getElementById("searchInput").value.trim().toLowerCase();

    const resultsDiv =
        document.getElementById("searchResults");

    if (!searchInput) {

        resultsDiv.classList.remove("show");
        return;

    }

    const matchingStations =
        bikeStations.filter(station =>
            station.name.toLowerCase().includes(searchInput)
        );

    if (matchingStations.length === 0) {

        resultsDiv.innerHTML =
            `<strong>❌ No locations found for "${searchInput}"</strong><br>
            Try: Orchard, Marina Bay, or Bugis`;

        resultsDiv.classList.add("show");

        return;

    }

    const searchedLocation = matchingStations[0];

    let nearestStation = bikeStations[0];

    let minDistance = calculateDistance(
        searchedLocation.lat,
        searchedLocation.lng,
        bikeStations[0].lat,
        bikeStations[0].lng
    );

    bikeStations.forEach(station => {

        const distance = calculateDistance(
            searchedLocation.lat,
            searchedLocation.lng,
            station.lat,
            station.lng
        );

        if (distance < minDistance) {

            minDistance = distance;
            nearestStation = station;

        }

    });

    map.setView(
        [searchedLocation.lat, searchedLocation.lng],
        15
    );

    const distanceText =
        minDistance < 1
            ? `${(minDistance * 1000).toFixed(0)}m`
            : `${minDistance.toFixed(2)}km`;

    resultsDiv.innerHTML = `
        <strong>📍 Found: ${searchedLocation.name}</strong><br>
        <strong>🚲 Nearest bike rental: ${nearestStation.name}</strong><br>
        Distance: ${distanceText}
    `;

    resultsDiv.classList.add("show");

    const nearestMarkerObj =
        markers.find(
            m => m.station.name === nearestStation.name
        );

    if (nearestMarkerObj) {

        nearestMarkerObj.marker.openPopup();

    }

}

// Enter key
document
.getElementById("searchInput")
.addEventListener("keypress", function(e){

    if(e.key === "Enter"){

        searchLocation();

    }

});

document
.getElementById("selectLocationBtn")
.addEventListener("click", function(){

    selectingLocation = true;

    alert("Click anywhere on the map to choose your location.");

});

map.on("click", function(e){

    if(!selectingLocation){
        return;
    }

    selectingLocation = false;

    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if(userMarker){
        map.removeLayer(userMarker);
    }

    if(nearestLine){
        map.removeLayer(nearestLine);
    }

    userMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup("📍 Selected Location")
        .openPopup();

    let nearestStation = bikeStations[0];

    let minDistance = calculateDistance(
        lat,
        lng,
        bikeStations[0].lat,
        bikeStations[0].lng
    );

    bikeStations.forEach(station => {

        const distance = calculateDistance(
            lat,
            lng,
            station.lat,
            station.lng
        );

        if(distance < minDistance){

            minDistance = distance;
            nearestStation = station;

        }

    });

    nearestLine = L.polyline([
        [lat, lng],
        [nearestStation.lat, nearestStation.lng]
    ]).addTo(map);

    const distanceText =
        minDistance < 1
            ? `${(minDistance * 1000).toFixed(0)}m`
            : `${minDistance.toFixed(2)}km`;

    document.getElementById("searchResults").innerHTML = `
        <strong>📍 Selected Location</strong><br>
        <strong>🚲 Nearest Bike Station:</strong> ${nearestStation.name}<br>
        <strong>Distance:</strong> ${distanceText}
    `;

    document
        .getElementById("searchResults")
        .classList
        .add("show");

});
