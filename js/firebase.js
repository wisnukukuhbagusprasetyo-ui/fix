export const config = window.__ENV || {};
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
import { getFunctions } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js';
export const functions = getFunctions(app);
