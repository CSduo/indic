import path from "node:path";

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  return bytes.every((value, index) => buffer[index] === value);
}

export function hasExpectedFileSignature(file: {
  originalname: string;
  buffer: Buffer;
}): boolean {
  const ext = path.extname(file.originalname).toLowerCase();
  const b = file.buffer;
  if (!b.length) return false;

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return startsWith(b, [0xff, 0xd8, 0xff]);
    case ".png":
      return startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case ".gif":
      return b.subarray(0, 6).toString("ascii") === "GIF87a" || b.subarray(0, 6).toString("ascii") === "GIF89a";
    case ".webp":
      return b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP";
    case ".pdf":
      return b.subarray(0, 5).toString("ascii") === "%PDF-";
    case ".docx":
      return startsWith(b, [0x50, 0x4b, 0x03, 0x04]);
    case ".doc":
      return startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case ".txt":
      return !b.includes(0);
    case ".ogg":
      return b.subarray(0, 4).toString("ascii") === "OggS";
    case ".wav":
      return b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WAVE";
    case ".webm":
      return startsWith(b, [0x1a, 0x45, 0xdf, 0xa3]);
    case ".mp3":
    case ".mpeg":
      return b.subarray(0, 3).toString("ascii") === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
    case ".m4a":
    case ".mp4":
      return b.subarray(4, 8).toString("ascii") === "ftyp";
    default:
      return false;
  }
}
