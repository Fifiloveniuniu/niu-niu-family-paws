import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import config from './firebase-config.json';

// Emulator wiring is removed from production builds by Vite.
const emulated = import.meta.env.MODE === 'test';
export const auth = getAuth(initializeApp(emulated ? { apiKey: 'demo-key', projectId: 'demo-niu-niu', authDomain: 'localhost' } : import.meta.env.MODE === 'staging' ? { projectId: 'niu-niu-family-paws-dev', authDomain: 'niu-niu-family-paws-dev.firebaseapp.com', apiKey: import.meta.env.VITE_FIREBASE_API_KEY, appId: import.meta.env.VITE_FIREBASE_APP_ID } : config));
if (emulated) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
