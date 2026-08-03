from __future__ import annotations

import hashlib
from pathlib import Path

from pypdf import PdfReader


PDF_PATH = Path(r"C:\Users\ADMIN\Downloads\The Human Tapestry of the Slave Trade (1).pdf")


reader = PdfReader(PDF_PATH)
print(f"pages={len(reader.pages)}")

seen: set[str] = set()
for page_number, page in enumerate(reader.pages, start=1):
    entries: list[str] = []
    for image_number, image in enumerate(page.images, start=1):
        digest = hashlib.sha256(image.data).hexdigest()[:12]
        duplicate = digest in seen
        seen.add(digest)
        try:
            width, height = image.image.size
        except Exception:
            width, height = 0, 0
        entries.append(
            f"{image_number}:{image.name}:{width}x{height}:{len(image.data)}:{digest}"
            + (":duplicate" if duplicate else "")
        )
    print(f"page={page_number} images={len(entries)} {' | '.join(entries)}")

print(f"unique_images={len(seen)}")
