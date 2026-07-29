import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK if it hasn't been initialized yet
if (!admin.apps.length) {
  try {
    let credential;

    // Support production Vercel deployments via environment variable containing the service account JSON string
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        credential = admin.credential.cert(serviceAccount);
        console.log('[FIREBASE-ADMIN] Initializing using FIREBASE_SERVICE_ACCOUNT env variable.');
      } catch (parseErr: any) {
        console.error('[FIREBASE-ADMIN] Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseErr.message);
      }
    }

    // Fall back to local file-based credentials (using GOOGLE_APPLICATION_CREDENTIALS)
    if (!credential) {
      credential = admin.credential.applicationDefault();
      console.log('[FIREBASE-ADMIN] Initializing using applicationDefault() credentials.');
    }

    admin.initializeApp({
      credential,
    });
    console.log('[FIREBASE-ADMIN] Successfully initialized Firebase Admin.');
  } catch (error) {
    console.error('[FIREBASE-ADMIN] Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

export const fcm = admin.messaging();
export default admin;
