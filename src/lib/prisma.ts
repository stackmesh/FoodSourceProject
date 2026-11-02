import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import fs from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env before querying the database.",
    );
  }

  // const ca = process.env.PG_SSL_CA?.replace(/\\n/g, "\n");
  const caPath = path.join(process.cwd(), "certs", "ca.pem");
  // const adapter = new PrismaPg({ connectionString });
  const adapter = new PrismaPg({connectionString,
  ssl:{
        ca: fs.readFileSync(caPath, "utf8"),
        rejectUnauthorized: true,
      }
  });

  return new PrismaClient({ adapter });
}

export function getPrisma() {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}
