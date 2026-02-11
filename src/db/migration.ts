import db from "./index";
import { migrate } from "drizzle-orm/libsql/migrator";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "./drizzle" });
}
