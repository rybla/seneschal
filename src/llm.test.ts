import { mock } from "bun:test";
import * as llm from "@/llm";

mock.module("@/llm", () => ({
  ...llm,
  classifyDocument: mock(async (text: string) => {
    if (text.includes("Test Company 2")) {
      return "COMPANY";
    }
    return "GENERIC";
  }),
  extractEntitiesAndRelations: mock(async (text: string) => {
    if (text.includes("Test Company 2")) {
      return {
        entities: [
          {
            name: "Test Company 2",
            type: "COMPANY",
            description: "A test company",
          },
          {
            name: "Test City 2",
            type: "LOCATION",
            description: "Headquarters of Test Company 2",
          },
        ],
        relations: [
          {
            source: "Test Company 2",
            target: "Test City 2",
            type: "HAS_HEADQUARTERS",
            description: "Test Company 2 is headquartered in Test City 2",
          },
        ],
      };
    }
    return { entities: [], relations: [] };
  }),
  extractStructuredMetadata: mock(async (text: string) => {
    if (text.includes("Test Company 2")) {
      return {
        companyName: "Test Company 2",
        headquartersLocation: "Test City 2",
      };
    }
    return null;
  }),
}));
