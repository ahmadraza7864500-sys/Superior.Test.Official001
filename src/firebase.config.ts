// Firebase Configuration
// This file is OPTIONAL - the app works without Firebase using localStorage

// Check if Firebase credentials are configured
export const isUsingPlaceholderCredentials = true;

// Firebase will only be initialized when you add real credentials
// For now, the app uses localStorage (works immediately)

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Lazy initialization - only when needed
export async function getFirebaseApp() {
  if (isUsingPlaceholderCredentials) {
    return null;
  }
  
  try {
    const { initializeApp } = await import('firebase/app');
    const { getFirestore } = await import('firebase/firestore');
    const { getAuth } = await import('firebase/auth');
    
    const app = initializeApp(firebaseConfig);
    return {
      app,
      db: getFirestore(app),
      auth: getAuth(app)
    };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return null;
  }
}

export default null;
