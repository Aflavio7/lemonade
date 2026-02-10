const { GoogleGenerativeAI } = require('@google/generative-ai');
const { settingsDB } = require('../db/database');

class GeminiService {
    constructor() {
        this.genAI = null;
        this.model = null;
    }

    async initialize() {
        const apiKey = settingsDB.get('gemini_api_key');

        if (!apiKey) {
            throw new Error('Gemini API key not configured');
        }

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }

    async analyzeIntent(email) {
        if (!this.model) {
            await this.initialize();
        }

        const prompt = `Analyze the following email and categorize the sender's intent. 
Return a JSON response with the following structure:
{
  "intent": "LEAD" | "INQUIRY" | "SUPPORT" | "SPAM" | "OTHER",
  "confidence": 0-100,
  "summary": "Brief description of what the sender wants",
  "senderName": "Extracted name of the sender",
  "isValidLead": true/false,
  "suggestedResponse": "A brief personalized response acknowledgment"
}

LEAD: Someone interested in purchasing a service/product or scheduling a consultation
INQUIRY: General questions about services or information requests
SUPPORT: Existing customer needing help or having issues
SPAM: Promotional emails, newsletters, or irrelevant content
OTHER: Anything that doesn't fit the above categories

Email Details:
From: ${email.from}
Subject: ${email.subject}
Body:
${email.body}

Respond ONLY with the JSON object, no additional text.`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse the JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Invalid JSON response from Gemini');
            }

            const analysis = JSON.parse(jsonMatch[0]);
            return analysis;
        } catch (error) {
            console.error('❌ Gemini analysis error:', error.message);
            return {
                intent: 'OTHER',
                confidence: 0,
                summary: 'Unable to analyze email',
                senderName: 'Unknown',
                isValidLead: false,
                suggestedResponse: ''
            };
        }
    }

    async generatePersonalizedReply(email, analysis, bookingUrl) {
        if (!this.model) {
            await this.initialize();
        }

        const prompt = `Generate a friendly, professional WhatsApp message to respond to a potential lead.

Context:
- Sender's name: ${analysis.senderName}
- Their inquiry: ${analysis.summary}
- Original email subject: ${email.subject}

Requirements:
1. Keep it conversational and warm (WhatsApp style)
2. Acknowledge their specific inquiry
3. Include this booking link naturally: ${bookingUrl}
4. Keep it under 300 characters
5. Don't use formal email signatures

Generate ONLY the message text, no quotes or formatting.`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            console.error('❌ Gemini reply generation error:', error.message);
            // Fallback template
            return `Hi ${analysis.senderName || 'there'}! Thanks for reaching out. I'd love to discuss how we can help. Book a quick call here: ${bookingUrl}`;
        }
    }
}

module.exports = new GeminiService();
