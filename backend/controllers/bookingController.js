const fs = require('fs');
const path = require('path');
const bikeStations = require('../data/rentalStations');

const RATE_PER_HOUR = 1; // $1 per hour
const bookingsPath = path.join(__dirname, '../data/bookings.json');

function readBookings() {
  try {
    const data = fs.readFileSync(bookingsPath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2));
}

// GET / -> show booking form
exports.showBookingForm = (req, res) => {
  res.render('bikeBookingForm', { stations: bikeStations, error: null });
};

// POST /calculate -> validate, compute price, save booking, show confirmation
exports.calculatePrice = (req, res) => {
  const { stationId, renterName, startTime, endTime } = req.body;

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (!startTime || !endTime || isNaN(start) || isNaN(end) || end <= start) {
    return res.render('bikeBookingForm', {
      stations: bikeStations,
      error: 'Please enter a valid start and end time, with the end time after the start time.'
    });
  }

  const durationHours = (end - start) / (1000 * 60 * 60);
  // Bill in 15-minute increments, rounded up
  const billedHours = Math.ceil(durationHours * 4) / 4;
  const totalCost = (billedHours * RATE_PER_HOUR).toFixed(2);

  const station = bikeStations.find(s => s.id === parseInt(stationId, 10));

  const booking = {
    id: Date.now(),
    renterName: renterName && renterName.trim() ? renterName.trim() : 'Guest',
    station: station ? station.name : 'Unknown station',
    startTime,
    endTime,
    durationHours: billedHours.toFixed(2),
    ratePerHour: RATE_PER_HOUR.toFixed(2),
    totalCost
  };

  const bookings = readBookings();
  bookings.push(booking);
  writeBookings(bookings);

  res.render('confirmation', { booking });
};

// GET /bookings -> list all past bookings
exports.viewBookings = (req, res) => {
  const bookings = readBookings().reverse();
  res.render('bookings', { bookings });
};
