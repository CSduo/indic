import path from "path";
import fs from "fs";
import { put } from "@vercel/blob";
import { v2 as cloudinary } from "cloudinary";

export const UPLOADS_DIR = process.env.UPLOADS_DIR || "/tmp/anvikshiki-uploads";

export type StorageProvider = "vercel-blob" | "cloudinary" | "local-disk" | "inline-base64";

export type StoredFile = {
  url: string;
  storageKey: string;
  provider: StorageProvider;
  /** Cloudinary's resource class, needed to build a delivery URL later. */
  resourceType?: string;
  /** True when the stored object has no working public address. */
  private?: boolean;
};

/**
 * Local disk is a real destination when the API runs on a machine with a
 * durable filesystem. On a serverless platform it is not: `/tmp` belongs to a
 * single function instance and is discarded when that instance recycles, so a
 * file written there returns a working URL for a few minutes and then 404s
 * forever. That is what made uploaded covers and figures vanish from published
 * pages some time after they were posted.
 */
export function localDiskIsDurable(): boolean {
  if (process.env.UPLOADS_DIR) return true; // Operator pointed at a real volume.
  return !process.env.VERCEL;
}

/** Which providers are configured, in the order they will be attempted. */
export function storageTiers(): Array<{ provider: StorageProvider; available: boolean; note?: string }> {
  return [
    { provider: "vercel-blob", available: Boolean(process.env.BLOB_READ_WRITE_TOKEN) },
    { provider: "cloudinary", available: Boolean(process.env.CLOUDINARY_URL) },
    {
      provider: "local-disk",
      available: localDiskIsDurable(),
      note: localDiskIsDurable() ? UPLOADS_DIR : "skipped: ephemeral filesystem on this platform",
    },
    {
      provider: "inline-base64",
      available: true,
      note: "last resort; images only, stored in the database row",
    },
  ];
}

/** The provider an upload would actually land in right now. */
export function activeStorageProvider(): StorageProvider {
  return storageTiers().find(tier => tier.available)!.provider;
}

/**
 * True when nothing durable and external is configured, so uploads will be
 * inlined into the database. Usable, but worth flagging to an operator.
 */
export function storageIsDegraded(): boolean {
  const active = activeStorageProvider();
  return active === "inline-base64" || active === "local-disk";
}

const MAX_INLINE_BYTES = 5 * 1024 * 1024;

/**
 * Persist an uploaded file through the provider chain, returning the first
 * durable URL. Each tier is tried in turn; a tier that throws is logged and the
 * next is attempted, so a misconfigured provider degrades rather than fails.
 */
export async function persistUploadedFile(options: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder: string;
  /**
   * "private" stores the file so that it has no public address at all: the CDN
   * refuses any request that this server has not signed. Used for things sent
   * inside a conversation, where the only people entitled to open the file are
   * the people in that conversation.
   */
  visibility?: "public" | "private";
}): Promise<StoredFile> {
  const { buffer, filename, mimeType, folder } = options;
  const wantsPrivate = options.visibility === "private";
  const extension = path.extname(filename).toLowerCase();
  const isAudio =
    mimeType.startsWith("audio/") ||
    [".webm", ".mp3", ".ogg", ".wav", ".m4a"].includes(extension);
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  // Vercel Blob only serves public objects, so a file that must not have a
  // public address skips this tier rather than quietly losing its privacy.
  if (process.env.BLOB_READ_WRITE_TOKEN && !wantsPrivate) {
    try {
      const blob = await put(`anvikshiki/${folder}/${filename}`, buffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (blob?.url) return { url: blob.url, storageKey: blob.url, provider: "vercel-blob" };
    } catch (err) {
      console.warn("Vercel Blob upload failed, trying the next provider:", err);
    }
  }

  if (process.env.CLOUDINARY_URL) {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `anvikshiki/${folder}`,
            resource_type: isAudio ? "video" : isPdf ? "raw" : "auto",
            // "authenticated" means the object is not reachable without a
            // signature this server computes. The delivery URL cannot be
            // derived from the id, guessed, or built by anyone who does not
            // hold the API secret.
            ...(wantsPrivate ? { type: "authenticated" as const } : {}),
            // Keep the sender's filename in the delivered URL, with a suffix
            // for uniqueness. Without this the stored object gets a random id
            // and no extension — which for a raw upload means the CDN serves
            // it as application/octet-stream, so a PDF downloads as a nameless
            // blob instead of opening in a tab. The extension is what makes
            // the content type right, and the name is what makes the link
            // recognisable to whoever receives it.
            use_filename: true,
            unique_filename: true,
          },
          (err, res) => (err ? reject(err) : resolve(res)),
        );
        stream.end(buffer);
      });
      if (result?.secure_url) {
        return {
          url: result.secure_url,
          storageKey: result.public_id || result.secure_url,
          provider: "cloudinary",
          resourceType: result.resource_type || "image",
          private: wantsPrivate,
        };
      }
    } catch (err) {
      console.warn("Cloudinary upload failed, trying the next provider:", err);
    }
  }

  if (localDiskIsDurable()) {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), buffer);
      const apiBase = process.env.API_BASE_URL || "";
      return {
        url: `${apiBase}/api/uploads/${filename}`,
        storageKey: filename,
        provider: "local-disk",
      };
    } catch (err) {
      console.warn("Disk write failed, falling back to an inline data URI:", err);
    }
  }

  if (isImage && buffer.length <= MAX_INLINE_BYTES) {
    console.warn(
      "No durable file storage is configured — inlining this image into the database. " +
      "Set BLOB_READ_WRITE_TOKEN or CLOUDINARY_URL so uploads are stored externally.",
    );
    return {
      url: `data:${mimeType};base64,${buffer.toString("base64")}`,
      storageKey: `inline-${filename}`,
      provider: "inline-base64",
    };
  }

  throw new Error(
    "No file storage is available. Configure BLOB_READ_WRITE_TOKEN or CLOUDINARY_URL to accept uploads of this type.",
  );
}

