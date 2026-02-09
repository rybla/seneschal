
import { describe, expect, test } from "bun:test";
import { join } from "path";

describe("Document Ingestion", () => {
    test("should upload and ingest a pdf document", async () => {
        const formData = new FormData();
        const uniqueName = `sample-${Date.now()}.pdf`;
        const filePath = join(import.meta.dir, `../../test-assets/${uniqueName}`);

        // ensure sample pdf exists or create a dummy one
        const samplePdfPath = filePath;
        const dummyPdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 100 100 Td (Hello World) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000251 00000 n \n0000000339 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n433\n%%EOF";

        await Bun.write(samplePdfPath, dummyPdfContent);

        const file = Bun.file(samplePdfPath);
        formData.append("file", file);

        const { app } = await import("../server");
        const res = await app.request("http://localhost/api/ingest", {
            method: "POST",
            body: formData,
        });

        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.documentId).toBeDefined();
        expect(json.entityId).toBeDefined();

        // Clean up
        // await Bun.write(samplePdfPath, ""); // maybe keep it for debug
    });
});
