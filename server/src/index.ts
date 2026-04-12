import "dotenv/config";
import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? "8000");
const host = process.env.HOST ?? "0.0.0.0";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required (PostgreSQL connection string).");
    process.exit(1);
  }

  const app = await buildApp();
  try {
    await app.listen({ port, host });
    console.log(`AccessAI Node API listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
