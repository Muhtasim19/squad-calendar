const functions = require("firebase-functions");
const admin     = require("firebase-admin");

admin.initializeApp();

// ─── Helper: send push to all stored tokens ───
async function pushToAll(title, body) {
  const snap = await admin.firestore().collection("fcmTokens").get();
  if (snap.empty) return;

  const tokens = snap.docs.map(d => d.data().token);
  if (!tokens.length) return;

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      notification: {
        icon:  "https://squadcal.app/logo192.png",
        badge: "https://squadcal.app/logo192.png",
      },
      fcmOptions: { link: "https://squadcal.app" },
    },
  });

  // Clean up expired/invalid tokens
  const deletes = [];
  response.responses.forEach((resp, i) => {
    if (!resp.success) deletes.push(snap.docs[i].ref.delete());
  });
  if (deletes.length) await Promise.all(deletes);
}

// ─── Helper: send push to a single token ───
async function pushToToken(token, title, body) {
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      webpush: {
        notification: { icon: "https://squadcal.app/logo192.png" },
        fcmOptions: { link: "https://squadcal.app" },
      },
    });
  } catch (err) {
    console.error("Push failed:", err);
  }
}

// ─── 1. Notify everyone when event is approved ───
exports.notifyOnApproval = functions.firestore
  .document("events/{eventId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    if (before.status === after.status) return null;
    if (after.status !== "approved")    return null;

    return pushToAll(
      "Squad Calendar 🗓",
      `"${after.title}" is on! ${after.date}${after.time ? ` at ${after.time}` : ""}${after.location ? ` @ ${after.location}` : ""}`
    );
  });

// ─── 2. 24h reminder to RSVPed people ───
exports.sendDailyReminders = functions.pubsub
  .schedule("0 9 * * *")
  .timeZone("America/New_York")
  .onRun(async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, "0"),
      String(tomorrow.getDate()).padStart(2, "0"),
    ].join("-");

    const eventsSnap = await admin.firestore()
      .collection("events")
      .where("status", "==", "approved")
      .where("date", "==", dateStr)
      .get();

    if (eventsSnap.empty) return null;

    const all = [];

    for (const evDoc of eventsSnap.docs) {
      const ev        = evDoc.data();
      const rsvpsSnap = await admin.firestore()
        .collection("events").doc(evDoc.id)
        .collection("rsvps").get();

      for (const rsvpDoc of rsvpsSnap.docs) {
        const { name, fcmToken } = rsvpDoc.data();
        if (!fcmToken) continue;

        all.push(pushToToken(
          fcmToken,
          "⏰ Tomorrow's the day!",
          `"${ev.title}"${ev.time ? ` at ${ev.time}` : ""}${ev.location ? ` @ ${ev.location}` : ""}. See you there ${name}! 🎉`
        ));
      }
    }

    return Promise.all(all);
  });