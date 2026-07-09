const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---- In-memory "database" ----
const vehicles = [
  { id: 1, name: 'City Bicycle', ratePerHour: 1, image: 'bike.png', seats: 1 },
  { id: 2, name: 'Mountain Bike', ratePerHour: 2, image: 'bike.png', seats: 1 },
  { id: 3, name: 'Electric Bicycle', ratePerHour: 3, image: 'bike.png', seats: 1 },
  { id: 4, name: 'Tandem Bicycle', ratePerHour: 4, image: 'bike.png', seats: 2 },
];

let bookings = [];

// ---- Helpers ----
function calculatePrice(startTime, endTime, ratePerHour) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;

  if (isNaN(start) || isNaN(end)) {
    return { error: 'Invalid date/time provided.' };
  }
  if (diffMs <= 0) {
    return { error: 'End time must be after start time.' };
  }

  const hours = diffMs / (1000 * 60 * 60);
  // Round up to nearest hour, like real rental pricing (minimum 1 hour)
  const billableHours = Math.max(1, Math.ceil(hours));
  const totalPrice = +(billableHours * ratePerHour).toFixed(2);

  return { hours: +hours.toFixed(2), billableHours, totalPrice };
}

// ---- Routes ----

// Home: list vehicles
app.get('/', (req, res) => {
  res.render('index', { vehicles });
});

// Booking form for a specific vehicle
app.get('/book/:vehicleId', (req, res) => {
  const vehicle = vehicles.find(v => v.id === parseInt(req.params.vehicleId));
  if (!vehicle) return res.status(404).render('error', { message: 'Vehicle not found' });
  res.render('book', { vehicle, error: null, calc: null, form: {} });
});

// Live price calculation (also used by AJAX on the front-end)
app.post('/calculate-price', (req, res) => {
  const { ratePerHour, startTime, endTime } = req.body;
  const rate = parseFloat(ratePerHour);

  if (!startTime || !endTime || isNaN(rate)) {
    return res.status(400).json({ error: 'Missing or invalid input.' });
  }

  const result = calculatePrice(startTime, endTime, rate);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// Submit booking
app.post('/book/:vehicleId', (req, res) => {
  const vehicle = vehicles.find(v => v.id === parseInt(req.params.vehicleId));
  if (!vehicle) return res.status(404).render('error', { message: 'Vehicle not found' });

  const { customerName, startTime, endTime } = req.body;
  const result = calculatePrice(startTime, endTime, vehicle.ratePerHour);

  if (result.error) {
    return res.render('book', {
      vehicle,
      error: result.error,
      calc: null,
      form: { customerName, startTime, endTime },
    });
  }

  const booking = {
    id: uuidv4(),
    vehicleId: vehicle.id,
    vehicleName: vehicle.name,
    customerName: customerName || 'Guest',
    startTime,
    endTime,
    billableHours: result.billableHours,
    totalPrice: result.totalPrice,
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  res.redirect(`/confirmation/${booking.id}`);
});

// Booking confirmation
app.get('/confirmation/:id', (req, res) => {
  const booking = bookings.find(b => b.id === req.params.id);
  if (!booking) return res.status(404).render('error', { message: 'Booking not found' });
  res.render('confirmation', { booking });
});

// All bookings (admin/dashboard view)
app.get('/bookings', (req, res) => {
  res.render('bookings', { bookings });
});

// Cancel a booking
app.post('/bookings/:id/cancel', (req, res) => {
  bookings = bookings.filter(b => b.id !== req.params.id);
  res.redirect('/bookings');
});

// Health check endpoint (useful for Docker/CI)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// Only start the server if this file is run directly (not when imported for tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ride booking app running at http://localhost:${PORT}`);
  });
}

module.exports = { app, calculatePrice, vehicles };
