import { describe, expect, it } from 'vitest';
import ts from 'typescript';

export interface BoundaryViolation {
  file: string;
  line: number;
  type: 'consumer-style-override' | 'inline-style-override' | 'unauthorized-raw-control';
  message: string;
}

const SHARED_PRIMITIVES = new Set([
  'Button',
  'Input',
  'Textarea',
  'Badge',
  'Card',
  'CardHeader',
  'CardTitle',
  'CardDescription',
  'CardContent',
  'CardFooter',
  'Label',
  'Table',
  'TableHeader',
  'TableBody',
  'TableFooter',
  'TableHead',
  'TableRow',
  'TableCell',
  'TableCaption',
  'Dialog',
  'DialogTrigger',
  'DialogContent',
  'DialogHeader',
  'DialogFooter',
  'DialogTitle',
  'DialogDescription',
  'DialogClose',
  'DialogOverlay',
  'DialogPortal',
  'Tabs',
  'TabsList',
  'TabsTrigger',
  'TabsContent',
]);

const FORBIDDEN_APPEARANCE_PATTERNS = [
  /^bg-/,
  /^text-(?!left|right|center|start|end|justify|xs|sm|base|lg|[1-9]?xl|nowrap|wrap|ellipsis|clip)/,
  /^rounded-/,
  /^border-(?!0|1|2|4|8|t|b|l|r|x|y)/,
];

const ALLOWED_EXCEPTIONS_BY_FILE: Record<string, string[]> = {
  'src/features/gallery/components/case-editor/GalleryCaseEditor.tsx': ['file-input', 'media-canvas'],
  'src/features/gallery/components/case-editor/GalleryImageCard.tsx': ['file-input'],
  'src/features/gallery/components/GalleryCaseEditor.tsx': ['file-input', 'media-canvas'],
  'src/features/gallery/components/GalleryImageCard.tsx': ['file-input'],
  'src/features/blogs/components/BlogEditor.tsx': ['file-input', 'range-input'],
};

