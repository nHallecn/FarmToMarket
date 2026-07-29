import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL?.trim();
const schemaOnlyCommand = process.argv.some((argument) =>
  ["generate", "validate", "format"].includes(argument),
);

if (!databaseUrl && !schemaOnlyCommand) {
  throw new Error(
    "DATABASE_URL is required for Prisma database commands. Copy .env.example to .env.local or configure the deployment secret.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    // Prisma still parses a datasource during client generation, but generate
    // never connects. Runtime database access remains strict in src/server/db.
    url:
      databaseUrl ??
      "postgresql://generate:generate@127.0.0.1:5432/farmtomarket?schema=public",
  },
});
