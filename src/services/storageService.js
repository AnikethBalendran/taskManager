const admin = require('firebase-admin');

let firebaseInitialized = false;

const initFirebase = () => {
  if (firebaseInitialized) {
    return admin;
  }

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    FIREBASE_STORAGE_BUCKET
  } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_STORAGE_BUCKET) {
    console.warn(
      'Firebase Storage is not fully configured. ' +
      'Required env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET'
    );
    return null;
  }

  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        }),
        storageBucket: FIREBASE_STORAGE_BUCKET
      });
      firebaseInitialized = true;
    } catch (err) {
      console.error('Failed to initialize Firebase Admin SDK:', err);
      return null;
    }
  } else {
    firebaseInitialized = true;
  }

  return admin;
};

/**
 * Upload a task attachment (including proof images) to Firebase Storage.
 * Expects `file` to be a Multer file object using memoryStorage.
 */
const uploadTaskFile = async (taskId, file) => {
  const adminInstance = initFirebase();
  if (!adminInstance) {
    throw new Error('Firebase is not configured');
  }

  if (!file || !file.buffer) {
    throw new Error('File buffer is required for upload');
  }

  const bucket = adminInstance.storage().bucket();
  const timestamp = Date.now();
  const safeOriginalName = file.originalname.replace(/[^\w.\-]+/g, '_');
  const filePath = `tasks/${taskId}/${timestamp}_${safeOriginalName}`;

  const fileRef = bucket.file(filePath);

  await fileRef.save(file.buffer, {
    metadata: {
      contentType: file.mimetype
    },
    resumable: false
  });

  // Make file publicly accessible
  await fileRef.makePublic();

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  return {
    url: publicUrl,
    path: filePath
  };
};

module.exports = {
  uploadTaskFile
};

