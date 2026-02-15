// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace these with your actual Firebase config from the Firebase Console
// Project Settings > General > Your apps > Firebase SDK snippet
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBW3Dd4pGO_GTzYz0RByNJZ-nWh4FY6TuQ",
  authDomain: "richards-fireworks-60589.firebaseapp.com",
  projectId: "richards-fireworks-60589",
  storageBucket: "richards-fireworks-60589.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "364668182372",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:364668182372:web:04b2f4174d4a7ba2932471"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
