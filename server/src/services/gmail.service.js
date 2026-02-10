const { google } = require('googleapis');
const { settingsDB } = require('../db/database');

class GmailService {
    constructor() {
        this.oauth2Client = null;
    }

    async initialize() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        // Load tokens from database
        const tokens = this.getStoredTokens();
        if (tokens.access_token) {
            this.oauth2Client.setCredentials(tokens);
        }

        // Set up token refresh handler
        this.oauth2Client.on('tokens', (tokens) => {
            console.log('🔄 Refreshing Gmail tokens...');
            this.storeTokens(tokens);
        });
    }

    getStoredTokens() {
        return {
            access_token: settingsDB.get('gmail_access_token') || null,
            refresh_token: settingsDB.get('gmail_refresh_token') || null,
            expiry_date: parseInt(settingsDB.get('gmail_token_expiry')) || null
        };
    }

    storeTokens(tokens) {
        if (tokens.access_token) {
            settingsDB.set('gmail_access_token', tokens.access_token);
        }
        if (tokens.refresh_token) {
            settingsDB.set('gmail_refresh_token', tokens.refresh_token);
        }
        if (tokens.expiry_date) {
            settingsDB.set('gmail_token_expiry', String(tokens.expiry_date));
        }
    }

    isConnected() {
        const value = settingsDB.get('gmail_connected');
        return value === 'true';
    }

    async getNewEmails(lastProcessedId = null) {
        if (!this.oauth2Client) {
            await this.initialize();
        }

        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        try {
            // Get list of unread messages
            const response = await gmail.users.messages.list({
                userId: 'me',
                q: 'is:unread in:inbox',
                maxResults: 10
            });

            const messages = response.data.messages || [];
            const emails = [];

            for (const message of messages) {
                const emailData = await gmail.users.messages.get({
                    userId: 'me',
                    id: message.id,
                    format: 'full'
                });

                const email = this.parseEmail(emailData.data);
                email.id = message.id;
                emails.push(email);
            }

            return emails;
        } catch (error) {
            console.error('❌ Gmail API error:', error.message);
            throw error;
        }
    }

    parseEmail(emailData) {
        const headers = emailData.payload.headers;

        const getHeader = (name) => {
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : '';
        };

        let body = '';

        // Extract body from parts
        const extractBody = (part) => {
            if (part.mimeType === 'text/plain' && part.body.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
            if (part.parts) {
                for (const subPart of part.parts) {
                    const result = extractBody(subPart);
                    if (result) return result;
                }
            }
            return '';
        };

        if (emailData.payload.body.data) {
            body = Buffer.from(emailData.payload.body.data, 'base64').toString('utf-8');
        } else if (emailData.payload.parts) {
            body = extractBody(emailData.payload);
        }

        // Extract sender's phone number from the email body if present
        const phoneMatch = body.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);

        return {
            from: getHeader('From'),
            subject: getHeader('Subject'),
            date: getHeader('Date'),
            body: body.substring(0, 2000), // Limit body size
            phoneNumber: phoneMatch ? phoneMatch[0].replace(/\D/g, '') : null
        };
    }

    async markAsRead(messageId) {
        if (!this.oauth2Client) {
            await this.initialize();
        }

        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        await gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
                removeLabelIds: ['UNREAD']
            }
        });
    }
}

module.exports = new GmailService();
