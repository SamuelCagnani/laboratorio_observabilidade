const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('./logger');
const promClient = require('prom-client');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --- PROMETHEUS CONFIGURATION ---

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'nexus-app'
});

// Enable the collection of default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// CUSTOM METRICS
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status', 'event'],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5] // buckets for response time from 0.1s to 5s
});

const loginFailCounter = new promClient.Counter({
  name: 'login_failures_total',
  help: 'Total number of failed login attempts',
});

// Register custom metrics
register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDuration);
register.registerMetric(loginFailCounter);

// --- END PROMETHEUS CONFIGURATION ---

// In-memory database
let users = [];

// --- Observability Middleware (Logs + Metrics) ---
app.use((req, res, next) => {
    req.request_id = uuidv4().split('-')[0];
    const start = Date.now();

    res.on('finish', () => {
        const durationMs = Date.now() - start;
        const durationSec = durationMs / 1000;
        
        // --- 1. PROMETHEUS METRICS COLLECTION ---
        // Skip metrics for static assets unless they fail
        const isStatic = req.path.includes('.') || req.path === '/';
        if (!(res.statusCode < 400 && isStatic)) {
            
            // Increment Request Counter
            httpRequestCounter.inc({
                method: req.method,
                route: req.originalUrl || req.url,
                status: res.statusCode,
                event: res.custom_event || 'API_REQUEST'
            });

            // Observe Request Duration
            httpRequestDuration.observe({
                method: req.method,
                route: req.originalUrl || req.url,
                status: res.statusCode
            }, durationSec);

            // Specific check for Login Failures
            if (res.custom_event === 'USER_LOGIN_FAILED') {
                loginFailCounter.inc();
            }
        }
        // --- END METRICS ---

        // --- 2. STRUCTURED LOGGING (UNTOUCHED) ---
        if (res.statusCode < 400 && isStatic) return;

        if (!res.custom_event) {
            if (res.statusCode === 404) res.custom_event = 'ROUTE_NOT_FOUND';
            else if (res.statusCode >= 500) res.custom_event = 'INTERNAL_SERVER_ERROR';
            else res.custom_event = 'API_REQUEST';
        }

        const logType = res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info');
        
        logger[logType](res.custom_event, req, res, {
            duration: durationMs,
            message: res.error_message || 'Request processed'
        });
    });

    next();
});

// Helper for sending standardized error responses
const sendError = (res, status, event, message) => {
    res.custom_event = event;
    res.error_message = message;
    return res.status(status).json({ 
        error: message,
        event: event,
        request_id: res.req.request_id
    });
};

// --- ROUTES ---

// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    res.custom_event = 'USER_REGISTER';
    if (!name || !email || !password) return sendError(res, 400, 'USER_REGISTER_FAILED', 'All fields are required');
    const existingUser = users.find(u => u.email === email);
    if (existingUser) return sendError(res, 400, 'USER_REGISTER_FAILED', 'Email already registered');
    const newUser = { id: uuidv4(), name, email, password, createdAt: new Date().toISOString() };
    users.push(newUser);
    res.status(201).json({ id: newUser.id, name: newUser.name });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    res.custom_event = 'USER_LOGIN';
    const user = users.find(u => u.email === email);
    if (!user) return sendError(res, 401, 'USER_LOGIN_FAILED', 'User not found');
    if (user.password !== password) return sendError(res, 401, 'USER_LOGIN_FAILED', 'Invalid password');
    res.json({ message: 'Welcome back', user: { id: user.id, name: user.name, email: user.email } });
});

app.get('/api/users', (req, res) => {
    res.custom_event = 'USER_LIST';
    res.json(users.map(({password, ...u}) => u));
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    res.custom_event = 'USER_UPDATE';
    const user = users.find(u => u.id === id);
    if (!user) return sendError(res, 404, 'USER_UPDATE_FAILED', 'User not found');
    if (name) user.name = name;
    if (email) user.email = email;
    res.json({ id: user.id, name: user.name, email: user.email });
});

app.delete('/api/users/:id', (req, res) => {
    res.custom_event = 'USER_DELETE';
    const originalCount = users.length;
    users = users.filter(u => u.id !== req.params.id);
    if (users.length === originalCount) return sendError(res, 404, 'USER_DELETE_FAILED', 'User not found');
    res.status(204).send();
});

// Force 500 for demonstration
app.get('/api/force-500-error-sim', (req, res) => {
    res.custom_event = 'INTERNAL_SERVER_ERROR';
    throw new Error('Forced System Error');
});

// Final Handlers
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use((err, req, res, next) => {
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'A critical system error occurred');
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        event: 'SYSTEM_STARTUP',
        message: `Nexus Product API active on port ${PORT}`
    }));
});
