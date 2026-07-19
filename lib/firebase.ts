import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCRTNPQ_H6GZdUjBrdtpZYDElnclV4BHKQ",
  authDomain: "minyo07191.firebaseapp.com",
  projectId: "minyo07191",
  storageBucket: "minyo07191.firebasestorage.app",
  messagingSenderId: "732873304059",
  appId: "1:732873304059:web:9deca3d3d0116e2b0d4d5e",
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function ensureFirebaseAuth() {
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}
