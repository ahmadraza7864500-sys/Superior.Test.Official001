// Firebase Configuration
// Replace these values with your actual Firebase project credentials
// Get them from: https://console.firebase.google.com/

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Check if using placeholder credentials
export const isUsingPlaceholderCredentials = 
  firebaseConfig.apiKey === "YOUR_API_KEY_HERE" ||
  firebaseConfig.projectId === "YOUR_PROJECT_ID";

// Optional: Connect to emulators for local development
// Uncomment these lines if you're running Firebase emulators
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   connectAuthEmulator(auth, 'http://localhost:9099');
// }

export default app;
