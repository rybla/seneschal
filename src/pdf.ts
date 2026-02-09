// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse");

/**
 * Extracts text from a PDF buffer.
 * @param buffer The PDF file buffer.
 * @returns The extracted text.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
}
