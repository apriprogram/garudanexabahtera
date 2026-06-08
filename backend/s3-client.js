import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

const S3_ENDPOINT = 'https://is3.cloudhost.id';
const S3_REGION = 'us-east-1';
const S3_BUCKET = 'garudanexa';
const S3_ACCESS_KEY = 'IPDBMUDR80XHVFNKJIIS';
const S3_SECRET_KEY = '39hbxo1CifB8gFV2TSBJEdLA3D1P3Q3oG81JT0lA';
const S3_PUBLIC_URL = 'https://is3.cloudhost.id/garudanexa';

const client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

/**
 * Upload buffer/content ke S3
 * @param {Buffer|string} content - File content
 * @param {string} key - S3 object key (e.g. 'assets/product/image.webp')
 * @param {string} contentType - MIME type (optional)
 * @returns {Promise<string>} Public URL
 */
export async function uploadToS3(content, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: content,
    ContentType: contentType || 'application/octet-stream',
    ACL: 'public-read',
  });
  await client.send(command);
  return `${S3_PUBLIC_URL}/${key}`;
}

/**
 * Upload file dari base64 string
 * @param {string} base64Data - Base64 data URI (e.g. 'data:image/png;base64,...')
 * @param {string} section - Folder/subdirectory (e.g. 'product')
 * @param {string} filename - Nama file (optional, auto-generated if omitted)
 * @returns {Promise<string>} Public S3 URL
 */
export async function uploadBase64ToS3(base64Data, section, filename) {
  if (!base64Data || !base64Data.includes('data:')) {
    return base64Data; // Return as-is if not base64
  }
  const parts = base64Data.split(',');
  const header = parts[0];
  const content = Buffer.from(parts[1], 'base64');

  let ext = 'jpg';
  if (header.includes('png')) ext = 'png';
  else if (header.includes('svg')) ext = 'svg';
  else if (header.includes('webp')) ext = 'webp';
  else if (header.includes('gif')) ext = 'gif';
  else if (header.includes('pdf')) ext = 'pdf';

  const name = filename || `${section}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `assets/${section}/${name}`;

  let contentType = 'application/octet-stream';
  if (ext === 'png') contentType = 'image/png';
  else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
  else if (ext === 'svg') contentType = 'image/svg+xml';
  else if (ext === 'webp') contentType = 'image/webp';
  else if (ext === 'gif') contentType = 'image/gif';
  else if (ext === 'pdf') contentType = 'application/pdf';

  return await uploadToS3(content, key, contentType);
}

/**
 * Upload compressed WebP image (for list_products)
 */
export async function uploadCompressedImageToS3(base64Data, section) {
  if (!base64Data || !base64Data.includes('data:image')) return base64Data;

  const parts = base64Data.split(',');
  const content = Buffer.from(parts[1], 'base64');
  const filename = `${section}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
  const key = `assets/${section}/${filename}`;

  try {
    const sharp = (await import('sharp')).default;
    const compressed = await sharp(content)
      .resize(640, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
    return await uploadToS3(compressed, key, 'image/webp');
  } catch {
    // Fallback: save as original
    return await uploadToS3(content, key, 'image/webp');
  }
}

/**
 * Delete object dari S3
 */
export async function deleteFromS3(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    await client.send(command);
  } catch (err) {
    console.warn(`[S3] Delete warning: ${err.message}`);
  }
}

/**
 * Convert path URL ke S3 key
 * e.g. '/assets/product/image.webp' → 'assets/product/image.webp'
 */
export function pathToKey(path) {
  if (!path) return null;
  return path.replace(/^\//, '');
}

/**
 * Upload existing local file to S3
 */
export async function uploadLocalFile(localPath, s3Key, contentType) {
  const { readFileSync } = await import('fs');
  const content = readFileSync(localPath);
  return await uploadToS3(content, s3Key, contentType);
}

export { S3_PUBLIC_URL, S3_BUCKET };
