const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDatabase } = require('./db/database');
const settingsRoutes = require('./routes/settings.routes');
const logsRoutes = require('./routes/logs.routes');
const authRoutes = require('./routes/auth.routes');
const automationService = require('./services/automation.service');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/settings', settingsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        automation: automationService.isRunning() ? 'running' : 'stopped'
    });
});

// Serve static files from React build in production if they exist
const clientBuildPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientBuildPath)) {
    console.log('🌐 Serving frontend from:', clientBuildPath);
    app.use(express.static(clientBuildPath));

    // Catch-all route for React SPA
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(clientBuildPath, 'index.html'));
        }
    });
} else {
    console.log('ℹ️ Frontend build not found, skipping static file serving.');
    // Simple landing page for the backend URL
    app.get('/', (req, res) => {
        res.json({
            message: 'CRM Automation API is running.',
            status: 'online',
            documentation: 'https://github.com/Aflavio7/lemonade'
        });
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Initialize database and start server
async function startServer() {
    try {
        await initDatabase();

        const server = app.listen(PORT, () => {
            console.log(`🚀 Email Lead Capture server running on http://localhost:${PORT}`);
            console.log(`📊 API available at http://localhost:${PORT}/api`);

            // Initialize automation service
            try {
                automationService.initialize().catch(err => {
                    console.error('❌ Failed to initialize automation service during startup:', err);
                });
            } catch (err) {
                console.error('❌ Synchronous error during automation service initialization:', err);
            }
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use. Please close the other process and restart.`);
            } else {
                console.error('❌ Server startup error:', error);
            }
            process.exit(1);
        });

        // Handle unhandled rejections and exceptions
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        });

        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            process.exit(1);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
