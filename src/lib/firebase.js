import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Let op: Heb je dit stukje goed overgenomen van Google?
const firebaseConfig = {
  apiKey: "AIzaSyBwV2VrVdrvk7dgab1FIYUfjhvhip4eXtI",
  authDomain: "bewustetrader.firebaseapp.com",
  projectId: "bewustetrader",
  storageBucket: "bewustetrader.firebasestorage.app",
  messagingSenderId: "289286815246",
  appId: "1:289286815246:web:b62cd9975b06e93f05c65f"
};

// Start de app
const app = initializeApp(firebaseConfig);

// Export
export const auth = getAuth(app);
export const db = getFirestore(app);