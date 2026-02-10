const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { settingsDB } = require('../db/database');

// OAuth2 scopes for Gmail
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email'
];

// Create OAuth2 client
function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

// GET initiate OAuth flow
router.get('/google', (req, res) => {
    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    res.json({ authUrl });
});

// GET OAuth callback
router.get('/google/callback', async (req, res) => {
    const { code, error } = req.query;

    if (error) {
        console.error('OAuth error:', error);
        return res.redirect('http://localhost:5173/configuration?error=oauth_denied');
    }

    if (!code) {
        return res.redirect('http://localhost:5173/configuration?error=no_code');
    }

    try {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);

        // Get user email
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data: userInfo } = await oauth2.userinfo.get();

        // Store tokens in database
        settingsDB.set('gmail_access_token', tokens.access_token || '');
        settingsDB.set('gmail_refresh_token', tokens.refresh_token || '');
        settingsDB.set('gmail_token_expiry', String(tokens.expiry_date || ''));
        settingsDB.set('gmail_connected', 'true');
        settingsDB.set('gmail_email', userInfo.email || '');

        console.log('✅ Gmail connected successfully:', userInfo.email);

        // Redirect back to frontend
        res.redirect('http://localhost:5173/configuration?success=gmail_connected');
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('http://localhost:5173/configuration?error=oauth_failed');
    }
});

// GET connection status
router.get('/status', async (req, res) => {
    try {
        const gmailConnected = settingsDB.get('gmail_connected');
        const gmailEmail = settingsDB.get('gmail_email');
        const accessToken = settingsDB.get('gmail_access_token');

        const isConnected = gmailConnected === 'true' && accessToken;

        res.json({
            connected: !!isConnected,
            email: gmailEmail || null
        });
    } catch (error) {
        console.error('Error checking auth status:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

// POST disconnect Gmail
router.post('/disconnect', async (req, res) => {
    try {
        settingsDB.set('gmail_access_token', '');
        settingsDB.set('gmail_refresh_token', '');
        settingsDB.set('gmail_connected', 'false');
        settingsDB.set('gmail_email', '');

        res.json({ message: 'Gmail disconnected successfully' });
    } catch (error) {
        console.error('Error disconnecting Gmail:', error);
        res.status(500).json({ error: 'Failed to disconnect' });
    }
});

module.exports = router;
