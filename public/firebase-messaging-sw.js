importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCoIvbCmapIGTR1-6sdtEA4OrKaX1GXtCE",
  authDomain:        "squad-calendar-33507.firebaseapp.com",
  projectId:         "squad-calendar-33507",
  storageBucket:     "squad-calendar-33507.firebasestorage.app",
  messagingSenderId: "680912216838",
  appId:             "1:680912216838:web:0371988d335035b2b93487",
});

const messaging = firebase.messaging();

// Handle notifications when app is in background
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon:  '/logo192.png',
    badge: '/logo192.png',
    data:  { url: 'https://squadcal.app' },
  });
});

// Open squadcal.app when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('squadcal.app') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      return clients.openWindow('https://squadcal.app');
    })
  );
});