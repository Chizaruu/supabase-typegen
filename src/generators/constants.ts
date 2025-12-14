/**
 * Runtime constants generation for enums
 */

import type { EnumDefinition, NamingConvention } from "../types/index.ts";
import { convertCase } from "../utils/naming.ts";

export function generateConstants(
    enumsBySchema: Record<string, EnumDefinition[]>,
    allSchemas: Set<string>,
    convention: NamingConvention,
    indentSize: number = 2
): string {
    const indent = " ".repeat(indentSize);
    const schemaConstants: string[] = [];

    for (const schemaName of Array.from(allSchemas).sort()) {
        const schemaEnums = enumsBySchema[schemaName] || [];

        if (schemaEnums.length === 0) {
            // Empty schema - just empty Enums object
            schemaConstants.push(`${indent}${schemaName}: {
${indent.repeat(2)}Enums: {},
${indent}}`);
        } else {
            // Schema has enums
            const enumConstants = schemaEnums.map((enumDef) => {
                const enumName = convertCase(enumDef.name, convention);
                const values = enumDef.values.map((v) => `"${v}"`).join(", ");
                return `${indent.repeat(3)}${enumName}: [${values}]`;
            });

            schemaConstants.push(`${indent}${schemaName}: {
${indent.repeat(2)}Enums: {
${enumConstants.join(",\n")}
${indent.repeat(2)}},
${indent}}`);
        }
    }

    return `
// ============================================================================
// Constants - Runtime Enum Values
// ============================================================================
// Use these for dropdowns, validation, and type guards

export const Constants = {
${schemaConstants.join(",\n")}
} as const
`;
}
