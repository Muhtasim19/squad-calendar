const functions  = require("firebase-functions");
const admin      = require("firebase-admin");
const twilio     = require("twilio");

admin.initializeApp();

const client    = twilio(
  functions.config().twilio.account_sid,
  functions.config().twilio.auth_token
);
const FROM      = functions.config().twilio.phone;

// Fires when an event document is updated
exports.notifyOnApproval = functions.firestore
  .document("events/{eventId}")
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after  = change.after.data();

    // Only fire when status changes to "approved"
    if (before.status === after.status) return null;
    if (after.status !== "approved")    return null;

    // Get all active subscribers
    const snap = await admin.firestore()
      .collection("subscribers")
      .where("active", "==", true)
      .get();

    if (snap.empty) return null;

    const msg = `🗓 Squad Calendar: "${after.title}" is on ${after.date}${after.time ? ` at ${after.time}` : ""}${after.location ? ` @ ${after.location}` : ""}! Check it: squadcal.app`;

    const sends = snap.docs.map(doc =>
      client.messages.create({
        body: msg,
        from: FROM,
        to:   doc.data().phone,
      }).catch(err => console.error("SMS failed:", err))
    );

    return Promise.all(sends);
  });

// Fires when a new RSVP is added
exports.notifyOnRsvp = functions.firestore
  .document("events/{eventId}/rsvps/{rsvpId}")
  .onCreate(async (snap, context) => {
    const rsvp    = snap.data();
    const eventDoc = await admin.firestore()
      .collection("events")
      .doc(context.params.eventId)
      .get();

    if (!eventDoc.exists) return null;
    const ev = eventDoc.data();

    const subsSnap = await admin.firestore()
      .collection("subscribers")
      .where("active", "==", true)
      .get();

    if (subsSnap.empty) return null;

    const msg = `🙋 ${rsvp.name} is going to "${ev.title}" on ${ev.date}! Join them: squadcal.app`;

    const sends = subsSnap.docs.map(doc =>
      client.messages.create({
        body: msg,
        from: FROM,
        to:   doc.data().phone,
      }).catch(err => console.error("SMS failed:", err))
    );

    return Promise.all(sends);
  });