/**
 * Composite type definition parsing from SQL
 */

import type { CompositeTypeDefinition } from "../../types/index.ts";

export function parseCompositeType(
    sqlContent: string,
    schema: string = "public"
): CompositeTypeDefinition | null {
    const typeMatch = sqlContent.match(
        /create\s+type\s+(?:["']?(\w+)["']?\.)?["']?(\w+)["']?\s+as\s*\(([\s\S]*?)\)/i
    );

    if (!typeMatch) {
        return null;
    }

    const typeSchema = typeMatch[1] || schema;
    const typeName = typeMatch[2];
    const attrsStr = typeMatch[3];

    const attributes: Array<{ name: string; type: string }> = [];
    const lines = attrsStr.split(",");

    for (const line of lines) {
        const trimmed = line.trim();
        const attrMatch = trimmed.match(/["']?(\w+)["']?\s+([\w\s[\]()]+)/i);

        if (attrMatch) {
            attributes.push({
                name: attrMatch[1],
                type: attrMatch[2].trim(),
            });
        }
    }

    if (attributes.length === 0) {
        return null;
    }

    return {
        schema: typeSchema,
        name: typeName,
        attributes,
    };
}
