#!/usr/bin/env node
/**
 * scripts/deploy-google-service-account.mjs
 *
 * Sophisticated Google Service Account CLI for Ānvīkṣikī Journal & Vercel.
 * Validates, formats, and safely deploys Google Service Account credentials
 * to Vercel Production Environment Variables without escaping corruption.
 *
 * Usage:
 *   # Validate a JSON file and inspect formatting
 *   node scripts/deploy-google-service-account.mjs <path-to-service-account.json>
 *
 *   # Directly push to Vercel Production
 *   node scripts/deploy-google-service-account.mjs <path-to-service-account.json> --apply
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync, spawnSync } from "child_process";

const args = process.argv.slice(2);
const shouldApply = args.includes("--apply");
const fileArg = args.find((a) => !a.startsWith("--"));

console.log("\n============================================================");
console.log("   Ānvīkṣikī Journal - Google Service Account Manager");
console.log("============================================================\n");

if (!fileArg) {
  console.log("Usage:");
  console.log("  node scripts/deploy-google-service-account.mjs <path-to-json-file> [--apply]\n");
  console.log("Options:");
  console.log("  --apply    Automatically add GOOGLE_SERVICE_ACCOUNT_KEY to Vercel production\n");
  process.exit(1);
}

const resolvedPath = path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(resolvedPath)) {
  console.error(`[-] Error: File not found at: ${resolvedPath}\n`);
  process.exit(1);
}

let rawContent = fs.readFileSync(resolvedPath, "utf-8").trim();

// Parse and validate JSON
let parsed = null;
try {
  parsed = JSON.parse(rawContent);
} catch (err) {
  console.error(`[-] Error: Invalid JSON in ${fileArg}: ${err.message}\n`);
  process.exit(1);
}

// Support wrapped envelope { credentials: { ... } }
if (parsed.credentials && typeof parsed.credentials === "object") {
  parsed = parsed.credentials;
}

const clientEmail = parsed.client_email;
const privateKey = parsed.private_key;
const projectId = parsed.project_id || "anvikshiki-journal";

if (!clientEmail || !clientEmail.includes("@")) {
  console.error("[-] Error: 'client_email' is missing or invalid in service account JSON.\n");
  process.exit(1);
}

if (!privateKey || !privateKey.includes("PRIVATE KEY")) {
  console.error("[-] Error: 'private_key' is missing or does not contain a PEM private key.\n");
  process.exit(1);
}

// Validate cryptographic RSA key
try {
  let cleanKey = privateKey.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  const keyObj = crypto.createPrivateKey(cleanKey);
  const exported = keyObj.export({ type: "pkcs8", format: "pem" }).toString();
  parsed.private_key = exported; // Ensure canonical clean PEM in parsed object
  console.log("[+] RSA Private Key successfully verified and cryptographically valid.");
} catch (err) {
  console.error(`[-] Error: Cryptographic validation of private key failed: ${err.message}\n`);
  process.exit(1);
}

const minifiedJson = JSON.stringify(parsed);
const base64Payload = Buffer.from(minifiedJson, "utf-8").toString("base64");

console.log("[+] Credentials Summary:");
console.log(`    Project ID:   ${projectId}`);
console.log(`    Client Email: ${clientEmail}`);
console.log(`    Payload Size: ${minifiedJson.length} bytes (Base64: ${base64Payload.length} chars)`);
console.log("");

if (shouldApply) {
  console.log("[*] Deploying GOOGLE_SERVICE_ACCOUNT_KEY to Vercel Production...");

  try {
    // Pipe the base64 payload into `npx vercel env add GOOGLE_SERVICE_ACCOUNT_KEY production`
    const result = spawnSync("npx", ["vercel", "env", "add", "GOOGLE_SERVICE_ACCOUNT_KEY", "production"], {
      input: base64Payload,
      encoding: "utf-8",
      shell: true,
      stdio: ["pipe", "inherit", "inherit"],
    });

    if (result.status === 0) {
      console.log("\n[+] SUCCESS! GOOGLE_SERVICE_ACCOUNT_KEY has been set in Vercel Production.");
      console.log("    To activate, trigger a new production deployment or redeploy current commit.\n");
    } else {
      console.warn("\n[!] Vercel CLI exited with status", result.status);
      console.log("    You can add it manually using one of the methods below.\n");
    }
  } catch (err) {
    console.error("[-] Error running Vercel CLI:", err.message);
  }
} else {
  console.log("------------------------------------------------------------");
  console.log(" Recommended Vercel Configuration Methods:");
  console.log("------------------------------------------------------------\n");

  console.log("METHOD 1: Automated Vercel CLI (Fastest & Safest)");
  console.log(`  node scripts/deploy-google-service-account.mjs "${fileArg}" --apply\n`);

  console.log("METHOD 2: Base64 string in Vercel Web Dashboard (Zero Escaping Issues)");
  console.log("  1. Go to: https://vercel.com/xiyatosaanvi-2995s-projects/anvikshiki-app/settings/environment-variables");
  console.log("  2. Add Key: GOOGLE_SERVICE_ACCOUNT_KEY");
  console.log("  3. Target: Production");
  console.log("  4. Paste this exact Base64 value:");
  console.log(`\n${base64Payload}\n`);

  console.log("METHOD 3: Individual Environment Variables");
  console.log("  Key: GOOGLE_CLIENT_EMAIL");
  console.log(`  Value: ${clientEmail}`);
  console.log("\n  Key: GOOGLE_PRIVATE_KEY");
  console.log("  Value (paste with headers):");
  console.log(`${parsed.private_key}`);
}

console.log("------------------------------------------------------------");
console.log(" CRITICAL GOOGLE SEARCH CONSOLE STEP:");
console.log("------------------------------------------------------------");
console.log(` 1. Open Google Search Console: https://search.google.com/search-console`);
console.log(` 2. Select property: https://anvikshikijournal.in`);
console.log(` 3. Navigate to: Settings -> Users and permissions -> Add user`);
console.log(` 4. Email address: ${clientEmail}`);
console.log(` 5. Permission: OWNER (Required by Google Indexing API)`);
console.log("------------------------------------------------------------\n");