export function findUIBoundaryViolations(
  filePath: string,
  sourceCode: string,
  options?: { enforceRawControls?: boolean }
): BoundaryViolation[] {
  const file = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const violations: BoundaryViolation[] = [];

  const checkAttributes = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, tagName: string) => {
    const getLine = () => file.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    // 1. Check direct style / appearance overrides on shared primitives
    if (SHARED_PRIMITIVES.has(tagName)) {
      for (const prop of node.attributes.properties) {
        if (!ts.isJsxAttribute(prop)) continue;
        const attrName = prop.name.getText(file);

        if (attrName === 'style') {
          violations.push({
            file: filePath,
            line: getLine(),
            type: 'inline-style-override',
            message: `Direct inline style is forbidden on shared primitive <${tagName}>`,
          });
        }

        if (attrName === 'className' && prop.initializer) {
          let classString = '';
          if (ts.isStringLiteral(prop.initializer)) {
            classString = prop.initializer.text;
          } else if (
            ts.isJsxExpression(prop.initializer) &&
            prop.initializer.expression
          ) {
            const expr = prop.initializer.expression;
            if (ts.isStringLiteral(expr)) {
              classString = expr.text;
            } else if (ts.isNoSubstitutionTemplateLiteral(expr)) {
              classString = expr.text;
            } else if (ts.isTemplateExpression(expr)) {
              classString = [expr.head.text, ...expr.templateSpans.map((s) => s.literal.text)].join(' ');
            } else if (ts.isCallExpression(expr)) {
              classString = expr.arguments
                .filter(ts.isStringLiteral)
                .map((a) => a.text)
                .join(' ');
            }
          }

          const tokens = classString.split(/\s+/).filter(Boolean);
          const forbiddenTokens = tokens.filter((token) => {
            const baseToken = token.replace(/^(?:[a-z0-9_[-]+:)+/, '');
            return FORBIDDEN_APPEARANCE_PATTERNS.some((pattern) => pattern.test(baseToken));
          });

          if (forbiddenTokens.length > 0) {
            violations.push({
              file: filePath,
              line: getLine(),
              type: 'consumer-style-override',
              message: `Forbidden appearance override classes on <${tagName}>: ${forbiddenTokens.join(', ')}`,
            });
          }
        }
      }
    }

    // 2. Check unauthorized duplicate raw controls
    if (options?.enforceRawControls) {
      if (tagName === 'button') {
        violations.push({
          file: filePath,
          line: getLine(),
          type: 'unauthorized-raw-control',
          message: 'Unauthorized raw <button> control used; use shared <Button> primitive instead.',
        });
      }

      if (tagName === 'textarea') {
        violations.push({
          file: filePath,
          line: getLine(),
          type: 'unauthorized-raw-control',
          message: 'Unauthorized raw <textarea> control used; use shared <Textarea> primitive instead.',
        });
      }

      if (tagName === 'input') {
        let inputType = 'text';
        for (const prop of node.attributes.properties) {
          if (ts.isJsxAttribute(prop) && prop.name.getText(file) === 'type' && prop.initializer) {
            if (ts.isStringLiteral(prop.initializer)) {
              inputType = prop.initializer.text;
            }
          }
        }

        // Justified exceptions
        if (inputType === 'file') {
          const exceptions = ALLOWED_EXCEPTIONS_BY_FILE[filePath] || [];
          if (!exceptions.includes('file-input')) {
            violations.push({
              file: filePath,
              line: getLine(),
              type: 'unauthorized-raw-control',
              message: 'Native file input is only authorized in documented media upload surfaces.',
            });
          }
        } else if (inputType === 'range') {
          const exceptions = ALLOWED_EXCEPTIONS_BY_FILE[filePath] || [];
          if (!exceptions.includes('range-input')) {
            violations.push({
              file: filePath,
              line: getLine(),
              type: 'unauthorized-raw-control',
              message: 'Native range input is only authorized in documented focal point adjustment surfaces.',
            });
          }
        } else if (inputType === 'checkbox') {
          // Documented native checkbox exception is allowed
        } else {
          violations.push({
            file: filePath,
            line: getLine(),
            type: 'unauthorized-raw-control',
            message: `Unauthorized raw <input type="${inputType}"> used; use shared <Input> primitive instead.`,
          });
        }
      }
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node)) {
      checkAttributes(node, node.tagName.getText(file));
    } else if (ts.isJsxSelfClosingElement(node)) {
      checkAttributes(node, node.tagName.getText(file));
    }
    ts.forEachChild(node, visit);
  };

  visit(file);
  return violations;
}

