# Contributing to supabase-typegen

First off, thank you for considering contributing to supabase-typegen! It's people like you that make this tool better for everyone.

## 🎯 Ways to Contribute

-   🐛 **Report bugs** - Found a bug? Let us know!
-   💡 **Suggest features** - Have an idea? We'd love to hear it!
-   📝 **Improve documentation** - Help others understand the tool better
-   🔧 **Submit code** - Fix bugs or implement features
-   ✅ **Write tests** - Help improve code coverage
-   🌍 **Translate** - Help make the tool accessible to more people

## 🐛 Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

### Bug Report Template

````markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. SQL schema used: '...'
2. Command run: '...'
3. Error seen: '...'

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Environment:**

-   OS: [e.g., macOS 13.0]
-   Node version: [e.g., 18.16.0]
-   Package version: [e.g., 1.0.0]

**SQL Schema (if relevant)**

```sql
-- Your SQL that causes the issue
```
````

**Generated TypeScript (if relevant)**

```typescript
// The problematic generated code
```

**Additional context**
Any other context about the problem.

````

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is. Ex. I'm always frustrated when [...]

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**SQL Example**
```sql
-- Example SQL that should be supported
````

**Expected Generated TypeScript**

```typescript
// What the generated output should look like
```

**Use Case**
How would this feature benefit users?

**Additional context**
Any other context or screenshots.

````

## 🔧 Development Setup

### Prerequisites

- Node.js 18.x or higher
- pnpm (recommended) or npm
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/chizaruu/supabase-typegen.git
cd supabase-typegen

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test

# Link for local testing
pnpm link --global
````

## 🧪 Testing

We use Vitest for testing. Please ensure all tests pass before submitting a PR.

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test parsers/sql/table.test.ts
```

### Writing Tests

Tests should follow this structure:

```typescript
import { describe, it, expect } from "vitest";
import { parseTableDefinition } from "../src/parsers/sql/table";

describe("parseTableDefinition", () => {
    describe("basic tables", () => {
        it("should parse simple table with columns", () => {
            const sql = `
        CREATE TABLE users (
          id UUID PRIMARY KEY,
          email TEXT NOT NULL
        );
      `;

            const result = parseTableDefinition(sql, "public");

            expect(result).toMatchObject({
                name: "users",
                schema: "public",
                columns: [
                    { name: "id", type: "uuid", isPrimaryKey: true },
                    { name: "email", type: "text", nullable: false },
                ],
            });
        });
    });

    describe("edge cases", () => {
        it("should handle quoted identifiers", () => {
            // Test quoted table/column names
        });

        it("should handle schema-qualified names", () => {
            // Test schema.table syntax
        });
    });
});
```

See [TESTING.md](TESTING.md) for more examples, best practices, and debugging tips.

## 📝 Code Style

We use ESLint and Prettier to maintain code quality.

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

### Guidelines

-   Use TypeScript strict mode
-   Prefer `const` over `let`
-   Use meaningful variable names
-   Add JSDoc comments for public APIs
-   Keep functions small and focused
-   Avoid deep nesting (max 3 levels)

### Example

````typescript
/**
 * Parse a CREATE TABLE statement and extract table metadata
 *
 * @param sqlContent - The SQL CREATE TABLE statement
 * @param schema - The schema name (default: 'public')
 * @returns Parsed table definition or null if invalid
 *
 * @example
 * ```typescript
 * const result = parseTableDefinition('CREATE TABLE users (...)', 'public')
 * ```
 */
export function parseTableDefinition(
    sqlContent: string,
    schema: string = "public"
): TableDefinition | null {
    // Implementation
}
````

## 🔀 Pull Request Process

### Before You Start

1. **Check existing PRs** - Someone might already be working on it
2. **Create an issue** - Discuss the change before implementing
3. **Fork the repository** - Work in your own fork
4. **Create a branch** - Use a descriptive name

### PR Checklist

Before submitting your PR, ensure:

