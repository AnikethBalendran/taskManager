const https = require('https');
const { URL } = require('url');
const { createPrivateKey } = require('crypto');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

let firebaseInitialized = false;

/** Same scope set as firebase-admin ServiceAccountCredential (credential-internal.js). */
const GOOGLE_SERVICE_ACCOUNT_JWT_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/firebase.messaging',
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

/**
 * Normalize PEM from env: escaped newlines, trim, strip wrapping quotes (common on Render),
 * BOM. Ensures crypto.createPrivateKey + jsonwebtoken agree with a real RSA key.
 */
const normalizeFirebasePrivateKey = (raw) => {
  if (!raw || typeof raw !== 'string') {
    return raw;
  }
  let k = raw.trim().replace(/^\uFEFF/, '');
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\n/g, '\n');
};

/**
 * OAuth2 access token via JWT bearer (same flow as Firebase Admin's ServiceAccountCredential).
 * Uses normalized key + KeyObject so jsonwebtoken does not fall back to a bogus "secret" key.
 */
const fetchGoogleAccessTokenFromEnv = async () => {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const pem = normalizeFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  const privateKey = createPrivateKey({ key: pem, format: 'pem' });

  const assertion = jwt.sign(
    { scope: GOOGLE_SERVICE_ACCOUNT_JWT_SCOPES },
    privateKey,
    {
      algorithm: 'RS256',
      audience: 'https://accounts.google.com/o/oauth2/token',
      expiresIn: 3600,
      issuer: clientEmail
    }
  );

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  }).toString();

  const tokenResponse = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'accounts.google.com',
        path: '/o/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          try {
            const json = JSON.parse(text);
            if (!json.access_token) {
              reject(new Error(`OAuth token response missing access_token: ${text}`));
              return;
            }
            resolve(json);
          } catch (e) {
            reject(new Error(`OAuth token response not JSON: ${res.statusCode} ${text}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  return tokenResponse.access_token;
};

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
          privateKey: normalizeFirebasePrivateKey(FIREBASE_PRIVATE_KEY)
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
 *
 * OAuth token: jwt-bearer flow with normalized PEM + crypto KeyObject (avoids jsonwebtoken
 * mis-detecting the key when env PEM has quotes/extra chars — see RS256 / asymmetric key errors).
 */
const uploadBufferViaGcsRest = async (bucketName, objectPath, buffer, contentType) => {
  const token = await fetchGoogleAccessTokenFromEnv();
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

  await uploadBufferViaGcsRest(bucket.name, filePath, file.buffer, file.mimetype);
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

