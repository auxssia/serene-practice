// === REMINDER CONFIGURATION ===
// SET DRY_RUN = false TO ENABLE REAL SENDING
const REMINDER_CRON_HOUR_UTC = 11;
const REMINDER_CRON_MINUTE_UTC = 30;
const DRY_RUN = false;

/**
 * sendReminders.js
 * 
 * Fetches appointments scheduled for tomorrow that have 'send_reminder' set to true
 * and sends WhatsApp reminders using Twilio.
 * 
 * Required Environment Variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service_role key (BYPASSES RLS)
 * - TWILIO_ACCOUNT_SID: Your Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token
 * - TWILIO_WHATSAPP_NUMBER: Your Twilio WhatsApp number (e.g., whatsapp:+14155238886)
 */

const twilio = require('twilio');

async function sendReminders() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
        process.exit(1);
    }

    let twilioClient;
    if (!DRY_RUN) {
        if (!accountSid || !authToken || !fromWhatsApp) {
            console.error('Error: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER are required for live sending.');
            process.exit(1);
        }
        twilioClient = twilio(accountSid, authToken);
    }

    // Calculate "Tomorrow" date string (YYYY-MM-DD)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`--- Reminder Sync: ${new Date().toISOString()} ---`);
    console.log(`Checking appointments for: ${tomorrowStr}`);

    // --- KEEP-ALIVE PING ---
    // Ensure at least one daily interaction to prevent Supabase free-tier pause.
    try {
        const pingUrl = `${supabaseUrl}/rest/v1/appointments?select=id&limit=1`;
        const pingResponse = await fetch(pingUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        if (pingResponse.ok) {
            console.log('[KEEP-ALIVE] Supabase ping successful.');
        } else {
            console.warn('[KEEP-ALIVE] Supabase ping returned non-OK status:', pingResponse.status);
        }
    } catch (pingErr) {
        console.error('[KEEP-ALIVE] Supabase is unreachable:', pingErr.message);
    }

    try {
        const queryUrl = `${supabaseUrl}/rest/v1/appointments?date=eq.${tomorrowStr}&send_reminder=eq.true&reminder_sent=eq.false`;

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
            const phone = appt.phone;

            if (!phone) {
                console.log(`Skipping appointment for ${appt.client_name} - No phone number.`);
                continue;
            }

            const messageText =
                `Reminder 🌿\n\n` +
                `You have a session tomorrow at ${timeClean}.\n\n` +
                `- Serene Practice`;

            const logMsg = `Reminder to be sent to ${phone} at ${timeClean} (for client: ${appt.client_name})`;

            if (DRY_RUN) {
                console.log(`[DRY RUN] ${logMsg}`);
                console.log(`[MESSAGE] ${messageText.replace(/\n/g, '\\n')}`);
            } else {
                console.log(`[SENDING] ${logMsg}`);
                try {
                    await twilioClient.messages.create({
                        from: fromWhatsApp,
                        to: `whatsapp:${phone}`,
                        body: messageText
                    });
                    console.log(`[SUCCESS] Sent to ${phone}`);

                    // Mark as sent in Supabase
                    const patchUrl = `${supabaseUrl}/rest/v1/appointments?id=eq.${appt.id}`;
                    const patchResponse = await fetch(patchUrl, {
                        method: 'PATCH',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ reminder_sent: true })
                    });

                    if (patchResponse.ok) {
                        console.log(`[MARKED SENT] Appointment ${appt.id}`);
                    } else {
                        const patchErr = await patchResponse.text();
                        console.error(`[ERROR] Failed to mark appointment ${appt.id} as sent:`, patchErr);
                    }
                } catch (sendErr) {
                    console.error(`[ERROR] Failed to send to ${phone}:`, sendErr.message);
                }
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
