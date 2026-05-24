const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('./logger');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// In-memory database
let users = [];

// --- Observability Middleware ---
app.use((req, res, next) => {
    // 1. Generate unique Request ID
    req.request_id = uuidv4().split('-')[0]; // Short ID for readability
    const start = Date.now();

    // 2. Capture response finish
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Skip logging for static assets unless they fail
        if (res.statusCode < 400 && (req.path.includes('.') || req.path === '/')) {
            return;
        }

        // Default events for generic routes
        if (!res.custom_event) {
            if (res.statusCode === 404) res.custom_event = 'ROUTE_NOT_FOUND';
            else if (res.statusCode >= 500) res.custom_event = 'INTERNAL_SERVER_ERROR';
            else res.custom_event = 'API_REQUEST';
        }

        const logType = res.statusCode >= 500 ? 'error' : (res.statusCode >= 400 ? 'warn' : 'info');
        
        logger[logType](res.custom_event, req, res, {
            duration,
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

// --- API Routes (The Product) ---

// Register
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;
    res.custom_event = 'USER_REGISTER';

    if (!name || !email || !password) {
        return sendError(res, 400, 'USER_REGISTER_FAILED', 'All fields are required');
    }
    
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return sendError(res, 400, 'USER_REGISTER_FAILED', 'Email already registered');
    }

    const newUser = { 
        id: uuidv4(), 
        name, 
        email, 
        password,
        createdAt: new Date().toISOString()
    };
    users.push(newUser);
    
    res.status(201).json({ id: newUser.id, name: newUser.name });
});

// Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    res.custom_event = 'USER_LOGIN';

    const user = users.find(u => u.email === email);
    if (!user) {
        return sendError(res, 401, 'USER_LOGIN_FAILED', 'User not found');
    }

    if (user.password !== password) {
        return sendError(res, 401, 'USER_LOGIN_FAILED', 'Invalid password');
    }

    res.json({ message: 'Welcome back', user: { id: user.id, name: user.name, email: user.email } });
});

// List Users (Team/Directory)
app.get('/api/users', (req, res) => {
    res.custom_event = 'USER_LIST';
    res.json(users.map(({password, ...u}) => u));
});

// Update User
app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { name, email } = req.body;
    res.custom_event = 'USER_UPDATE';

    const user = users.find(u => u.id === id);
    if (!user) {
        return sendError(res, 404, 'USER_UPDATE_FAILED', 'User not found');
    }
    
    if (name) user.name = name;
    if (email) user.email = email;
    
    res.json({ id: user.id, name: user.name, email: user.email });
});

// Delete User
app.delete('/api/users/:id', (req, res) => {
    res.custom_event = 'USER_DELETE';
    const originalCount = users.length;
    users = users.filter(u => u.id !== req.params.id);
    
    if (users.length === originalCount) {
        return sendError(res, 404, 'USER_DELETE_FAILED', 'User not found');
    }
    res.status(204).send();
});

// --- Final Handlers ---

// Serve frontend for any non-API route
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler (Catch 500s)
app.use((err, req, res, next) => {
    console.error(err.stack); // Still print stack for local debugging
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'A critical system error occurred');
});

const PORT = 3000;
app.listen(PORT, () => {
    const startMsg = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        event: 'SYSTEM_STARTUP',
        message: `Nexus Product API active on port ${PORT}`
    };
    console.log(JSON.stringify(startMsg));
});
