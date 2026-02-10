const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/antigravity.db');

let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();

    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Create tables
    db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      email_id TEXT UNIQUE,
      email_from TEXT NOT NULL,
      email_subject TEXT NOT NULL,
      email_body TEXT DEFAULT '',
      detected_intent TEXT NOT NULL,
      intent_details TEXT DEFAULT '',
      message_sent TEXT DEFAULT '',
      sent_to TEXT DEFAULT '',
      status TEXT DEFAULT 'success',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Migration: Add email_id column if it doesn't exist
    try {
        const tableInfo = db.exec("PRAGMA table_info(logs)");
        const hasEmailId = tableInfo[0].values.some(col => col[1] === 'email_id');

        if (!hasEmailId) {
            db.run('ALTER TABLE logs ADD COLUMN email_id TEXT');
            db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_email_id ON logs(email_id)');
            console.log('✅ Successfully added email_id column and index to logs table');
        }
    } catch (e) {
        console.error('❌ Migration error:', e.message);
    }

    // Seed default settings
    const defaultSettings = [
        { key: 'mail_provider', value: 'gmail' }, // 'gmail' or 'custom'
        { key: 'gemini_api_key', value: '' },
        { key: 'gmail_access_token', value: '' },
        { key: 'gmail_refresh_token', value: '' },
        { key: 'gmail_token_expiry', value: '' },
        { key: 'gmail_connected', value: 'false' },
        { key: 'gmail_email', value: '' },
        { key: 'imap_host', value: '' },
        { key: 'imap_port', value: '993' },
        { key: 'imap_user', value: '' },
        { key: 'imap_pass', value: '' },
        { key: 'imap_secure', value: 'true' },
        { key: 'smtp_host', value: '' },
        { key: 'smtp_port', value: '465' },
        { key: 'smtp_user', value: '' },
        { key: 'smtp_pass', value: '' },
        { key: 'smtp_secure', value: 'true' },
        { key: 'twilio_account_sid', value: '' },
        { key: 'twilio_auth_token', value: '' },
        { key: 'whatsapp_phone_number', value: '' },
        { key: 'booking_url', value: 'https://calendly.com/your-link' },
        { key: 'automation_enabled', value: 'false' },
        { key: 'check_interval_seconds', value: '60' },
        { key: 'last_processed_email_id', value: '' },
        { key: 'last_processed_imap_uid', value: '' },
    ];

    for (const setting of defaultSettings) {
        const exists = db.exec(`SELECT 1 FROM settings WHERE key = '${setting.key}'`);
        if (exists.length === 0) {
            db.run(`INSERT INTO settings (id, key, value) VALUES ('${generateUUID()}', '${setting.key}', '${setting.value}')`);
        }
    }

    saveDatabase();
    console.log('✅ SQLite database initialized');
    return db;
}

function saveDatabase() {
    if (db) {
        try {
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(DB_PATH, buffer);
        } catch (error) {
            console.error('❌ Failed to save database to disk:', error);
        }
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

// Settings operations
const settingsDB = {
    getAll: () => {
        const result = db.exec('SELECT key, value FROM settings');
        if (result.length === 0) return {};
        const settings = {};
        result[0].values.forEach(([key, value]) => {
            settings[key] = value;
        });
        return settings;
    },

    get: (key) => {
        const result = db.exec(`SELECT value FROM settings WHERE key = '${key}'`);
        return result.length > 0 ? result[0].values[0][0] : null;
    },

    set: (key, value) => {
        const exists = db.exec(`SELECT 1 FROM settings WHERE key = '${key}'`);
        if (exists.length > 0) {
            db.run(`UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`, [String(value), key]);
        } else {
            db.run(`INSERT INTO settings (id, key, value) VALUES (?, ?, ?)`, [generateUUID(), key, String(value)]);
        }
        saveDatabase();
    },

    setMany: (settings) => {
        for (const [key, value] of Object.entries(settings)) {
            settingsDB.set(key, value);
        }
    }
};

// Logs operations
const logsDB = {
    create: (log) => {
        const id = generateUUID();
        db.run(`
      INSERT INTO logs (id, email_id, email_from, email_subject, email_body, detected_intent, intent_details, message_sent, sent_to, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, log.emailId || null, log.emailFrom, log.emailSubject, log.emailBody || '', log.detectedIntent, log.intentDetails || '', log.messageSent || '', log.sentTo || '', log.status || 'success']);
        saveDatabase();
        return id;
    },

    getAll: (page = 1, limit = 20) => {
        const offset = (page - 1) * limit;
        const countResult = db.exec('SELECT COUNT(*) FROM logs');
        const total = countResult[0]?.values[0][0] || 0;

        const result = db.exec(`SELECT * FROM logs ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`);
        const logs = [];

        if (result.length > 0) {
            const columns = result[0].columns;
            result[0].values.forEach(row => {
                const log = {};
                columns.forEach((col, i) => {
                    // Convert snake_case to camelCase
                    const key = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    log[key] = row[i];
                });
                logs.push(log);
            });
        }

        return { logs, total, totalPages: Math.ceil(total / limit) };
    },

    getById: (id) => {
        const result = db.exec(`SELECT * FROM logs WHERE id = '${id}'`);
        if (result.length === 0) return null;
        const columns = result[0].columns;
        const row = result[0].values[0];
        const log = {};
        columns.forEach((col, i) => {
            const key = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            log[key] = row[i];
        });
        return log;
    },

    getByEmailId: (emailId) => {
        const result = db.exec(`SELECT * FROM logs WHERE email_id = '${emailId}'`);
        if (result.length === 0) return null;
        const columns = result[0].columns;
        const row = result[0].values[0];
        const log = {};
        columns.forEach((col, i) => {
            const key = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            log[key] = row[i];
        });
        return log;
    },

    getStats: () => {
        const totalResult = db.exec('SELECT COUNT(*) FROM logs');
        const total = totalResult[0]?.values[0][0] || 0;

        const last24h = db.exec(`SELECT COUNT(*) FROM logs WHERE created_at > datetime('now', '-1 day')`);
        const last24Hours = last24h[0]?.values[0][0] || 0;

        const byIntentResult = db.exec('SELECT detected_intent, COUNT(*) as count FROM logs GROUP BY detected_intent');
        const byIntent = {};
        if (byIntentResult.length > 0) {
            byIntentResult[0].values.forEach(([intent, count]) => {
                byIntent[intent] = count;
            });
        }

        return { total, last24Hours, byIntent };
    },

    clear: () => {
        db.run('DELETE FROM logs');
        saveDatabase();
    }
};

module.exports = {
    initDatabase,
    getDatabase,
    saveDatabase,
    settingsDB,
    logsDB,
    generateUUID
};
