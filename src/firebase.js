import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/database"
import "firebase/messaging";
import "firebase/storage"

const firebaseConfig = {
	apiKey: "AIzaSyCYw31UUFdkoEYdQlqSkPGc-VMYj-nSBnk",
    authDomain: "chatapp-1178f.firebaseapp.com",
    projectId: "chatapp-1178f",
    storageBucket: "chatapp-1178f.appspot.com",
    messagingSenderId: "780669474621",
    appId: "1:780669474621:web:e094fc3ba7346bf9b0d754",
    measurementId: "G-GTX46BN860"
};/*use your own configuration*/

const firebaseApp = firebase.initializeApp(firebaseConfig);

const enablePersistence = firebaseApp.firestore().enablePersistence();
const db = firebaseApp.firestore();
const db2 = firebaseApp.database();
const auth = firebaseApp.auth();
const provider = new firebase.auth.GoogleAuthProvider();
var provider2 = new firebase.auth.FacebookAuthProvider();
const createTimestamp = firebase.firestore.FieldValue.serverTimestamp;
const createTimestamp2 = firebase.database.ServerValue.TIMESTAMP;
const messaging = "serviceWorker" in navigator && "PushManager" in window ?  firebase.messaging() : null;
const fieldIncrement = firebase.firestore.FieldValue.increment;
const arrayUnion = firebase.firestore.FieldValue.arrayUnion;
const storage = firebase.storage().ref("images");
const audioStorage = firebase.storage().ref("audios");
const videoStorage = firebase.storage().ref("videos");
const documentStorage = firebase.storage().ref("documents");

//set firebase loaded to "true" in app.js
async function loadFirebase(setFirebaseLoaded) {
	await enablePersistence;
	await db;
	setFirebaseLoaded(true);
}
//db.disableNetwork();

export {loadFirebase, auth , provider, provider2, createTimestamp, messaging, fieldIncrement, arrayUnion, storage, audioStorage, videoStorage, documentStorage, db2, createTimestamp2};
export default db;
