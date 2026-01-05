const fs = require('fs');
const path = require('path');
const { LOGS_DIR } = require('../config/paths');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(LOGS_DIR, `engine_${timestamp}.log`);
const errorFile = path.join(LOGS_DIR, `error_${timestamp}.log`);

const logStream = fs.createWriteStream(logFile, { flags: 'a' });
const errorStream = fs.createWriteStream(errorFile, { flags: 'a' });

// Save original console methods
const originalLog = console.log;
const originalError = console.error;

function formatMessage(args) {
    return args.map(arg => {
        if (arg instanceof Error) {
            return arg.stack || arg.message;
        }
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg, null, 2);
            } catch (e) {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');
}

console.log = function(...args) {
    const msg = `[${new Date().toISOString()}] [INFO] ${formatMessage(args)}\n`;
    logStream.write(msg);
    originalLog.apply(console, args);
};

console.error = function(...args) {
    const msg = `[${new Date().toISOString()}] [ERROR] ${formatMessage(args)}\n`;
    errorStream.write(msg);
    logStream.write(msg); // Also write errors to the main log
    originalError.apply(console, args);
};

console.info = console.log;
console.warn = console.log;

module.exports = {
    logFile,
    errorFile
};
