import { describe, it, expect, mock, beforeEach } from "bun:test";
import { app } from "@/server";
import db from "@/db";
import * as schema from "@/db/schema";
import * as linkup from "@/linkup";
import {
  createEntity,
  createRelation,
  getAllDocuments,
  getAllEntities,
  getAllRelations,
} from "@/db/query";

// Set the database to be in-memory for tests
process.env.DATABASE_URL = "sqlite::memory:";

mock.module("@/linkup", () => ({
  ...linkup,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchLinkup: mock(async (query: string, _: Record<string, unknown>) => {
    if (query.includes("Test Company 2")) {
      return {
        companyName: "Test Company 2",
        headquartersLocation: "Test City 2",
      };
    }
    return null;
  }),
}));

describe("Server API", () => {
  beforeEach(async () => {
    // Clear the database before each test
    await db.delete(schema.relationsTable);
    await db.delete(schema.entitiesTable);
    await db.delete(schema.documentsTable);
  });

  it("should saturate the database with missing information", async () => {
    // 1. Seed the database
    const company1 = await createEntity({
      name: "Test Company 1",
      type: "COMPANY",
    });
    const location1 = await createEntity({
      name: "Test City 1",
      type: "LOCATION",
    });
    await createRelation({
      sourceEntityId: company1.id,
      targetEntityId: location1.id,
      type: "HAS_HEADQUARTERS",
    });

    const company2 = await createEntity({
      name: "Test Company 2",
      type: "COMPANY",
    });

    // To create a "common pattern", we need at least two instances.
    const company3 = await createEntity({
      name: "Test Company 3",
      type: "COMPANY",
    });
    const location3 = await createEntity({
      name: "Test City 3",
      type: "LOCATION",
    });
    await createRelation({
      sourceEntityId: company3.id,
      targetEntityId: location3.id,
      type: "HAS_HEADQUARTERS",
    });

    // 2. Make the request to the endpoint
    const res = await app.request("/api/saturate-database", {
      method: "POST",
    });
    const { success, saturatedCount } = await res.json();

    // 3. Assert the response
    expect(res.status).toBe(200);
    expect(success).toBe(true);
    expect(saturatedCount).toBe(1);

    // 4. Assert the database state
    const documents = await getAllDocuments();
    expect(documents.length).toBe(1);
    expect(documents[0]?.sourceType).toBe("SEARCH");

    const entities = await getAllEntities();
    const relations = await getAllRelations();

    const location2 = entities.find((e) => e.name === "Test City 2");
    expect(location2).toBeDefined();

    const newRelation = relations.find(
      (r) =>
        r.sourceEntityId === company2.id &&
        r.targetEntityId === location2!.id &&
        r.type === "HAS_HEADQUARTERS",
    );
    expect(newRelation).toBeDefined();
  });
});
