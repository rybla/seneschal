import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import z from "zod";

// -----------------------------------------------------------------------------

export type InsertUser = typeof userTable.$inferInsert;
export type SelectUser = typeof userTable.$inferSelect;

export const userTable = sqliteTable("userTable", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull().unique(),
    age: int().notNull(),
    email: text().notNull().unique(),
});

export const InsertUserSchema = z.object({
    name: z.string(),
    age: z.number(),
    email: z.string(),
});

