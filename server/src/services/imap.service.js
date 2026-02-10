const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { settingsDB } = require('../db/database');

class ImapService {
    constructor() {
        this.client = null;
        this.config = null;
    }

    async initialize() {
        const host = settingsDB.get('imap_host');
        const port = parseInt(settingsDB.get('imap_port')) || 993;
        const user = settingsDB.get('imap_user');
        const pass = settingsDB.get('imap_pass');
        const secure = settingsDB.get('imap_secure') === 'true';

        if (!host || !user || !pass) {
            this.config = null;
            return;
        }

        this.config = {
            host,
            port,
            secure,
            auth: {
                user,
                pass
            },
            logger: false
        };
    }

    async getNewEmails(lastProcessedUid = null) {
        await this.initialize();
        if (!this.config) {
            console.log('⚠️ IMAP configuration missing. Skipping IMAP fetch.');
            return [];
        }

        const client = new ImapFlow(this.config);
        const emails = [];

        try {
            await client.connect();

            // Check if mailbox exists before locking
            const mailboxes = await client.list();
            const inboxExists = mailboxes.some(m => m.path.toUpperCase() === 'INBOX');

            if (!inboxExists) {
                console.error('❌ INBOX not found on IMAP server');
                await client.logout();
                return [];
            }

            const lock = await client.getMailboxLock('INBOX');

            try {
                // 1. Search for matching unread emails first
                // Using a range for UIDs to find anything newer than lastProcessedUid
                const query = lastProcessedUid && !isNaN(parseInt(lastProcessedUid))
                    ? { uid: `${parseInt(lastProcessedUid) + 1}:*`, seen: false }
                    : { seen: false };

                const searchResult = await client.search(query);

                if (searchResult && searchResult.length > 0) {
                    console.log(`📂 Found ${searchResult.length} matching unread UID(s)`);

                    // 2. Fetch the content for the found UIDs
                    // Imapflow fetch() returns an async generator for the specified sequence set
                    for await (let message of client.fetch(searchResult, {
                        source: true,
                        uid: true
                    })) {
                        try {
                            const parsed = await simpleParser(message.source);

                            // Extract phone number from body
                            const body = parsed.text || '';
                            const phoneMatch = body.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);

                            emails.push({
                                id: String(message.uid),
                                from: parsed.from?.text || 'Unknown',
                                subject: parsed.subject || 'No Subject',
                                date: parsed.date,
                                body: body.substring(0, 2000),
                                phoneNumber: phoneMatch ? phoneMatch[0].replace(/\D/g, '') : null
                            });
                        } catch (err) {
                            console.error(`❌ Error parsing IMAP message ${message.uid}:`, err.message);
                        }
                    }
                } else {
                    console.log('📭 No new matching unread emails found during IMAP search');
                }
            } finally {
                lock.release();
            }

            await client.logout();
        } catch (error) {
            const formattedError = this._formatError(error, this.config);
            console.error('❌ IMAP Connection error during fetch:', formattedError.message);

            try {
                if (client && client.usable) await client.logout();
            } catch (e) {
                // Ignore logout errors
            }

            throw formattedError;
        }

        return emails;
    }

    async markAsRead(uid) {
        if (!this.config) await this.initialize();
        if (!this.config) return;

        const client = new ImapFlow(this.config);
        try {
            await client.connect();
            const lock = await client.getMailboxLock('INBOX');
            try {
                await client.messageFlagsAdd({ uid: true }, [uid], ['\\Seen']);
            } finally {
                lock.release();
            }
            await client.logout();
        } catch (error) {
            console.error(`❌ Error marking IMAP ${uid} as read:`, error.message);
            try {
                if (client && client.usable) await client.logout();
            } catch (e) {
                // Ignore logout errors
            }
        }
    }

    async testConnection(config) {
        const client = new ImapFlow({
            host: config.host,
            port: parseInt(config.port) || 993,
            secure: config.secure === 'true' || config.secure === true,
            auth: {
                user: config.user,
                pass: config.pass
            },
            logger: false,
            connectTimeout: 15000,
            greetingTimeout: 15000,
            tls: {
                rejectUnauthorized: false
            }
        });

        try {
            await client.connect();
            await client.logout();
            return { success: true, message: 'Connected successfully' };
        } catch (error) {
            console.error('❌ IMAP Test Connection error:', error);
            throw this._formatError(error, config);
        }
    }

    _formatError(error, config) {
        let message = error.message;
        const responseText = error.response || '';
        const combinedText = (message + ' ' + responseText).toUpperCase();

        if (combinedText.includes('ECONNREFUSED')) {
            message = `Failed to connect to ${config.host}:${config.port}. Please check if the host and port are correct and the server is reachable.`;
        } else if (combinedText.includes('ETIMEDOUT')) {
            message = `Connection to ${config.host} timed out. The server might be blocking the connection or the port might be wrong.`;
        } else if (combinedText.includes('AUTHENTICATIONFAILED') || combinedText.includes('APPLICATION-SPECIFIC PASSWORD')) {
            message = 'Authentication failed. Please check your username and password. If using Gmail, ensure you use an App Password (16 characters) instead of your regular password.';
        } else if (combinedText.includes('ENOTFOUND')) {
            message = `Host ${config.host} not found. Please check the hostname.`;
        } else if (combinedText.includes('self signed certificate')) {
            message = 'The server is using a self-signed certificate. Please ensure the server is trusted.';
        }

        const newError = new Error(message);
        newError.originalError = error;
        newError.isAuthError = combinedText.includes('AUTHENTICATIONFAILED') || combinedText.includes('APPLICATION-SPECIFIC PASSWORD');
        return newError;
    }

    async isConnected() {
        const host = settingsDB.get('imap_host');
        const user = settingsDB.get('imap_user');
        const pass = settingsDB.get('imap_pass');
        return !!(host && user && pass);
    }
}

module.exports = new ImapService();
