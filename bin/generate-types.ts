#!/usr/bin/env node

/**
 * CLI entry point for Supabase Type Generator
 */

import { generateTypes } from "../src/generator.ts";

try {
    generateTypes();
} catch (error) {
    console.error("Error generating types:", error);
    process.exit(1);
}