/**
 * Build a delivery URL for a privately-stored file.
 *
 * Only ever called after the caller has established that this person is
 * entitled to the file — the signature is the second half of that decision,
 * not a substitute for it. Returns null when the object was not stored
 * privately or Cloudinary is not configured, so callers fall back to whatever
 * URL was recorded at the time.
 *
 * `downloadAs` adds the attachment flag, which makes the browser save the file
 * under the name it was sent with instead of the id it is stored under. The
 * flag is part of what gets signed, so the two URLs are minted separately
 * rather than one being edited into the other.
 */
export function signedMediaUrl(options: {
  storageKey: string | null | undefined;
  resourceType?: string | null;
  downloadAs?: string | null;
}): string | null {
  const { storageKey } = options;
  if (!storageKey || !process.env.CLOUDINARY_URL) return null;

  try {
    const flags = options.downloadAs
      ? `attachment:${options.downloadAs.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80)}`
      : undefined;

    return cloudinary.url(storageKey, {
      resource_type: options.resourceType || "image",
      type: "authenticated",
      sign_url: true,
      secure: true,
      ...(flags ? { flags } : {}),
    });
  } catch (err) {
    console.warn("Could not sign a media URL:", err);
    return null;
  }
}

/**
 * Remove stored files, best effort.
 *
 * Used when an account is deleted: "delete everything" has to mean the
 * uploads too, not just the rows that point at them. Failures are collected
 * rather than thrown, because a file that cannot be removed must not stop the
 * account itself from being deleted — the person asked to be gone, and leaving
 * them half-deleted because a CDN call timed out is the worse outcome.
 *
 * Returns what could not be removed so the caller can log it. Anything left
 * behind is unreachable in any case: nothing points at it once the rows are
 * gone.
 */
export async function deleteStoredFiles(
  keys: Array<{ storageKey: string; resourceType?: string | null }>,
): Promise<{ deleted: number; failed: string[] }> {
  if (!process.env.CLOUDINARY_URL || keys.length === 0) {
    return { deleted: 0, failed: [] };
  }

  let deleted = 0;
  const failed: string[] = [];

  await Promise.all(keys.map(async ({ storageKey, resourceType }) => {
    if (!storageKey || storageKey.startsWith("http") || storageKey.startsWith("inline-")) return;
    try {
      // Attachments are stored as authenticated objects, so the delivery type
      // has to be named for the destroy call to find them.
      await cloudinary.uploader.destroy(storageKey, {
        resource_type: resourceType || "image",
        type: "authenticated",
        invalidate: true,
      });
      deleted += 1;
    } catch {
      try {
        await cloudinary.uploader.destroy(storageKey, {
          resource_type: resourceType || "image",
          invalidate: true,
        });
        deleted += 1;
      } catch (err: any) {
        failed.push(`${storageKey}: ${err?.message || "unknown"}`);
      }
    }
  }));

  return { deleted, failed };
}
