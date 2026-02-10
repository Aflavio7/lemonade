const express = require('express');
const router = express.Router();
const { logsDB } = require('../db/database');

// GET all logs with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const { logs, total, totalPages } = logsDB.getAll(page, limit);

        res.json({
            logs,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// GET logs statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = logsDB.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET single log by id
router.get('/:id', async (req, res) => {
    try {
        const log = logsDB.getById(req.params.id);

        if (!log) {
            return res.status(404).json({ error: 'Log not found' });
        }

        res.json(log);
    } catch (error) {
        console.error('Error fetching log:', error);
        res.status(500).json({ error: 'Failed to fetch log' });
    }
});

// DELETE clear all logs
router.delete('/clear', async (req, res) => {
    try {
        logsDB.clear();
        res.json({ message: 'All logs cleared successfully' });
    } catch (error) {
        console.error('Error clearing logs:', error);
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

module.exports = router;
