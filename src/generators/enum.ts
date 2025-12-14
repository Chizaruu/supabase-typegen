/**
 * Enum type generation
 */

import type { EnumDefinition, NamingConvention } from "../types/index.js";
import { convertCase } from "../utils/naming.js";

export function generateEnumTypes(
    enums: EnumDefinition[],
    convention: NamingConvention,
    indentSize: number = 2
): string {
    if (enums.length === 0) {
        return "";
    }

    const indent = " ".repeat(indentSize);

    const enumDefs = enums.map((e) => {
        const enumName = convertCase(e.name, convention);
        const values = e.values.map((v) => `"${v}"`).join(" | ");
        return `${indent.repeat(3)}${enumName}: ${values}`;
    });

    return enumDefs.join("\n");
}