-   [ ] Code follows the project's code style
-   [ ] All tests pass (`pnpm test`)
-   [ ] Linting passes (`pnpm lint`)
-   [ ] Added tests for new functionality
-   [ ] Updated documentation if needed
-   [ ] Added examples if relevant
-   [ ] Commit messages follow conventions
-   [ ] PR description explains the change

### PR Template

````markdown
## Description

Brief description of what this PR does.

## Related Issue

Fixes #123

## Type of Change

-   [ ] Bug fix (non-breaking change which fixes an issue)
-   [ ] New feature (non-breaking change which adds functionality)
-   [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
-   [ ] Documentation update

## Testing

Describe the tests you added or how you tested the change.

## SQL Example

```sql
-- SQL that demonstrates the feature/fix
```
````

## Generated Output

```typescript
// Example of generated TypeScript
```

## Screenshots (if applicable)

## Checklist

-   [ ] My code follows the style guidelines
-   [ ] I have performed a self-review
-   [ ] I have commented my code, particularly in hard-to-understand areas
-   [ ] I have made corresponding changes to the documentation
-   [ ] My changes generate no new warnings
-   [ ] I have added tests that prove my fix is effective or that my feature works
-   [ ] New and existing unit tests pass locally with my changes

````

## 🏗️ Adding New Features

### Adding a New SQL Parser

1. **Create parser file**: `src/parsers/sql/your-feature.ts`

```typescript
import type { YourDefinition } from '../../types/index.js'

export function parseYourFeature(
    sqlContent: string,
    schema: string = 'public'
): YourDefinition | null {
    // Regex to match your SQL construct
    const match = sqlContent.match(/your-regex-here/i)

    if (!match) {
        return null
    }

    // Extract and return parsed data
    return {
        schema,
        name: match[1],
        // ... other properties
    }
}
````

2. **Add type definition**: `src/types/index.ts`

```typescript
export interface YourDefinition {
    schema: string;
    name: string;
    // ... other properties
}
```

3. **Export parser**: `src/parsers/sql-parsers.ts`

```typescript
export * from "./sql/your-feature.js";
```

4. **Wire up in file parser**: `src/parsers/sql-file-parser.ts`

```typescript
import { parseYourFeature } from "./sql-parsers.js";

// In the parsing loop:
const yourFeature = parseYourFeature(trimmed, schema);
if (yourFeature) {
    yourFeatures.push(yourFeature);
    continue;
}
```

5. **Create generator**: `src/generators/your-feature.ts`

```typescript
export function generateYourFeature(
    feature: YourDefinition,
    convention: NamingConvention,
    indentSize: number = 2
): string {
    // Generate TypeScript code
}
```

6. **Add tests**: `tests/parsers/sql/your-feature.test.ts`

### Adding PostgreSQL Type Mapping

Edit `src/utils/type-mapping.ts`:

```typescript
export function mapPostgresTypeToTypeScript(
    pgType: string,
    isArray: boolean,
    schema: string,
    availableEnums: Set<string>,
    useGeometricTypes: boolean
): string {
    // Add your mapping
    if (pgType === "your_type") {
        return "YourTypeScriptType";
    }

    // Existing mappings...
}
```

## 📚 Documentation

-   Update README.md for new features
-   Include SQL examples in docs
-   Update TypeDoc comments

## 🐛 Known Issues

Check the [issues page](https://github.com/chizaruu/supabase-typegen/issues) for known bugs and limitations.

## 💬 Getting Help

-   💬 [Discussions](https://github.com/chizaruu/supabase-typegen/discussions) - Ask questions
-   🐛 [Issues](https://github.com/chizaruu/supabase-typegen/issues) - Report bugs or request features

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Our Standards

**Positive behavior:**

-   Being respectful and inclusive
-   Accepting constructive criticism gracefully
-   Focusing on what's best for the community
-   Showing empathy towards others

**Unacceptable behavior:**

-   Harassment or discriminatory language
-   Trolling or insulting comments
-   Public or private harassment
-   Publishing others' private information

### Enforcement

Violations may be reported via [GitHub Issues](https://github.com/chizaruu/supabase-typegen/issues). All complaints will be reviewed and investigated.

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be added to:

-   GitHub releases

Thank you for contributing! 🎉
