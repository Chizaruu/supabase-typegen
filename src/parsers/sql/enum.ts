/**
 * Enum definition parsing from SQL
 */

import type { EnumDefinition } from "../../types/index.js";

export function parseEnumDefinition(
    sqlContent: string,
    schema: string = "public"
): EnumDefinition | null {
    const enumMatch = sqlContent.match(
        /create\s+type\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s+as\s+enum\s*\(([\s\S]*?)\)/i
    );

    if (!enumMatch) {
        return null;
    }

    const enumSchema = enumMatch[1] || schema;
    const enumName = enumMatch[2];
    const valuesStr = enumMatch[3];

    const values: string[] = [];
    const valueMatches = valuesStr.matchAll(/['"]([^'"]+)['"]/g);
    for (const match of valueMatches) {
        values.push(match[1]);
    }

    if (values.length === 0) {
        return null;
    }

    return {
        schema: enumSchema,
        name: enumName,
        values,
    };
}
