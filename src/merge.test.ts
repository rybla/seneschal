import { describe, expect, test } from "bun:test";
import { hc } from "hono/client";
import {
  createEntity,
  createRelation,
  getAllEntities,
  mergeEntities,
} from "./db/query";
import { app, type AppType } from "./server";

const client = hc<AppType>("http://localhost", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    app.request(input, init),
});

describe("Node Merging Workflow", () => {
  // Setup: We need to ensure the DB is in a clean state or use a test DB.
  // For this environment, we might be running against the dev DB.
  // Let's create unique entities to avoid collision.

  const timestamp = Date.now();

  // Better: Helper to create entities
  async function createTestEntity(name: string, type: string) {
    const entity = await createEntity({
      name,
      type,
      description: "Test entity for merging",
      metadata: {},
    });
    return entity;
  }

  test("Database: mergeEntities should move relations and delete loser", async () => {
    const winner = await createTestEntity(`Winner_${timestamp}`, "TEST");
    const loser = await createTestEntity(`Loser_${timestamp}`, "TEST");
    const target = await createTestEntity(`Target_${timestamp}`, "TEST");

    // Create relation: Loser -> Target
    await createRelation({
      sourceEntityId: loser.id,
      targetEntityId: target.id,
      type: "TEST_RELATION",
      description: "To be moved",
      properties: {},
    });

    // Merge
    await mergeEntities(winner.id, loser.id);

    // Verify Loser is gone
    const all = await getAllEntities();
    const loserExists = all.find((e) => e.id === loser.id);
    expect(loserExists).toBeUndefined();

    // Verify Winner exists
    const winnerExists = all.find((e) => e.id === winner.id);
    expect(winnerExists).toBeDefined();
  });

  test("API: /api/merge-nodes should find and merge duplicates", async () => {
    // Create two very similar entities
    const name = `DuplicateEntity_${timestamp}`;
    const e1 = await createTestEntity(name, "TEST_DUP");
    const e2 = await createTestEntity(name, "TEST_DUP"); // Exact same name should match

    // helper to hit the API
    const res = await client.api["merge-nodes"].$post();
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      success: boolean;
      mergedPairs: Array<{ winner: string; loser: string }>;
    };
    expect(body.success).toBe(true);

    // We expect at least one merge (e1 and e2)
    const pairs = body.mergedPairs;
    const ourMerge = pairs.find(
      (p) =>
        (p.winner === String(e1.id) && p.loser === String(e2.id)) ||
        (p.winner === String(e2.id) && p.loser === String(e1.id)),
    );

    expect(ourMerge).toBeDefined();
  });
});
