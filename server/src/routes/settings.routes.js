const express = require('express');
const router = express.Router();
const { settingsDB } = require('../db/database');

// GET all settings
router.get('/', async (req, res) => {
    try {
        const settings = settingsDB.getAll();
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// GET single setting by key
router.get('/:key', async (req, res) => {
    try {
        const value = settingsDB.get(req.params.key);

        if (value === null) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        res.json({ key: req.params.key, value });
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

// PUT update multiple settings
router.put('/', async (req, res) => {
    try {
        const updates = req.body;
        settingsDB.setMany(updates);

        res.json({
            message: 'Settings updated successfully',
            updated: Object.keys(updates).length
        });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// PUT update single setting
router.put('/:key', async (req, res) => {
    try {
        const { value } = req.body;
        settingsDB.set(req.params.key, value);

        res.json({ key: req.params.key, value: String(value) });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

const imapService = require('../services/imap.service');

// POST test IMAP connection
router.post('/test-imap', async (req, res) => {
    try {
        const config = req.body;
        const result = await imapService.testConnection({
            host: config.imap_host,
            port: config.imap_port,
            user: config.imap_user,
            pass: config.imap_pass,
            secure: config.imap_secure
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: 'Connection failed',
            details: error.message
        });
    }
});

module.exports = router;
