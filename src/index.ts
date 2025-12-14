/**
 * Main entry point for Supabase Type Generator
 */

export * from "./types/index.ts";
export * from "./config/constants.ts";
export * from "./utils/logger.ts";
export * from "./utils/naming.ts";
export * from "./parsers/sql-file-parser.ts";

// Main generator function will be exported here
export { generateTypes } from "./generator.ts";
