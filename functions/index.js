const { setGlobalOptions }    = require("firebase-functions");
const { onDocumentUpdated }   = require("firebase-functions/v2/firestore");
const { onSchedule }          = require("firebase-functions/v2/scheduler");
const admin                   = require("firebase-admin");
const https                   = require("https");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();
const db = admin.firestore();

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

// ── 2. Daily FCM reminders (9AM ET) ──
exports.sendDailyReminders = onSchedule({
  schedule: "0 9 * * *",
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
    const ev        = eventDoc.data();
    const rsvpsSnap = await db.collection("events").doc(eventDoc.id).collection("rsvps").get();
    const tokens    = rsvpsSnap.docs.map(d => d.data().fcmToken).filter(Boolean);
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

// ── 3. Daily SMS reminders via Textbelt (9AM ET) ──
exports.sendSmsReminders = onSchedule({
  schedule: "0 9 * * *",
  timeZone: "America/New_York",
}, async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split("T")[0];

  const eventsSnap = await db.collection("events")
    .where("status", "==", "approved")
    .where("date",   "==", dateStr)
    .get();

  if (eventsSnap.empty) {
    console.log("No events tomorrow — no SMS sent");
    return null;
  }

  for (const eventDoc of eventsSnap.docs) {
    const ev        = eventDoc.data();
    const rsvpsSnap = await db.collection("events").doc(eventDoc.id).collection("rsvps").get();

    for (const rsvpDoc of rsvpsSnap.docs) {
      const rsvp = rsvpDoc.data();
      if (!rsvp.phone) continue;

      let msg = `📅 Squad reminder: "${ev.title}" is tomorrow`;
      if (ev.time)     msg += ` at ${ev.time}`;
      if (ev.location) msg += `\n📍 ${ev.location}`;
      msg += `\nSee you there! 🎉`;

      try {
        const result = await sendSMS(rsvp.phone, msg);
        if (result.success) {
          console.log(`✅ SMS sent to ${rsvp.phone} — quota left: ${result.quotaRemaining}`);
        } else {
          console.error(`❌ SMS failed to ${rsvp.phone}:`, result.error);
        }
      } catch (err) {
        console.error(`SMS error for ${rsvp.phone}:`, err);
      }
    }
  }
  return null;
});