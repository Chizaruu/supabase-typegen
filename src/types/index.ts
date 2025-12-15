/**
 * Type definitions for Supabase Type Generator
 */

export interface SupabaseConfig {
    db?: {
        migrations?: {
            schema_paths?: string[];
        };
    };
}

export interface PrettierConfig {
    tabWidth?: number;
    useTabs?: boolean;
    semi?: boolean;
    singleQuote?: boolean;
    trailingComma?: string;
    printWidth?: number;
}

export interface ColumnDefinition {
    name: string;
    type: string;
    nullable: boolean;
    defaultValue: string | null;
    isArray: boolean;
    isPrimaryKey: boolean;
    isUnique: boolean;
    comment?: string;
    foreignKey?: {
        table: string;
        column: string;
        schema?: string;
    };
}

export interface IndexDefinition {
    name: string;
    tableName: string;
    columns: string[];
    isUnique: boolean;
    method?: string;
    whereClause?: string;
}

export interface TableDefinition {
    schema: string;
    name: string;
    columns: ColumnDefinition[];
    comment?: string;
    relationships: RelationshipDefinition[];
    indexes: IndexDefinition[];
}

export interface RelationshipDefinition {
    foreignKeyName: string;
    columns: string[];
    isOneToOne: boolean;
    referencedRelation: string;
    referencedColumns: string[];
}

export interface ViewDefinition {
    schema: string;
    name: string;
    columns: ColumnDefinition[];
    isMaterialized: boolean;
    definition?: string;
    comment?: string;
}

export interface EnumDefinition {
    schema: string;
    name: string;
    values: string[];
}

export interface FunctionDefinition {
    schema: string;
    name: string;
    args: Array<{ name: string; type: string; hasDefault?: boolean }>;
    returns: string;
}

export interface CompositeTypeDefinition {
    schema: string;
    name: string;
    attributes: Array<{ name: string; type: string }>;
}

export type NamingConvention =
    | "preserve"
    | "PascalCase"
    | "camelCase"
    | "snake_case"
    | "SCREAMING_SNAKE_CASE";

export type SourceType = "sql" | "db";

export interface GeneratorConfig {
    supabase: {
        source: SourceType;
        connectionString?: string;
        schema: string;
        useWorkdirFlag: boolean;
        inputWorkdir: string | null;
        configWorkdir: string | null;
        configPath: string;
    };
    schemaPaths: string[];
    output: {
        dir: string;
        tempFile: string;
        finalFile: string;
    };
    extractNestedTypes: boolean;
    deduplicateTypes: boolean;
    verboseLogging: boolean;
    namingConvention: NamingConvention;
    alphabetical: boolean;
    indentSize: number;
    includeIndexes: boolean;
    includeComments: boolean;
}

export interface JsonbColumn {
    table: string;
    column: string;
    defaultValue: string | null;
    comment?: string;
    fileName: string;
}

export interface TypeDefinition {
    table: string;
    column: string;
    name: string;
    typeDefinition: string;
    comment?: string;
    example?: Record<string, unknown>;
    nestedTypes?: TypeDefinition[];
}

export type ColorName =
    | "reset"
    | "bright"
    | "green"
    | "blue"
    | "yellow"
    | "red"
    | "cyan";
