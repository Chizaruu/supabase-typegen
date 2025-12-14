#!/usr/bin/env node

/**
 * CLI entry point for Supabase Type Generator
 */

import { generateTypes } from "../generator.js";

try {
    generateTypes();
} catch (error) {
    console.error("Error generating types:", error);
    process.exit(1);
}
