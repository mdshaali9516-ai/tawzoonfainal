import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { firestore } from './firebase.ts';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export interface MediaAssetRecord {
  id: string;
  filename: string;
  mime: string;
  data: string; // Base64 data string
  size: number;
  updatedAt: number;
}

// In-memory cache for recent media to prevent Firestore read quota burn
const mediaMemoryCache = new Map<string, { buffer: Buffer; mime: string; expiresAt: number }>();

function getCleanId(filenameOrId: string): string {
  return filenameOrId
    .replace(/^\/?(uploads|api\/media)\//, '')
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_');
}

function getCleanFilename(filenameOrId: string, ext: string = 'webp'): string {
  const base = getCleanId(filenameOrId);
  return `${base}.${ext}`;
}

/**
 * Saves a media buffer both to local disk and to Cloud Firestore permanently.
 * Survives container restarts, crashes, and redeployments.
 */
export async function saveMediaAsset(
  identifier: string,
  rawBuffer: Buffer,
  mimeType: string = 'image/webp'
): Promise<string> {
  if (!rawBuffer || rawBuffer.length === 0) {
    return identifier;
  }

  let finalBuffer = rawBuffer;
  let finalMime = mimeType;
  let ext = 'webp';

  const headerSnippet = rawBuffer.subarray(0, Math.min(rawBuffer.length, 512)).toString('utf8');
  const isSvg = finalMime.includes('svg') || headerSnippet.includes('<svg') || headerSnippet.includes('<?xml');

  if (isSvg) {
    finalMime = 'image/svg+xml';
    ext = 'svg';
  } else {
    // Compress raster image using sharp to fit safely within Firestore documents
    try {
      const isRaster = (rawBuffer.length >= 2 && rawBuffer[0] === 0xFF && rawBuffer[1] === 0xD8) || // JPEG
        (rawBuffer.length >= 8 && rawBuffer[0] === 0x89 && rawBuffer[1] === 0x50) || // PNG
        (rawBuffer.length >= 12 && rawBuffer.subarray(8, 12).toString('ascii') === 'WEBP') || // WEBP
        (rawBuffer.length >= 4 && rawBuffer.subarray(0, 4).toString('ascii').startsWith('GIF')); // GIF

      if (isRaster) {
        finalBuffer = await sharp(rawBuffer)
          .resize(900, 900, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();
        finalMime = 'image/webp';
        ext = 'webp';
      }
    } catch (sharpErr) {
      console.warn('[Media] Sharp compression notice (preserving buffer):', sharpErr);
    }
  }

  const cleanId = getCleanId(identifier) || `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const cleanFilename = `${cleanId}.${ext}`;
  const filePath = path.join(uploadsDir, cleanFilename);

  // 1. Write to local disk cache for instant serving
  try {
    fs.writeFileSync(filePath, finalBuffer);
  } catch (fsErr) {
    console.error('[Media] Error saving local upload:', fsErr);
  }

  // 2. Cache in memory
  mediaMemoryCache.set(cleanId, {
    buffer: finalBuffer,
    mime: finalMime,
    expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour
  });

  // 3. Persist to Cloud Firestore media_assets collection
  if (firestore) {
    try {
      const base64Str = finalBuffer.toString('base64');
      const docRef = doc(firestore, 'media_assets', cleanId);
      await Promise.race([
        setDoc(docRef, {
          id: cleanId,
          filename: cleanFilename,
          mime: finalMime,
          data: base64Str,
          size: finalBuffer.length,
          updatedAt: Date.now()
        }, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore media write timeout')), 10000))
      ]);
      console.log(`[Media-Cloud] Permanently persisted image ${cleanFilename} (${Math.round(finalBuffer.length / 1024)}KB) to Firestore`);
    } catch (cloudErr: any) {
      console.warn(`[Media-Cloud] Note saving media ${cleanId} to Firestore:`, cloudErr?.message || cloudErr);
    }
  }

  return `/uploads/${cleanFilename}`;
}

/**
 * Retrieves a media asset by filename or ID.
 * If file does not exist on local disk (e.g. after container restart), restores it from Firestore media_assets!
 */
export async function getMediaAsset(filenameOrId: string): Promise<{ buffer: Buffer; mime: string } | null> {
  const cleanId = getCleanId(filenameOrId);
  if (!cleanId) return null;

  // 1. Check memory cache
  const mem = mediaMemoryCache.get(cleanId);
  if (mem && Date.now() < mem.expiresAt) {
    return { buffer: mem.buffer, mime: mem.mime };
  }

  // 2. Check local disk
  const possibleFilenames = [
    `${cleanId}.webp`,
    `${cleanId}.jpg`,
    `${cleanId}.jpeg`,
    `${cleanId}.png`,
    `${cleanId}.svg`
  ];

  for (const fn of possibleFilenames) {
    const p = path.join(uploadsDir, fn);
    if (fs.existsSync(p)) {
      try {
        const buf = fs.readFileSync(p);
        const ext = path.extname(fn).toLowerCase().replace('.', '');
        const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
        mediaMemoryCache.set(cleanId, { buffer: buf, mime, expiresAt: Date.now() + 30 * 60 * 1000 });
        return { buffer: buf, mime };
      } catch {}
    }
  }

  // 3. Fallback: Restore from Cloud Firestore media_assets!
  if (firestore) {
    try {
      const docRef = doc(firestore, 'media_assets', cleanId);
      const snap = await Promise.race([
        getDoc(docRef),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Firestore media fetch timeout')), 5000))
      ]);

      if (snap && snap.exists()) {
        const record = snap.data() as MediaAssetRecord;
        if (record && record.data) {
          const buf = Buffer.from(record.data, 'base64');
          const mime = record.mime || 'image/webp';
          const ext = mime.includes('svg') ? 'svg' : (mime.includes('png') ? 'png' : (mime.includes('jpeg') ? 'jpg' : 'webp'));
          const restoredFilename = `${cleanId}.${ext}`;
          
          // Re-hydrate local disk cache so subsequent requests hit disk directly
          try {
            fs.writeFileSync(path.join(uploadsDir, restoredFilename), buf);
            console.log(`[Media-Cloud] Re-hydrated media asset ${restoredFilename} from Firestore back to local disk`);
          } catch (writeErr) {
            console.warn('[Media-Cloud] Re-hydration disk write note:', writeErr);
          }

          mediaMemoryCache.set(cleanId, { buffer: buf, mime, expiresAt: Date.now() + 30 * 60 * 1000 });
          return { buffer: buf, mime };
        }
      }
    } catch (err: any) {
      console.warn(`[Media-Cloud] Error reading media ${cleanId} from Firestore:`, err?.message || err);
    }
  }

  return null;
}

/**
 * Normalizes any input image URL (data-url, upload path, or existing url).
 * Ensures it is permanently stored in Firestore media_assets.
 */
export async function normalizeAndPersistImage(url: string): Promise<string> {
  if (!url || typeof url !== 'string') return url;

  // External web URLs (like Unsplash, YouTube, Cloudinary) don't need local persistence
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Base64 Data URL
  if (url.startsWith('data:image')) {
    try {
      const matches = url.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mime = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        return await saveMediaAsset(`img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`, buffer, mime);
      }
    } catch (e) {
      console.warn('[Media] Base64 conversion warning:', e);
    }
    return url;
  }

  // Upload path like /uploads/media_xxx.webp
  if (url.startsWith('/uploads/')) {
    const filename = url.replace('/uploads/', '');
    const cleanId = getCleanId(filename);
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
      try {
        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filename).toLowerCase().replace('.', '');
        const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
        // Persist to Cloud Firestore in background if not already in memory
        if (!mediaMemoryCache.has(cleanId)) {
          saveMediaAsset(cleanId, buffer, mime).catch(() => {});
        }
      } catch {}
    }
    return url;
  }

  return url;
}

/**
 * Permanently deletes a media asset from memory cache, local disk, and Cloud Firestore.
 */
export async function deleteMediaAsset(urlOrFilename: string): Promise<void> {
  if (!urlOrFilename || typeof urlOrFilename !== 'string') return;
  const cleanId = getCleanId(urlOrFilename);
  if (!cleanId) return;

  mediaMemoryCache.delete(cleanId);

  const possibleFilenames = [
    `${cleanId}.webp`,
    `${cleanId}.jpg`,
    `${cleanId}.jpeg`,
    `${cleanId}.png`,
    `${cleanId}.svg`
  ];

  for (const fn of possibleFilenames) {
    const p = path.join(uploadsDir, fn);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch (err) {
        console.warn(`[Media] Failed to delete local file ${p}:`, err);
      }
    }
  }

  if (firestore) {
    try {
      await deleteDoc(doc(firestore, 'media_assets', cleanId));
      console.log(`[Media-Cloud] Deleted media_assets/${cleanId} from Cloud Firestore`);
    } catch (err) {
      console.warn(`[Media-Cloud] Note deleting media_assets/${cleanId}:`, err);
    }
  }
}

