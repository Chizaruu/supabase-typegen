/**
 * Naming convention conversion utilities
 */

import type { NamingConvention } from "../types/index.ts";

export function convertCase(str: string, convention: NamingConvention): string {
    if (convention === "preserve") {
        return str;
    }

    const words = str
        .replace(/([a-z])([A-Z])/g, "$1_$2")
        .toLowerCase()
        .split("_")
        .filter((w) => w.length > 0);

    switch (convention) {
        case "PascalCase":
            return words
                .map(
                    (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                )
                .join("");
        case "camelCase":
            return words
                .map((w, i) =>
                    i === 0
                        ? w.toLowerCase()
                        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                )
                .join("");
        case "snake_case":
            return words.map((w) => w.toLowerCase()).join("_");
        case "SCREAMING_SNAKE_CASE":
            return words.map((w) => w.toUpperCase()).join("_");
        default:
            return str;
    }
}
