import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "dist/",
                "tests/",
                "bin/",
                "coverage/",
                "**/*.config.ts",
            ],
            include: ["src/**/*.ts"],
        },
        include: ["tests/**/*.test.ts"],
        exclude: ["node_modules", "dist", "coverage"],
    },
});
