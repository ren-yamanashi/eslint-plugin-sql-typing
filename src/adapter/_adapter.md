# adapters Directory

## Interfaces

### IDatabaseAdapter

Retrieve metadata from the database:

```typescript
interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getQueryMetadata(sql: string): Promise<QueryMetadata>;
}
```

### ILibraryAdapter

Extract SQL from AST and manipulate type annotations:

```typescript
interface ILibraryAdapter {
  isTargetMethod(node: CallExpression): boolean;
  extractSql(node: CallExpression): string | null;
  getExistingTypeAnnotation(node: CallExpression): ExistingType | null;
  generateFix(node: CallExpression, typeString: string): Fix;
  getQueryOptions(node: CallExpression): QueryOptions;
}
```
