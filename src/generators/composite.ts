/**
 * Composite type generation
 */

import type {
    CompositeTypeDefinition,
    NamingConvention,
} from "../types/index.js";
import { convertCase } from "../utils/naming.js";

export function generateCompositeTypes(
    types: CompositeTypeDefinition[],
    convention: NamingConvention,
    indentSize: number = 2
): string {
    if (types.length === 0) {
        return "";
    }

    const indent = " ".repeat(indentSize);

    const typeDefs = types.map((t) => {
        const typeName = convertCase(t.name, convention);
        const attrs = t.attributes.map((a) => {
            const attrName = convertCase(a.name, convention);
            return `${indent.repeat(4)}${attrName}: ${a.type}`;
        });
        return `${indent.repeat(3)}${typeName}: {\n${attrs.join(
            "\n"
        )}\n${indent.repeat(3)}}`;
    });

    return typeDefs.join("\n");
}
