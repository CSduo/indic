// Vercel serverless entry point — plain CommonJS with dynamic import.
//
// WHY THIS FILE IS .js AND NOT .ts:
// Vercel compiles TypeScript files to CommonJS and injects `exports` boilerplate.
// That boilerplate crashes when the file is marked as ESM. By using plain .js
// here, Vercel skips TypeScript compilation entirely.
//
// WHY DYNAMIC import() INSTEAD OF require():
// Our Express bundle (vercel-handler.mjs) is a native ES Module (.mjs).
// CommonJS `require()` cannot load .mjs files — but dynamic `import()` can,
// because it works in both CommonJS and ESM contexts.

let _app;

module.exports = async (req, res) => {
  if (!_app) {
    const mod = await import("../artifacts/api-server/dist/vercel-handler.mjs");
    _app = mod.default;
  }
  _app(req, res);
};
