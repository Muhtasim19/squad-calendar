const { setGlobalOptions }  = require("firebase-functions");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule }        = require("firebase-functions/v2/scheduler");
const { onCall }            = require("firebase-functions/v2/https");
const admin                 = require("firebase-admin");
const https                 = require("https");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();
const db = admin.firestore();

const CALENDAR_LINK = "squadcal.app";

// ── Helper: clean phone number ──
function cleanPhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
}

// ── Helper: send SMS via Textbelt ──
function sendSMS(phone, message) {
  const key  = process.env.TEXTBELT_KEY;
  const body = JSON.stringify({ phone, message, key });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "textbelt.com",
      port:     443,
      path:     "/text",
      method:   "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data",  chunk => { data += chunk; });
      res.on("end",   ()    => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ success: false, error: "parse error" }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Helper: get contact phones by IDs ──
async function getPhonesForContacts(contactIds) {
  const phones = [];
  for (const cid of contactIds) {
    try {
      const cdoc = await db.collection("contacts").doc(cid).get();
      if (cdoc.exists && cdoc.data().phone) {
        phones.push(cleanPhone(cdoc.data().phone));
      }
    } catch (err) {
      console.error(`Error fetching contact ${cid}:`, err);
    }
  }
  return phones;
}

// ── 1. FCM push on event approval ──
exports.notifyOnApproval = onDocumentUpdated("events/{eventId}", async (event) => {
  const before = event.data.before.data();
  const after  = event.data.after.data();
  if (before.status === after.status || after.status !== "approved") return null;

  const tokensSnap = await db.collection("fcmTokens").get();
  const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
  if (tokens.length === 0) return null;

  try {
    await admin.messaging().sendEachForMulticast({
      notification: {
        title: "New plan approved! 🎉",
        body:  `"${after.title}" is on ${after.date}`,
      },
      tokens,
    });
  } catch (err) { console.error("FCM error:", err); }
  return null;
});

// ── 1b. FCM push when admin directly creates an approved event ──
exports.notifyOnCreate = onDocumentCreated("events/{eventId}", async (event) => {
  const data = event.data?.data();
  if (!data || data.status !== "approved") return null;

  const tokensSnap = await db.collection("fcmTokens").get();
  const tokens = tokensSnap.docs.map(d => d.data().token).filter(Boolean);
  if (tokens.length === 0) return null;

  try {
    await admin.messaging().sendEachForMulticast({
      notification: {
        title: "New plan added! 🎉",
        body:  `"${data.title}" is on ${data.date}`,
      },
      tokens,
    });
  } catch (err) { console.error("FCM create error:", err); }
  return null;
});

// ── 2. Daily FCM reminders (5PM ET) ──
exports.sendDailyReminders = onSchedule({
  schedule: "0 17 * * *",
  timeZone: "America/New_York",
}, async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const eventsSnap = await db.collection("events")
    .where("status", "==", "approved")
    .where("date",   "==", dateStr)
    .get();

  if (eventsSnap.empty) return null;

  for (const eventDoc of eventsSnap.docs) {
    const ev     = eventDoc.data();
    const rsvps  = await db.collection("events").doc(eventDoc.id).collection("rsvps").get();
    const tokens = rsvps.docs.map(d => d.data().fcmToken).filter(Boolean);
    if (tokens.length === 0) continue;

    try {
      await admin.messaging().sendEachForMulticast({
        notification: {
          title: "Tomorrow's the day! 📅",
          body:  `"${ev.title}" is tomorrow${ev.time ? ` at ${ev.time}` : ""}`,
        },
        tokens,
      });
    } catch (err) { console.error("FCM reminder error:", err); }
  }
  return null;
});

// ── 3. Daily SMS reminders (5PM ET) — only selected contacts ──
exports.sendSmsReminders = onSchedule({
  schedule: "0 17 * * *",
  timeZone: "America/New_York",
}, async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const eventsSnap = await db.collection("events")
    .where("status",      "==", "approved")
    .where("date",        "==", dateStr)
    .where("smsReminder", "==", true)
    .get();

  if (eventsSnap.empty) {
    console.log("No SMS-enabled events tomorrow — skipping");
    return null;
  }

  for (const eventDoc of eventsSnap.docs) {
    const ev            = eventDoc.data();
    const smsContactIds = ev.smsContactIds || [];

    if (smsContactIds.length === 0) {
      console.log(`Skipping "${ev.title}" — no contacts selected`);
      continue;
    }

    const phones = await getPhonesForContacts(smsContactIds);
    if (phones.length === 0) continue;

    let msg = `📅 "${ev.title}" is tomorrow`;
    if (ev.time)     msg += ` at ${ev.time}`;
    if (ev.location) msg += `\n📍 ${ev.location}`;
    msg += `\nSee you there! 🎉\n${CALENDAR_LINK}`;

    for (const phone of phones) {
      try {
        const result = await sendSMS(phone, msg);
        console.log(result.success
          ? `✅ SMS → ${phone} (quota: ${result.quotaRemaining})`
          : `❌ SMS failed → ${phone}: ${result.error}`
        );
      } catch (err) { console.error(`SMS error → ${phone}:`, err); }
    }
  }
  return null;
});

// ── 4. Custom announcement SMS — per-recipient logging, keep last 30 ──
exports.sendCustomSms = onCall(async (request) => {
  const { message, contactIds } = request.data;
  if (!message) throw new Error("Message required");
  if (!contactIds || contactIds.length === 0) return { sent: 0, total: 0 };

  // Fetch full contact docs so we can log names
  const recipients = [];
  for (const cid of contactIds) {
    try {
      const cdoc = await db.collection("contacts").doc(cid).get();
      if (cdoc.exists && cdoc.data().phone) {
        const c = cdoc.data();
        recipients.push({
          name:  `${c.firstName || c.name || ""} ${c.lastName || ""}`.trim() || "No name",
          phone: cleanPhone(c.phone),
        });
      }
    } catch (err) { console.error(`Error fetching contact ${cid}:`, err); }
  }
  if (recipients.length === 0) return { sent: 0, total: contactIds.length };

  const fullMessage = `${message}\n${CALENDAR_LINK}`;
  let sent = 0;
  const results = [];

  for (const r of recipients) {
    try {
      const result = await sendSMS(r.phone, fullMessage);
      const ok = !!result.success;
      if (ok) sent++;
      results.push({ name: r.name, phone: r.phone, success: ok });
      console.log(ok
        ? `✅ Custom SMS → ${r.phone} (quota: ${result.quotaRemaining})`
        : `❌ Custom SMS failed → ${r.phone}: ${result.error}`);
    } catch (err) {
      results.push({ name: r.name, phone: r.phone, success: false });
      console.error(`Custom SMS error → ${r.phone}:`, err);
    }
  }

  // Save log with per-recipient results
  try {
    await db.collection("smsLog").add({
      message, sent,
      total: recipients.length,
      recipients: results,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Keep only the last 30 logs
    const logsSnap = await db.collection("smsLog").orderBy("sentAt", "desc").get();
    if (logsSnap.size > 30) {
      for (const d of logsSnap.docs.slice(30)) await d.ref.delete();
    }
  } catch (err) { console.error("Failed to save SMS log:", err); }

  return { sent, total: recipients.length };
});