// Run once locally: node setAdmin.js YOUR_UID
const admin = require("firebase-admin");
admin.initializeApp({ projectId: "squad-calendar-33507" });

const uid = process.argv[2];
if (!uid) { console.error("Usage: node setAdmin.js <uid>"); process.exit(1); }

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => { console.log("✅ admin claim set for", uid); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
