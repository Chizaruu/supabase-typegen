/**
 * Function type generation
 */

import type { FunctionDefinition, NamingConvention } from "../types/index.js";
import { convertCase } from "../utils/naming.js";
import { mapPostgresTypeToTypeScript } from "../utils/type-mapping.js";

export function generateFunctionTypes(
    functions: FunctionDefinition[],
    convention: NamingConvention,
    indentSize: number = 2,
    availableEnums: Set<string> = new Set(),
    schema: string = "public",
    useGeometricTypes: boolean = false,
    alphabetical: boolean = false
): string {
    if (functions.length === 0) {
        return "";
    }

    const indent = " ".repeat(indentSize);

    const funcDefs = functions.map((f) => {
        const funcName = convertCase(f.name, convention);

        // Generate Args object
        let argsStr = "";
        if (f.args.length === 0) {
            argsStr = " never";
        } else {
            // Sort args alphabetically if requested
            const sortedArgs = alphabetical
                ? [...f.args].sort((a, b) => a.name.localeCompare(b.name))
                : f.args;

            const argProps = sortedArgs.map((arg) => {
                const argName = convertCase(arg.name, convention);
                const tsType = mapPostgresTypeToTypeScript(
                    arg.type,
                    arg.type.includes("[]"),
                    schema,
                    availableEnums,
                    useGeometricTypes
                );
                const optional = arg.hasDefault ? "?" : "";
                return `${indent.repeat(5)}${argName}${optional}: ${tsType}`;
            });
            argsStr = `\n${argProps.join("\n")}\n${indent.repeat(4)}`;
        }

        // Map return type
        const returnsType = mapPostgresTypeToTypeScript(
            f.returns,
            f.returns.includes("[]"),
            schema,
            availableEnums,
            useGeometricTypes
        );

        // Format as one-liner if no arguments or single argument
        if (argsStr === " never") {
            return `${indent.repeat(
                3
            )}${funcName}: { Args: never; Returns: ${returnsType} }`;
        }

        // Check if it's a single argument (no newlines in argsStr)
        const argLines = argsStr
            .trim()
            .split("\n")
            .filter((line) => line.trim());
        if (argLines.length === 1) {
            // Single argument - one liner with proper spacing
            return `${indent.repeat(
                3
            )}${funcName}: { Args: { ${argsStr.trim()} }; Returns: ${returnsType} }`;
        }

        // Multiple arguments - multi-line
        return `${indent.repeat(3)}${funcName}: {
${indent.repeat(4)}Args: {${argsStr}}
${indent.repeat(4)}Returns: ${returnsType}
${indent.repeat(3)}}`;
    });

    return funcDefs.join("\n");
}
