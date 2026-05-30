importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "your_api_key",
  authDomain:        "squad-calendar-33507.firebaseapp.com",
  projectId:         "squad-calendar-33507",
  storageBucket:     "squad-calendar-33507.firebasestorage.app",
  messagingSenderId: "680912216838",
  appId:             "your_app_id",
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon:  '/logo192.png',
    badge: '/logo192.png',
    data:  { url: 'https://squadcal.app' },
  });
});

// Open app when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('https://squadcal.app'));
});