/**
 * Composite type definition parsing from SQL
 */

import type { CompositeTypeDefinition } from "../../types/index.js";

export function parseCompositeType(
    sqlContent: string,
    schema: string = "public"
): CompositeTypeDefinition | null {
    // First, match the beginning of the type definition
    const typeStartMatch = sqlContent.match(
        /create\s+type\s+(?:(?:"([^"]+)"|'([^']+)'|(\w+))\.)?(?:"([^"]+)"|'([^']+)'|(\w+))\s+as\s*\(/i
    );

    if (!typeStartMatch) {
        return null;
    }

    // Schema can be in groups 1 (double quoted), 2 (single quoted), or 3 (unquoted)
    const typeSchema =
        typeStartMatch[1] || typeStartMatch[2] || typeStartMatch[3] || schema;
    // Type name can be in groups 4 (double quoted), 5 (single quoted), or 6 (unquoted)
    const typeName =
        typeStartMatch[4] || typeStartMatch[5] || typeStartMatch[6];

    // Find the balanced closing parenthesis
    const startPos = typeStartMatch.index! + typeStartMatch[0].length;
    let depth = 1;
    let endPos = startPos;

    for (let i = startPos; i < sqlContent.length; i++) {
        if (sqlContent[i] === "(") {
            depth++;
        } else if (sqlContent[i] === ")") {
            depth--;
            if (depth === 0) {
                endPos = i;
                break;
            }
        }
    }

    if (depth !== 0) {
        return null; // Unbalanced parentheses
    }

    const attrsStr = sqlContent.substring(startPos, endPos);
    const attributes: Array<{ name: string; type: string }> = [];

    // Split by commas that are not inside parentheses
    const lines: string[] = [];
    let current = "";
    depth = 0;

    for (let i = 0; i < attrsStr.length; i++) {
        const char = attrsStr[i];
        if (char === "(") {
            depth++;
            current += char;
        } else if (char === ")") {
            depth--;
            current += char;
        } else if (char === "," && depth === 0) {
            lines.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        lines.push(current);
    }

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Updated regex to capture attribute names (quoted or unquoted) and their types
        // Handles: "first-name" text, first_name text, 'last-name' text
        const attrMatch = trimmed.match(
            /(?:"([^"]+)"|'([^']+)'|([\w-]+))\s+([\w\s[\](),.]+)/i
        );

        if (attrMatch) {
            // Attribute name can be in groups 1 (double quoted), 2 (single quoted), or 3 (unquoted)
            const attrName = attrMatch[1] || attrMatch[2] || attrMatch[3];
            attributes.push({
                name: attrName,
                type: attrMatch[4].trim(),
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
