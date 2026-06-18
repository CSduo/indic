---
name: bcryptjs in Replit sandbox
description: Native bcrypt bindings fail in Replit; use bcryptjs everywhere.
---

## Rule

Always use `bcryptjs` (pure JavaScript) instead of `bcrypt` (native binding) in this project.

**Why:** The Replit sandbox cannot build or load native Node.js addons (`bcrypt_lib.node`). Running `bcrypt` throws `MODULE_NOT_FOUND` for the native binding at startup.

**How to apply:** 
- Import: `import bcrypt from "bcryptjs"`
- Package: `"bcryptjs": "^2.x"` in dependencies (not `bcrypt`)
- Applies to both `artifacts/api-server` and `scripts` packages.
- The API surface is identical to bcrypt (`.hash`, `.compare`, `.genSalt`), so no code changes beyond the import/dep name.
