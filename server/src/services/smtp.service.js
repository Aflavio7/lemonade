const nodemailer = require('nodemailer');
const { settingsDB } = require('../db/database');

class SmtpService {
    constructor() {
        this.transporter = null;
    }

    async initialize() {
        const host = settingsDB.get('smtp_host');
        const port = parseInt(settingsDB.get('smtp_port')) || 465;
        const user = settingsDB.get('smtp_user');
        const pass = settingsDB.get('smtp_pass');
        const secure = settingsDB.get('smtp_secure') === 'true';

        if (!host || !user || !pass) {
            this.transporter = null;
            return;
        }

        this.transporter = nodemailer.createTransport({
            host,
            port,
            secure,
            auth: {
                user,
                pass
            }
        });
    }

    async sendEmail(to, subject, text, html) {
        if (!this.transporter) await this.initialize();
        if (!this.transporter) throw new Error('SMTP not configured');

        const from = settingsDB.get('smtp_user');

        const info = await this.transporter.sendMail({
            from,
            to,
            subject,
            text,
            html
        });

        console.log(`✅ SMTP email sent: ${info.messageId}`);
        return info;
    }

    async verify() {
        await this.initialize();
        if (!this.transporter) return false;
        try {
            await this.transporter.verify();
            return true;
        } catch (error) {
            console.error('❌ SMTP Verification failed:', error.message);
            return false;
        }
    }
}

module.exports = new SmtpService();
