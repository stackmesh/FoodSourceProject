import { config } from "dotenv";

config();
await import("../src/server/contact-management.test.ts");
console.log("contact management checks passed");
