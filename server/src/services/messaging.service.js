const twilio = require('twilio');
const { settingsDB } = require('../db/database');

class MessagingService {
    constructor() {
        this.client = null;
        this.fromNumber = null;
    }

    initialize() {
        const accountSid = settingsDB.get('twilio_account_sid');
        const authToken = settingsDB.get('twilio_auth_token');
        const whatsappNumber = settingsDB.get('whatsapp_phone_number');

        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not configured');
        }

        this.client = twilio(accountSid, authToken);
        this.fromNumber = whatsappNumber || '';
    }

    async sendWhatsAppMessage(to, message) {
        if (!this.client) {
            this.initialize();
        }

        if (!this.fromNumber) {
            throw new Error('WhatsApp phone number not configured');
        }

        // Format phone numbers for WhatsApp
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:+${to.replace(/\D/g, '')}`;
        const formattedFrom = this.fromNumber.startsWith('whatsapp:')
            ? this.fromNumber
            : `whatsapp:+${this.fromNumber.replace(/\D/g, '')}`;

        try {
            const result = await this.client.messages.create({
                body: message,
                from: formattedFrom,
                to: formattedTo
            });

            console.log(`✅ WhatsApp message sent: ${result.sid}`);
            return {
                success: true,
                messageId: result.sid,
                status: result.status
            };
        } catch (error) {
            console.error('❌ WhatsApp send error:', error.message);
            throw error;
        }
    }

    async sendSMS(to, message) {
        if (!this.client) {
            this.initialize();
        }

        // Get the SMS-enabled number (might be different from WhatsApp)
        const smsNumber = this.fromNumber.replace('whatsapp:', '');

        try {
            const result = await this.client.messages.create({
                body: message,
                from: smsNumber.startsWith('+') ? smsNumber : `+${smsNumber}`,
                to: to.startsWith('+') ? to : `+${to}`
            });

            console.log(`✅ SMS sent: ${result.sid}`);
            return {
                success: true,
                messageId: result.sid,
                status: result.status
            };
        } catch (error) {
            console.error('❌ SMS send error:', error.message);
            throw error;
        }
    }

    // Check if Twilio is properly configured
    isConfigured() {
        const accountSid = settingsDB.get('twilio_account_sid');
        const authToken = settingsDB.get('twilio_auth_token');
        const whatsappNumber = settingsDB.get('whatsapp_phone_number');

        return !!(accountSid && authToken && whatsappNumber);
    }
}

module.exports = new MessagingService();
