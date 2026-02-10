const { initDatabase, logsDB, settingsDB, saveDatabase } = require('./src/db/database');

async function cleanup() {
    const db = await initDatabase();

    // Delete the log entry for UID 251
    db.run('DELETE FROM logs WHERE email_id = ?', ['251']);
    console.log('✅ Deleted log 251');

    // Reset the setting
    settingsDB.set('last_processed_imap_uid', '250');
    console.log('✅ Reset UID to 250');

    saveDatabase();
    console.log('✅ Database saved');
}

cleanup().catch(console.error);
