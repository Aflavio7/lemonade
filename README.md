# Email Lead Capture Automation Platform

A complete email-to-WhatsApp lead conversion automation platform with AI-powered intent analysis.

## Features

- **Gmail Monitoring**: Automatically checks connected Gmail for new emails
- **AI Analysis**: Uses Gemini AI to analyze email intent (LEAD, INQUIRY, SUPPORT, SPAM)
- **WhatsApp Replies**: Sends personalized WhatsApp messages to qualified leads via Twilio
- **Admin Dashboard**: No-code configuration interface to manage everything
- **Booking Integration**: Automatically includes your booking link in responses

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Database**: SQLite with Prisma ORM
- **AI**: Google Gemini API
- **Messaging**: Twilio WhatsApp API

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start development servers
npm run dev
```

> [!NOTE]  
> The database initializes and seeds automatically on first run. No manual setup is required.

## URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Configuration

### Required API Keys

1. **Google OAuth 2.0**: Configure in `.env` file
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`

2. **Via Dashboard** (http://localhost:5173/configuration):
   - Gemini API Key
   - Twilio Account SID & Auth Token
   - WhatsApp Phone Number
   - Booking URL

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`

## Project Structure

```
email-lead-capture/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   └── index.css       # Global styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.js         # Database seeder
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── index.js        # Server entry
│   └── package.json
└── package.json            # Root package
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET | Get all settings |
| `/api/settings` | PUT | Update settings |
| `/api/logs` | GET | Get activity logs |
| `/api/auth/google` | GET | Initiate OAuth |
| `/api/auth/status` | GET | Check Gmail connection |
| `/api/health` | GET | Health check |

## License

MIT
