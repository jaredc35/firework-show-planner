// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBW3Dd4pGO_GTzYz0RByNJZ-nWh4FY6TuQ",
  authDomain: "richards-fireworks-60589.firebaseapp.com",
  projectId: "richards-fireworks-60589",
  storageBucket: "richards-fireworks-60589.firebasestorage.app",
  messagingSenderId: "364668182372",
  appId: "1:364668182372:web:04b2f4174d4a7ba2932471",
  measurementId: "G-GVCVYJ5ZQG",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
