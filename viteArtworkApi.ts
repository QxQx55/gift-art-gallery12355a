import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

interface StoredArtwork {
  id: string;
  slug: string;
  collectionId: string;
  collectionTitle: string;
  title: string;
  artist: string;
  artistRole: string;
  basePrice: number;
  src: string;
  large: string;
  ratio: number;
  year: string;
  medium: string;
  description: string;
}

const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20 MB

function readJsonBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function maybeSaveBase64Image(
  imageStr: string,
  id: string,
  uploadsDir: string
): string {
  const match = imageStr.match(
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/i
  );
  if (!match) return imageStr;

  const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `${safeId}.${ext}`;

  fs.mkdirSync(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
  return `/uploads/${filename}`;
}

export function artworkApiPlugin(rootDir: string): Plugin {
  const dataFile = path.join(rootDir, 'data', 'custom-artworks.json');
  const uploadsDir = path.join(rootDir, 'public', 'uploads');

  const readAll = (): StoredArtwork[] => {
    try {
      if (!fs.existsSync(dataFile)) return [];
      const raw = fs.readFileSync(dataFile, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeAll = (items: StoredArtwork[]) => {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(items, null, 2), 'utf8');
  };

  const attachMiddleware = (middlewares: {
    use: (
      handler: (
        req: IncomingMessage,
        res: ServerResponse,
        next: () => void
      ) => void
    ) => void;
  }) => {
    middlewares.use(async (req, res, next) => {
      const url = (req.url || '').split('?')[0];

      // Serve dynamically uploaded artwork images before Vite SPA HTML fallback
      if (req.method === 'GET' && url.startsWith('/uploads/')) {
        const filename = path.basename(url);
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) {
          const ext = path.extname(filename).toLowerCase();
          const mimeMap: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.gif': 'image/gif',
          };
          res.statusCode = 200;
          res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.end(fs.readFileSync(filePath));
          return;
        }
      }

      if (!url.startsWith('/api/artworks')) {
        next();
        return;
      }

      try {
        // GET /api/artworks
        if (req.method === 'GET' && url === '/api/artworks') {
          sendJson(res, 200, readAll());
          return;
        }

        // POST /api/artworks
        if (req.method === 'POST' && url === '/api/artworks') {
          const raw = await readJsonBody(req);
          const payload = JSON.parse(raw) as StoredArtwork;

          if (!payload.title || !payload.src) {
            sendJson(res, 400, { error: 'Title and image src are required' });
            return;
          }

          const storedSrc = maybeSaveBase64Image(
            payload.src,
            payload.id || `art-${Date.now()}`,
            uploadsDir
          );
          const created: StoredArtwork = {
            ...payload,
            id: payload.id || `custom-${Date.now()}`,
            src: storedSrc,
            large: storedSrc,
          };

          const existing = readAll().filter((a) => a.id !== created.id);
          writeAll([created, ...existing]);
          sendJson(res, 201, created);
          return;
        }

        // PUT /api/artworks/:id
        if (req.method === 'PUT' && url.startsWith('/api/artworks/')) {
          const id = decodeURIComponent(url.slice('/api/artworks/'.length));
          const raw = await readJsonBody(req);
          const updates = JSON.parse(raw) as Partial<StoredArtwork>;

          const items = readAll();
          const idx = items.findIndex((a) => a.id === id);
          if (idx === -1) {
            sendJson(res, 404, { error: 'Artwork not found' });
            return;
          }

          let nextSrc = updates.src ?? items[idx].src;
          if (updates.src) {
            nextSrc = maybeSaveBase64Image(updates.src, `${id}-${Date.now()}`, uploadsDir);
          }

          const updated: StoredArtwork = {
            ...items[idx],
            ...updates,
            id,
            src: nextSrc,
            large: nextSrc,
          };

          items[idx] = updated;
          writeAll(items);
          sendJson(res, 200, updated);
          return;
        }

        // DELETE /api/artworks/:id
        if (req.method === 'DELETE' && url.startsWith('/api/artworks/')) {
          const id = decodeURIComponent(url.slice('/api/artworks/'.length));
          const items = readAll();
          const target = items.find((a) => a.id === id);
          const remaining = items.filter((a) => a.id !== id);
          writeAll(remaining);

          if (target?.src?.startsWith('/uploads/')) {
            const fp = path.join(rootDir, 'public', target.src.replace(/^\//, ''));
            if (fs.existsSync(fp)) {
              try {
                fs.unlinkSync(fp);
              } catch {
                // Ignore unlink errors
              }
            }
          }

          sendJson(res, 200, { ok: true });
          return;
        }

        next();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Server error';
        sendJson(res, 500, { error: message });
      }
    });
  };

  return {
    name: 'shutabug-artwork-api',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}
