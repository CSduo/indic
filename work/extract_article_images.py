from __future__ import annotations

import hashlib
from pathlib import Path

from pypdf import PdfReader


PDF_PATH = Path(r"C:\Users\ADMIN\Downloads\The Human Tapestry of the Slave Trade (1).pdf")
OUTPUT_DIR = Path(
    r"C:\Users\ADMIN\Documents\Codex\2026-07-15\csduo-indic-https-github-com-csduo"
) / "artifacts" / "anvikshiki" / "public" / "images" / "legacy" / "the-transatlantic-slave-trade-4e607526"


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
reader = PdfReader(PDF_PATH)
seen: set[str] = set()
written = 0

for page in reader.pages:
    for image in page.images:
        digest = hashlib.sha256(image.data).hexdigest()
        if digest in seen:
            continue
        seen.add(digest)
        written += 1
        destination = OUTPUT_DIR / f"{written:02d}.jpg"
        destination.write_bytes(image.data)
        width, height = image.image.size
        print(f"{destination.name} {width}x{height} {len(image.data)} bytes")

if written != 16:
    raise SystemExit(f"Expected 16 unique images, extracted {written}")
