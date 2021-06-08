importScripts('https://www.gstatic.com/firebasejs/8.0.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.0.1/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyCYw31UUFdkoEYdQlqSkPGc-VMYj-nSBnk",
    authDomain: "chatapp-1178f.firebaseapp.com",
    projectId: "chatapp-1178f",
    storageBucket: "chatapp-1178f.appspot.com",
    messagingSenderId: "780669474621",
    appId: "1:780669474621:web:e094fc3ba7346bf9b0d754",
    measurementId: "G-GTX46BN860"
}) /*use your own configuration*/

const messaging = firebase.messaging();

var href = self.location.origin 

messaging.onBackgroundMessage(payload => {
	const title = payload.data.title;
	const options = payload.data.image ? {
		badge: "icon.png",
		body: payload.data.body,
		icon: payload.data.photoURL,
        image: payload.data.image,
    } : {
        badge: "icon.png",
        body: payload.data.body,
        icon: payload.data.photoURL,
    }
	self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    self.clients.openWindow(href);
})
