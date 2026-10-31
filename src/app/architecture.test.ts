import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const files = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const production = Object.entries(files).filter(([path]) => !/\.test\.[jt]sx?$/.test(path));

describe('admin architecture', () => {
  it('keeps routing in the router and history out of feature UI', () => {
    for (const [path, source] of production.filter(([name]) => name.startsWith('../features/'))) {
      expect(source, path).not.toMatch(/window\.history|(?:add|remove)EventListener\(['"]popstate|new PopStateEvent|window\.location\.pathname/);
      expect(source, path).not.toMatch(/from ['"][^'"]*\/app\//);
    }
    expect(production.find(([path]) => path.endsWith('/AdminApp.tsx'))?.[1]).not.toMatch(/\bView\b|currentView|window\.history/);
  });
  it('keeps shared code independent and TSX type declarations in types files', () => {
    for (const [path, source] of production) {
      if (path.startsWith('../components/') || path.startsWith('../lib/')) expect(source, path).not.toMatch(/from ['"][^'"]*\/(?:features|app)\//);
      if (path.endsWith('.tsx')) {
        const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        const violations: string[] = [];
        const visit = (node: ts.Node) => { if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isTypeLiteralNode(node)) violations.push(String(file.getLineAndCharacterOfPosition(node.getStart()).line + 1)); ts.forEachChild(node, visit); };
        visit(file);
        expect(violations, path).toEqual([]);
      }
    }
  });
});