describe('UI Boundary Structural Check', () => {
  it('flags intentional consumer style overrides with line number and offending tokens', () => {
    const snippet = `
      export function FeatureComponent() {
        return (
          <div>
            <Button className="mt-4 bg-red-600 text-white rounded-full">Delete</Button>
            <Badge className="bg-emerald-500">Active</Badge>
          </div>
        );
      }
    `;

    const violations = findUIBoundaryViolations('src/features/sample/Component.tsx', snippet);
    expect(violations.length).toBe(2);

    expect(violations[0].line).toBe(5);
    expect(violations[0].type).toBe('consumer-style-override');
    expect(violations[0].message).toContain('bg-red-600');
    expect(violations[0].message).toContain('text-white');
    expect(violations[0].message).toContain('rounded-full');

    expect(violations[1].line).toBe(6);
    expect(violations[1].type).toBe('consumer-style-override');
    expect(violations[1].message).toContain('bg-emerald-500');
  });

  it('flags intentional inline style overrides on shared primitives', () => {
    const snippet = `
      export function StyledComponent() {
        return <Button style={{ backgroundColor: 'red' }}>Action</Button>;
      }
    `;

    const violations = findUIBoundaryViolations('src/features/sample/Component.tsx', snippet);
    expect(violations.length).toBe(1);
    expect(violations[0].line).toBe(3);
    expect(violations[0].type).toBe('inline-style-override');
  });

  it('allows valid layout classes on shared primitives', () => {
    const snippet = `
      export function LayoutComponent() {
        return (
          <div className="flex gap-2">
            <Button className="mt-4 w-full shrink-0">Submit</Button>
            <Input className="w-1/2" />
          </div>
        );
      }
    `;

    const violations = findUIBoundaryViolations('src/features/sample/Component.tsx', snippet);
    expect(violations).toEqual([]);
  });

  it('detects unauthorized raw controls when enforcement is enabled', () => {
    const snippet = `
      export function RawControlComponent() {
        return (
          <div>
            <button onClick={() => {}}>Raw Click</button>
            <input type="text" placeholder="Raw input" />
            <textarea placeholder="Raw textarea" />
          </div>
        );
      }
    `;

    const violations = findUIBoundaryViolations('src/features/sample/Component.tsx', snippet, {
      enforceRawControls: true,
    });
    expect(violations.length).toBe(3);
    expect(violations[0].type).toBe('unauthorized-raw-control');
    expect(violations[0].message).toContain('<button>');
    expect(violations[1].type).toBe('unauthorized-raw-control');
    expect(violations[1].message).toContain('<input type="text">');
    expect(violations[2].type).toBe('unauthorized-raw-control');
    expect(violations[2].message).toContain('<textarea>');
  });

  it('respects documented semantic exceptions (file input in gallery case editor, native checkbox)', () => {
    const gallerySnippet = `
      export function GalleryUploader() {
        return (
          <div>
            <input type="file" accept="image/*" />
            <input type="checkbox" id="consent" />
          </div>
        );
      }
    `;

    const violations = findUIBoundaryViolations(
      'src/features/gallery/components/GalleryCaseEditor.tsx',
      gallerySnippet,
      { enforceRawControls: true }
    );
    expect(violations).toEqual([]);
  });

  it('flags unauthorized file input outside documented exception file', () => {
    const unauthorizedSnippet = `
      export function RandomComponent() {
        return <input type="file" />;
      }
    `;

    const violations = findUIBoundaryViolations(
      'src/features/leads/RandomComponent.tsx',
      unauthorizedSnippet,
      { enforceRawControls: true }
    );
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('unauthorized-raw-control');
    expect(violations[0].message).toContain('Native file input is only authorized');
  });

  it('ensures zero consumer styling overrides on shared primitives across all production files', () => {
    const productionFiles = import.meta.glob('../**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

    const productionEntries = Object.entries(productionFiles).filter(
      ([path]) => !/\.test\.[jt]sx?$/.test(path) && !path.includes('/components/ui/')
    );

    expect(productionEntries.length).toBeGreaterThan(30);

    const allViolations: BoundaryViolation[] = [];
    for (const [path, source] of productionEntries) {
      const normalizedPath = path.replace(/^\.\.\//, 'src/');
      const violations = findUIBoundaryViolations(normalizedPath, source);
      allViolations.push(...violations);
    }

    expect(allViolations).toEqual([]);
  });

  it('ensures zero unauthorized raw controls across all production TSX files in the application', () => {
    const productionFiles = import.meta.glob('../**/*.{ts,tsx}', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>;

    const productionEntries = Object.entries(productionFiles).filter(
      ([path]) => !/\.test\.[jt]sx?$/.test(path) && !path.includes('/components/ui/')
    );

    expect(productionEntries.length).toBeGreaterThan(30);

    const allViolations: BoundaryViolation[] = [];
    for (const [path, source] of productionEntries) {
      const normalizedPath = path.replace(/^\.\.\//, 'src/');
      const violations = findUIBoundaryViolations(normalizedPath, source, {
        enforceRawControls: true,
      });
      allViolations.push(...violations);
    }

    expect(allViolations).toEqual([]);
  });
});
