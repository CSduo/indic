import { vi } from "vitest";
import { createMockDb } from "./db-mock";

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.FRONTEND_URL = "https://anvikshikijournal.in";

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<any>();
  const mockDb = createMockDb();
  return {
    ...actual,
    db: mockDb,
    ensureDatabaseSchema: vi.fn().mockResolvedValue(true),
    coreTablesExist: vi.fn().mockResolvedValue(true),
  };
});

vi.mock("../../artifacts/api-server/src/lib/publication-sync", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    ensureDefaultCategories: vi.fn().mockResolvedValue(true),
  };
});
