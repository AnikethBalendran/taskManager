const https = require('https');
const { URL } = require('url');
const admin = require('firebase-admin');
const { JWT } = require('google-auth-library');

let firebaseInitialized = false;
/** Lazy JWT client for GCS REST uploads (avoids @google-cloud/storage stream bugs on some hosts). */
let gcsJwtClient = null;

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
 * Upload object bytes using GCS JSON API media upload (single POST).
 * Does not use File#createWriteStream / duplexify (avoids "stream was destroyed" on Render).
 */
const uploadBufferViaGcsRest = async (bucketName, objectPath, buffer, contentType) => {
  if (!gcsJwtClient) {
    const { FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    gcsJwtClient = new JWT({
      email: FIREBASE_CLIENT_EMAIL,
      key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/devstorage.full_control']
    });
  }
  const { token } = await gcsJwtClient.getAccessToken();
  if (!token) {
    throw new Error('Could not obtain access token for storage upload');
  }

  const uploadUrl =
    `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o` +
    `?uploadType=media&name=${encodeURIComponent(objectPath)}`;

  const u = new URL(uploadUrl);
  await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType || 'application/octet-stream',
          'Content-Length': buffer.length
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            const err = new Error(`GCS REST upload failed: ${res.statusCode} ${body}`);
            err.status = res.statusCode;
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
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
    await uploadBufferViaGcsRest(bucket.name, filePath, file.buffer, file.mimetype);
    // #region agent log
    agentLog('storageService.js:uploadTaskFile:afterSave', 'gcs REST upload ok', { filePath }, 'H2');
    // #endregion
  } catch (saveErr) {
    // #region agent log
    agentLog(
      'storageService.js:uploadTaskFile:saveErr',
      'gcs REST upload failed',
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

