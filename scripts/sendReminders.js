// === REMINDER CONFIGURATION ===
// Change this hour if needed
// 11:30 UTC = 5:00 PM IST
const REMINDER_CRON_HOUR_UTC = 11;
const REMINDER_CRON_MINUTE_UTC = 30;
const DRY_RUN = true;

/**
 * sendReminders.js
 * 
 * Fetches appointments scheduled for tomorrow that have 'send_reminder' set to true
 * and logs (or sends) WhatsApp reminders.
 * 
 * Required Environment Variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service_role key (BYPASSES RLS)
 */

async function sendReminders() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
        process.exit(1);
    }

    // Calculate "Tomorrow" date string (YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`--- Reminder Sync: ${new Date().toISOString()} ---`);
    console.log(`Checking appointments for: ${tomorrowStr}`);

    try {
        const queryUrl = `${supabaseUrl}/rest/v1/appointments?date=eq.${tomorrowStr}&send_reminder=eq.true`;

        const response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Supabase query failed: ${error}`);
        }

        const appointments = await response.json();

        if (appointments.length === 0) {
            console.log('No reminders to send for tomorrow.');
            return;
        }

        console.log(`Found ${appointments.length} reminder(s) to process.`);

        for (const appt of appointments) {
            const timeClean = (appt.time || 'HH:MM').substring(0, 5);
            const logMsg = `Reminder to be sent to ${appt.phone || 'UNKNOWN'} at ${timeClean} (for client: ${appt.client_name})`;

            if (DRY_RUN) {
                console.log(`[DRY RUN] ${logMsg}`);
            } else {
                // TODO: Implement Twilio / WhatsApp API logic here
                console.log(`[SENDING] ${logMsg}`);

                // Placeholder for Twilio integration:
                // await twilioClient.messages.create({
                //     from: 'whatsapp:+14155238886', 
                //     to: `whatsapp:${appt.phone}`,
                //     body: `Hi ${appt.client_name}, this is a reminder for your session tomorrow at ${timeClean}.`
                // });
            }
        }

        console.log('Reminder processing complete.');

    } catch (err) {
        console.error('An error occurred during reminder processing:', err.message);
        process.exit(1);
    }
}

// Execute the script
sendReminders();
