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
}): Promise<StoredFile> {
  const { buffer, filename, mimeType, folder } = options;
  const extension = path.extname(filename).toLowerCase();
  const isAudio =
    mimeType.startsWith("audio/") ||
    [".webm", ".mp3", ".ogg", ".wav", ".m4a"].includes(extension);
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
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
