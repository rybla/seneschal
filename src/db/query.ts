/**
 * This module contains all database queries.
 */

import db from "@/db";
import { documentsTable, entitiesTable, type InsertDocument, type InsertEntity, type InsertRelation, relationsTable, type SelectDocument, type SelectEntity, type SelectRelation } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Creates a new document in the database.
 * @param data The document data to insert.
 * @returns The created document.
 */
export async function createDocument(data: InsertDocument): Promise<SelectDocument> {
    const [document] = await db.insert(documentsTable).values(data).returning();
    if (!document) throw new Error("Failed to create document");
    return document;
}

/**
 * Retrieves a document by its path.
 * @param path The absolute path to the document.
 * @returns The document if found, otherwise undefined.
 */
export async function getDocumentByPath(path: string): Promise<SelectDocument | undefined> {
    const document = await db.query.documentsTable.findFirst({
        where: eq(documentsTable.path, path),
    });
    return document;
}

/**
 * Creates a new entity in the database.
 * @param data The entity data to insert.
 * @returns The created entity.
 */
export async function createEntity(data: InsertEntity): Promise<SelectEntity> {
    const [entity] = await db.insert(entitiesTable).values(data).returning();
    if (!entity) throw new Error("Failed to create entity");
    return entity;
}

/**
 * Creates a new relation in the database.
 * @param data The relation data to insert.
 * @returns The created relation.
 */
export async function createRelation(data: InsertRelation): Promise<SelectRelation> {
    const [relation] = await db.insert(relationsTable).values(data).returning();
    if (!relation) throw new Error("Failed to create relation");
    return relation;
}