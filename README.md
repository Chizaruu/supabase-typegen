# Supabase Type Generator

Complete Supabase Type Generator - Schema-File First with Index Support

## Features

- 🔍 **SQL-First Parsing**: Reads directly from your SQL migration files
- 📊 **Complete Schema Support**: Tables, enums, functions, composite types, and indexes
- 🎯 **Precise Types**: Preserves exact database naming and structure
- 💬 **Comment Support**: Converts SQL comments to TypeScript JSDoc
- 🔗 **Relationship Detection**: Automatically detects foreign keys and one-to-one relationships
- 📑 **Index Metadata**: Optional index information in generated types
- 🎨 **Flexible Naming**: Multiple naming conventions (preserve, PascalCase, camelCase, etc.)
- 🔧 **Prettier Integration**: Auto-detects Prettier configuration for consistent formatting

## Installation

```bash
npm install @chizaruu/supabase-type-generator
```

## Usage

### Basic Usage

```bash
# Generate types from default location (./supabase)
npx generate-supabase-types

# Specify custom Supabase directory
npx generate-supabase-types --workdir ./my-supabase

# Custom output directory
npx generate-supabase-types --output ./src/types
```

### Advanced Options

```bash
# Include index metadata
npx generate-supabase-types --include-indexes

# Use custom naming convention
npx generate-supabase-types --naming camelCase

# Sort types alphabetically
npx generate-supabase-types --alphabetical

# Custom indentation
npx generate-supabase-types --indent 4

# Extract nested JSONB types
npx generate-supabase-types --extract-nested
```

### CLI Options

**Source Options:**

- `--local [workdir]` - Read from local SQL files (default)
- `--workdir <path>` - Specify Supabase working directory
- `--db, --use-database` - Query database for schema
- `--connection-string <url>` - Database connection string

**Output Options:**

- `--output, -o <dir>` - Output directory for generated types
- `--schema <name>` - Database schema name (default: public)

**Formatting Options:**

- `--indent, --indent-size <n>` - Indentation size (1-8 spaces)
- `--use-prettier` - Use Prettier config for indentation
- `--naming <convention>` - Naming convention (preserve, PascalCase, camelCase, snake_case, SCREAMING_SNAKE_CASE)
- `--alphabetical, --sort` - Sort types alphabetically

**Type Generation Options:**

- `--extract-nested, --deep-nested` - Extract nested types from JSONB
- `--deduplicate, --dedupe` - Deduplicate type definitions
- `--include-indexes, --indexes` - Include index metadata in generated types
- `--no-comments, --skip-comments` - Disable parsing SQL comments as JSDoc

**Output Options:**

- `--no-logs, --silent, --quiet` - Suppress log output

## Generated Types

```typescript
import type { Database, Tables, Enums } from "./types/database";

// Table types
type User = Tables<"users">;
type UserInsert = TablesInsert<"users">;
type UserUpdate = TablesUpdate<"users">;

// Enum types
type UserRole = Enums<"user_role">;

// Direct database access
type UserRow = Database["public"]["Tables"]["users"]["Row"];
```

## Configuration

The generator reads from your `supabase/config.toml` file to locate SQL migration files:

```toml
[db.migrations]
schema_paths = [
  "migrations/*.sql",
  "migrations/**/*.sql"
]
```

## Features in Detail

### Automatic Column Exclusion

The generator automatically excludes `this` and `constraint` columns from generated types as these are PostgreSQL reserved words that shouldn't appear in TypeScript types.

### Comment Support

SQL comments are converted to TypeScript JSDoc:

```sql
COMMENT ON TABLE users IS 'Application users';
COMMENT ON COLUMN users.email IS 'User email address';
```

Becomes:

```typescript
/**
 * Application users
 */
users: {
    Row: {
        /** User email address */
        email: string;
    }
}
```

### Index Support

When using `--include-indexes`, the generator includes index metadata:

```typescript
users: {
  Row: { ... }
  Insert: { ... }
  Update: { ... }
  Relationships: [...]
  Indexes: [
    {
      name: "idx_users_email"
      columns: ["email"]
      isUnique: true
      method: "btree"
    }
  ]
}
```

## License

MIT
