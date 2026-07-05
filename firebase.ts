import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDOBynDQ00o2Yh_TD9rsQnHypf97ne6hmM",
  authDomain: "arenax-c1586.firebaseapp.com",
  projectId: "arenax-c1586",
  storageBucket: "arenax-c1586.firebasestorage.app",
  messagingSenderId: "1069776825982",
  appId: "1:1069776825982:web:f2d7f11cef4c206206b22f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_UIDS = [
  'xDa31jOrsoQC2HxjSheO3wBqyII2',
  'lCNKrLAliFSvuML6Nwrr6YlNOtG3'
];
