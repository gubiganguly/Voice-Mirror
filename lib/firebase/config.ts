// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBHeHznN6CgiLLDcnQs462pOzMrv9Gstx4",
  authDomain: "voice-mirror-deeda.firebaseapp.com",
  projectId: "voice-mirror-deeda",
  storageBucket: "voice-mirror-deeda.firebasestorage.app",
  messagingSenderId: "665945633212",
  appId: "1:665945633212:web:b781177d055503661f7bb9",
  measurementId: "G-WN4XKPZDLB"
};

// Initialize Firebase
export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIRESTORE_DB = getFirestore(FIREBASE_APP);


// Conditionally initialize analytics only in browser environment
export const FIREBASE_ANALYTICS = typeof window !== 'undefined' 
  ? getAnalytics(FIREBASE_APP) 
  : null;