const client = require('prom-client');

// This Registry holds all CityScoot measurements.
const register = new client.Registry();

// Adds the same application label to every measurement.
register.setDefaultLabels({
  application: 'cityscoot',
});

// Automatically collects Node.js measurements such as:
// CPU usage, memory usage and event-loop information.
client.collectDefaultMetrics({
  register,
  prefix: 'cityscoot_',
});

// Counts how many HTTP requests CityScoot receives.
const httpRequestsTotal = new client.Counter({
  name: 'cityscoot_http_requests_total',
  help: 'Total number of HTTP requests received by CityScoot',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Measures how long HTTP requests take.
const httpRequestDurationSeconds = new client.Histogram({
  name: 'cityscoot_http_request_duration_seconds',
  help: 'Duration of CityScoot HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// This runs whenever someone visits a CityScoot page.
function metricsMiddleware(req, res, next) {
  // Do not count Prometheus checks or the browser icon request.
  if (req.path === '/metrics' || req.path === '/favicon.ico') {
    return next();
  }
  const endTimer = httpRequestDurationSeconds.startTimer();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: req.route?.path || req.path || 'unknown',
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });

  next();
}

// This displays all measurements at /metrics.
async function metricsHandler(req, res) {
  try {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    console.error('Unable to create Prometheus metrics:', error);
    res.status(500).send('Unable to create Prometheus metrics');
  }
}

module.exports = {
  metricsMiddleware,
  metricsHandler,
};
