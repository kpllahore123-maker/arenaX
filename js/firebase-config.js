// ==========================================
// ARENAX FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  deleteUser 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  increment, 
  where, 
  limit, 
  arrayUnion, 
  arrayRemove, 
  runTransaction 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// Global document element selector helper
window.$ = (id) => (typeof id === 'string' ? document.getElementById(id) : id);
export const $ = window.$;

// Module-scoped localStorage shadow to prevent SecurityError in restricted iframes/browsers
let localMemoryStorage = {};
let storageAccessor;
try {
  const testKey = '__storage_test__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
  storageAccessor = window.localStorage;
} catch (e) {
  console.warn("Window localStorage is blocked or throws an error. Shadowing with in-memory storage fallback.");
  storageAccessor = {
    getItem: (key) => (key in localMemoryStorage ? localMemoryStorage[key] : null),
    setItem: (key, val) => { localMemoryStorage[key] = String(val); },
    removeItem: (key) => { delete localMemoryStorage[key]; },
    clear: () => { localMemoryStorage = {}; },
    key: (i) => Object.keys(localMemoryStorage)[i] || null,
    get length() { return Object.keys(localMemoryStorage).length; }
  };
}
const safeLocalStorage = storageAccessor;
window.safeLocalStorage = safeLocalStorage;

// Setup credentials
const firebaseConfig = {
  apiKey: "AIzaSyDOBynDQ00o2Yh_TD9rsQnHypf97ne6hmM",
  authDomain: "arenax-c1586.firebaseapp.com",
  projectId: "arenax-c1586",
  storageBucket: "arenax-c1586.firebasestorage.app",
  messagingSenderId: "1069776825982",
  appId: "1:1069776825982:web:f2d7f11cef4c206206b22f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// Admin UIDs and Configuration
const ADMIN_UIDS = ['xDa31jOrsoQC2HxjSheO3wBqyII2', 'lCNKrLAliFSvuML6Nwrr6YlNOtG3'];
const ADMIN_EMAILS = ['kpllahore123@gmail.com'];

// Shared reactive state defaults on window
window.userProfile = window.userProfile || null;
window.guestProfile = window.guestProfile || null;
window.currentUser = window.currentUser || null;
window.toursData = window.toursData || [];
window.allGuilds = window.allGuilds || [];
window.userGuild = window.userGuild || null;
window.currentViewingPlayerId = window.currentViewingPlayerId || null;
window.currentViewingPlayerName = window.currentViewingPlayerName || 'Player';
window.currentViewedUser = window.currentViewedUser || null;

// Safe fallback for toast notifications
window.showToastNotification = window.showToastNotification || function(title, body) {
  console.log('[Toast]', title, body);
};

// Export instances globally for cross-module compatibility
window.app = app;
window.auth = auth;
window.db = db;
window.storage = storage;
window.googleProvider = googleProvider;
window.ADMIN_UIDS = ADMIN_UIDS;
window.ADMIN_EMAILS = ADMIN_EMAILS;

// Auth methods
window.initializeApp = initializeApp;
window.getAuth = getAuth;
window.GoogleAuthProvider = GoogleAuthProvider;
window.signInWithPopup = signInWithPopup;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.signOut = signOut;
window.onAuthStateChanged = onAuthStateChanged;
window.updateProfile = updateProfile;
window.sendPasswordResetEmail = sendPasswordResetEmail;
window.sendEmailVerification = sendEmailVerification;
window.deleteUser = deleteUser;

// Firestore methods
window.getFirestore = getFirestore;
window.collection = collection;
window.addDoc = addDoc;
window.onSnapshot = onSnapshot;
window.query = query;
window.orderBy = orderBy;
window.serverTimestamp = serverTimestamp;
window.doc = doc;
window.getDoc = getDoc;
window.setDoc = setDoc;
window.getDocs = getDocs;
window.deleteDoc = deleteDoc;
window.updateDoc = updateDoc;
window.increment = increment;
window.where = where;
window.limit = limit;
window.arrayUnion = arrayUnion;
window.arrayRemove = arrayRemove;
window.runTransaction = runTransaction;

// Storage methods
window.getStorage = getStorage;
window.ref = ref;
window.uploadBytes = uploadBytes;
window.uploadBytesResumable = uploadBytesResumable;
window.getDownloadURL = getDownloadURL;

export {
  app,
  auth,
  db,
  storage,
  googleProvider,
  ADMIN_UIDS,
  ADMIN_EMAILS,
  initializeApp,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  increment,
  where,
  limit,
  arrayUnion,
  arrayRemove,
  runTransaction,
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL
};
