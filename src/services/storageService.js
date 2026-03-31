const admin = require('firebase-admin');

let firebaseInitialized = false;

// #region agent log
const agentLog = (location, message, data, hypothesisId) => {
  const payload = {
    sessionId: 'e0ac77',
    location,
    message,
    data,
    timestamp: Date.now(),
    hypothesisId
  };
  fetch('http://127.0.0.1:7382/ingest/eee79fb1-b801-4baa-bd86-e0d193626bd1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'e0ac77' },
    body: JSON.stringify(payload)
  }).catch(() => {});
};
// #endregion

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
    // #region agent log
    agentLog(
      'storageService.js:initFirebase:missingEnv',
      'firebase env incomplete',
      {
        hasProjectId: !!FIREBASE_PROJECT_ID,
        hasClientEmail: !!FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!FIREBASE_PRIVATE_KEY,
        hasBucket: !!FIREBASE_STORAGE_BUCKET
      },
      'H1'
    );
    // #endregion
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
  // #region agent log
  agentLog(
    'storageService.js:uploadTaskFile:entry',
    'upload start',
    {
      hasBuffer: !!(file && file.buffer),
      bufferLen: file && file.buffer ? file.buffer.length : 0,
      mimetype: file && file.mimetype
    },
    'H5'
  );
  // #endregion

  const adminInstance = initFirebase();
  // #region agent log
  agentLog(
    'storageService.js:uploadTaskFile:afterInit',
    'firebase init',
    { hasAdmin: !!adminInstance },
    'H1'
  );
  // #endregion
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

  try {
    // validation: false avoids HashStreamValidator bugs ("Cannot call write after a
    // stream was destroyed") seen on some hosts (e.g. Render) with @google-cloud/storage.
    // GCS still stores the object; server-side integrity applies as usual.
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype
      },
      resumable: false,
      validation: false
    });
    // #region agent log
    agentLog('storageService.js:uploadTaskFile:afterSave', 'gcs save ok', { filePath }, 'H2');
    // #endregion
  } catch (saveErr) {
    // #region agent log
    agentLog(
      'storageService.js:uploadTaskFile:saveErr',
      'gcs save failed',
      { msg: saveErr && saveErr.message, code: saveErr && saveErr.code },
      'H2'
    );
    // #endregion
    throw saveErr;
  }

  try {
    // Make file publicly accessible
    await fileRef.makePublic();
    // #region agent log
    agentLog('storageService.js:uploadTaskFile:afterMakePublic', 'makePublic ok', {}, 'H3');
    // #endregion
  } catch (pubErr) {
    // #region agent log
    agentLog(
      'storageService.js:uploadTaskFile:makePublicErr',
      'makePublic failed',
      { msg: pubErr && pubErr.message, code: pubErr && pubErr.code },
      'H3'
    );
    // #endregion
    throw pubErr;
  }

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  return {
    url: publicUrl,
    path: filePath
  };
};

module.exports = {
  uploadTaskFile
};

