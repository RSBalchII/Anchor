require('./core/logger');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { db, init } = require('./core/db');
const apiRoutes = require('./routes/api');
const { setupFileWatcher } = require('./services/watcher');
const config = require('./config/paths');

const PORT = process.env.PORT || 3000;

// Setup Express
const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from interface directory
app.use(express.static(config.INTERFACE_DIR));

// Mount Routes
app.use('/v1', apiRoutes);

// GET /health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'Sovereign',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Start System
async function boot() {
    try {
        console.log('Starting Sovereign Context Engine...');
        console.log(`Mode: ${config.IS_PKG ? 'Production (PKG)' : 'Development'}`);
        console.log(`Base Path: ${config.BASE_PATH}`);
        console.log(`Interface Dir: ${config.INTERFACE_DIR}`);
        console.log(`Database Path: ${config.DB_PATH}`);
        
        await init(); // Initialize DB and Auto-Hydrate
        setupFileWatcher(); // Start Watcher
        
        app.listen(PORT, () => {
            console.log(`Sovereign Context Engine listening on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`Interface: http://localhost:${PORT}`);
        });
    } catch (e) {
        console.error("Fatal startup error:", e);
        process.exit(1);
    }
}

// Handle graceful shutdown
const shutdown = async (signal) => {
  console.log(`Shutting down gracefully... (Signal: ${signal})`);
  try {
    await db.close();
  } catch (e) {
    console.error('Error closing database:', e);
  }
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
});

boot();

module.exports = { app };
