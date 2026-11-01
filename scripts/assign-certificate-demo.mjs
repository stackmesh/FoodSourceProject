import { config } from "dotenv";
import pg from "pg";
import { suppliers } from "../prisma/seed.ts";

config();

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const client = new pg.Client({ connectionString });
await client.connect();

let updated = 0;
try {
  await client.query("BEGIN");
  for (const supplier of suppliers) {
    for (const cert of supplier.certs) {
      const expiresAt =
        typeof cert.expiresInDays === "number" ? new Date(Date.now() + cert.expiresInDays * 86_400_000) : null;
      const result = await client.query(
        `UPDATE "Certification" AS cert
         SET "certificateStatus" = $3::"CertificateStatus",
             "verificationStatus" = 'UNVERIFIED',
             "verifiedAt" = NULL,
             "verifiedBy" = NULL,
             "certificateNumber" = NULL,
             "expiresAt" = $4,
             "isDemo" = true
         FROM "Supplier" AS supplier
         WHERE supplier."id" = cert."supplierId"
           AND supplier."slug" = $1
           AND cert."name" = $2`,
        [supplier.slug, cert.name, cert.certificateStatus, expiresAt],
      );
      if (result.rowCount !== 1) {
        throw new Error(`Certificate was not updated: ${supplier.slug} / ${cert.name}`);
      }
      updated += result.rowCount;
    }
  }
  const check = await client.query(`
    SELECT
      count(*) FILTER (WHERE supplier."dataType" = 'DEMO')::int AS demo,
      count(*) FILTER (
        WHERE supplier."dataType" = 'DEMO'
          AND cert."isDemo" = true
          AND cert."verificationStatus" = 'UNVERIFIED'
          AND cert."verifiedAt" IS NULL
          AND cert."certificateNumber" IS NULL
      )::int AS demo_unverified,
      count(*) FILTER (WHERE cert."verificationStatus" = 'VERIFIED')::int AS verified
    FROM "Certification" AS cert
    JOIN "Supplier" AS supplier ON supplier."id" = cert."supplierId"
  `);
  await client.query("COMMIT");
  console.log(JSON.stringify({ updated, ...check.rows[0] }));
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
