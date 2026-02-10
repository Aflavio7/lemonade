const { settingsDB, logsDB } = require('../db/database');
const gmailService = require('./gmail.service');
const imapService = require('./imap.service');
const geminiService = require('./gemini.service');
const messagingService = require('./messaging.service');

class AutomationService {
    constructor() {
        this.intervalId = null;
        this.running = false;
        this.isProcessing = false;
        this.checkInterval = 60000; // Default 60 seconds
    }

    async initialize() {
        console.log('🤖 Automation service initializing...');

        // Check if automation should be running
        const enabled = this.isEnabled();
        if (enabled) {
            await this.start();
        } else {
            console.log('⏸️  Automation is disabled. Enable it from the dashboard.');
        }
    }

    isEnabled() {
        const value = settingsDB.get('automation_enabled');
        return value === 'true';
    }

    getCheckInterval() {
        const value = settingsDB.get('check_interval_seconds');
        return (parseInt(value) || 60) * 1000;
    }

    async start() {
        if (this.running) {
            console.log('⚠️  Automation is already running');
            return;
        }

        this.checkInterval = this.getCheckInterval();
        this.running = true;

        console.log(`▶️  Starting automation (checking every ${this.checkInterval / 1000}s)`);

        // Run immediately, then set interval
        this.runPipeline();
        this.intervalId = setInterval(() => this.runPipeline(), this.checkInterval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.running = false;
        console.log('⏹️  Automation stopped');
    }

    isRunning() {
        return this.running;
    }

    async runPipeline() {
        if (this.isProcessing) {
            console.log('⏳ Pipeline already in progress, skipping this cycle');
            return;
        }

        this.isProcessing = true;
        try {
            // Check if still enabled
            const enabled = this.isEnabled();
            if (!enabled) {
                this.stop();
                return;
            }

            const mailProvider = settingsDB.get('mail_provider') || 'gmail';
            console.log(`🔍 Checking for new emails via ${mailProvider}...`);

            let emails = [];
            let lastProcessedIdKey = '';

            if (mailProvider === 'gmail') {
                const gmailConnected = gmailService.isConnected();
                if (!gmailConnected) {
                    console.log('⚠️  Gmail not connected. Skipping this cycle.');
                    return;
                }
                lastProcessedIdKey = 'last_processed_email_id';
                const lastProcessedId = settingsDB.get(lastProcessedIdKey) || null;
                emails = await gmailService.getNewEmails(lastProcessedId);
            } else {
                const imapConnected = await imapService.isConnected();
                if (!imapConnected) {
                    console.log('⚠️  IMAP not configured. Skipping this cycle.');
                    return;
                }
                lastProcessedIdKey = 'last_processed_imap_uid';
                const lastProcessedUid = settingsDB.get(lastProcessedIdKey) || null;
                emails = await imapService.getNewEmails(lastProcessedUid);
            }

            if (emails.length === 0) {
                console.log('📭 No new emails found');
                return;
            }

            console.log(`📬 Found ${emails.length} new email(s)`);

            // Get booking URL
            const bookingUrl = settingsDB.get('booking_url') || 'https://calendly.com/your-link';

            // Process each email
            for (const email of emails) {
                // Check if already processed
                const existingLog = logsDB.getByEmailId(email.id);
                if (existingLog) {
                    console.log(`⏩ Email ${email.id} already processed, skipping.`);
                    continue;
                }

                await this.processEmail(email, bookingUrl);

                // Update last processed ID
                settingsDB.set(lastProcessedIdKey, email.id);

                // Mark as read in appropriate service
                if (mailProvider === 'gmail') {
                    await gmailService.markAsRead(email.id);
                } else {
                    await imapService.markAsRead(email.id);
                }
            }

        } catch (error) {
            const isAuthError = error.isAuthError || error.message.includes('AUTHENTICATIONFAILED') || error.message.includes('Authentication');
            const errorType = isAuthError ? 'Auth Error' : 'Pipeline Error';
            console.error(`❌ ${errorType}:`, error.message);

            // Log the error
            logsDB.create({
                emailFrom: 'SYSTEM',
                emailSubject: errorType,
                emailBody: error.message,
                detectedIntent: 'ERROR',
                intentDetails: error.stack || '',
                messageSent: '',
                sentTo: '',
                status: 'error'
            });
        } finally {
            this.isProcessing = false;
        }
    }

    async processEmail(email, bookingUrl) {
        console.log(`📧 Processing email from: ${email.from}`);

        let analysis = null;
        let messageSent = '';
        let sentTo = '';
        let status = 'processed';

        try {
            // Step 1: Analyze intent with Gemini
            analysis = await geminiService.analyzeIntent(email);
            console.log(`🧠 Intent: ${analysis.intent} (${analysis.confidence}% confidence)`);

            // Step 2: If valid lead, send WhatsApp message
            if (analysis.isValidLead && analysis.intent === 'LEAD') {
                // Check if we have a phone number
                const phoneNumber = email.phoneNumber;

                if (phoneNumber) {
                    // Generate personalized reply
                    const reply = await geminiService.generatePersonalizedReply(
                        email,
                        analysis,
                        bookingUrl
                    );

                    // Check if messaging is configured
                    const messagingConfigured = messagingService.isConfigured();

                    if (messagingConfigured) {
                        await messagingService.sendWhatsAppMessage(phoneNumber, reply);
                        messageSent = reply;
                        sentTo = phoneNumber;
                        status = 'sent';
                        console.log(`✅ WhatsApp sent to ${phoneNumber}`);
                    } else {
                        console.log('⚠️  Twilio not configured. Message not sent.');
                        messageSent = `[NOT SENT - Twilio not configured] ${reply}`;
                        status = 'pending_config';
                    }
                } else {
                    console.log('⚠️  No phone number found in email');
                    messageSent = '[No phone number found in email]';
                    status = 'no_phone';
                }
            } else {
                console.log(`ℹ️  Not a lead (${analysis.intent}). No action taken.`);
                status = 'skipped';
            }

        } catch (error) {
            console.error(`❌ Error processing email: ${error.message}`);
            status = 'error';
        }

        // Log the result
        logsDB.create({
            emailId: email.id,
            emailFrom: email.from,
            emailSubject: email.subject,
            emailBody: email.body.substring(0, 500),
            detectedIntent: analysis?.intent || 'UNKNOWN',
            intentDetails: JSON.stringify(analysis || {}),
            messageSent: messageSent,
            sentTo: sentTo,
            status: status
        });
    }
}

module.exports = new AutomationService();
