const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultSettings = [
  { key: 'gemini_api_key', value: '' },
  { key: 'gmail_access_token', value: '' },
  { key: 'gmail_refresh_token', value: '' },
  { key: 'gmail_token_expiry', value: '' },
  { key: 'gmail_connected', value: 'false' },
  { key: 'gmail_email', value: '' },
  { key: 'twilio_account_sid', value: '' },
  { key: 'twilio_auth_token', value: '' },
  { key: 'whatsapp_phone_number', value: '' },
  { key: 'booking_url', value: 'https://calendly.com/your-link' },
  { key: 'automation_enabled', value: 'false' },
  { key: 'check_interval_seconds', value: '60' },
  { key: 'last_processed_email_id', value: '' },
];

async function main() {
  console.log('🌱 Seeding database...');

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
