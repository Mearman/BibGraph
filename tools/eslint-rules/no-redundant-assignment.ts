import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";
import * as ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/Mearman/BibGraph/blob/main/tools/eslint-rules/${name}.md`
);

export const noRedundantAssignment = createRule({
  name: "no-redundant-assignment",
  meta: {
    type: "suggestion",
    docs: {
      description: "Detect redundant variable assignments where a variable is assigned directly to another without transformation",
    },
    fixable: "code",
    messages: {
      redundantAssignment: "Redundant assignment: '{{name}}' is just assigned to '{{source}}' without transformation",
      redundantAssignmentWithTypeAnnotation: "Consider using '{{source}}' directly or provide a meaningful transformation",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowWithTypeAnnotation: {
            type: "boolean",
            default: true,
            description: "Allow redundant assignments when a type annotation is present",
          },
          allowInInterfaces: {
            type: "boolean",
            default: true,
            description: "Allow redundant assignments in interface definitions",
          },
          allowedNames: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Allow redundant assignments for variable names matching this regex pattern",
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowWithTypeAnnotation: true,
      allowInInterfaces: true,
      allowedNames: ["CONFIG", "SETTINGS", "OPTIONS"],
    },
  ],
  create(context, [options]) {
    const {
      allowWithTypeAnnotation = true,
      allowInInterfaces = true,
      allowedNames = [],
    } = options || {};

    const allowedNamesRegex = allowedNames.length > 0
      ? new RegExp(allowedNames.join("|"), "i")
      : null;

    return {
      // Visit variable declarations
      VariableDeclarator(node) {
        // Skip if no initializer
        if (!node.init) {
          return;
        }

        // Skip if not a simple identifier assignment
        if (node.id.type !== "Identifier") {
          return;
        }

        // Skip if initializer is not a simple identifier
        if (node.init.type !== "Identifier") {
          return;
        }

        const varName = node.id.name;
        const sourceName = node.init.name;

        // Skip if it's the same variable (self-assignment)
        if (varName === sourceName) {
          return;
        }

        // Skip if variable name matches allowed pattern
        if (allowedNamesRegex && allowedNamesRegex.test(varName)) {
          return;
        }

        // Check if this is a redundant assignment pattern
        // The variable is just assigning another variable directly
        // Exclude for loop initializations and other legitimate patterns
        const isRedundant =
          node.init.type === "Identifier" &&
          !hasTransformation(node.init) &&
          !isUpperCaseWithUnderscore(varName) && // Skip constants like API_URL
          !isExported(node) &&
          !isForLoopInitialization(node); // Skip for loop counter initialization

        if (!isRedundant) {
          return;
        }

        // Check if there's a type annotation on the variable declarator
        const hasTypeAnnotation = !!(
          node.id.type === "Identifier" &&
          "typeAnnotation" in node.id &&
          node.id.typeAnnotation
        );

        // Check if we're in an interface or type alias
        const isInInterface = isInsideInterfaceOrTypeAlias(node);

        // Allow certain cases based on configuration
        if (
          (allowWithTypeAnnotation && hasTypeAnnotation) ||
          (allowInInterfaces && isInInterface)
        ) {
          return;
        }

        // Report the issue with auto-fix
        context.report({
          node,
          messageId: hasTypeAnnotation
            ? "redundantAssignmentWithTypeAnnotation"
            : "redundantAssignment",
          data: {
            name: varName,
            source: sourceName,
          },
          fix(fixer) {
            // Find all usages of the redundant variable in the current scope
            const scope = context.sourceCode.getScope(node);
            const variable = scope.set.get(varName);

            if (!variable || !variable.defs.length) {
              return null;
            }

            // Check if the variable is ever modified after initial assignment
            // If it is, we can't safely auto-fix because the transformations might be important
            for (const reference of variable.references) {
              // Skip the definition itself
              if (reference.identifier === node.id) {
                continue;
              }

              // Check if this reference is being written to (assignment, update, etc.)
              const parent = reference.identifier.parent;
              if (parent && (
                parent.type === "AssignmentExpression" && parent.left === reference.identifier ||
                parent.type === "UpdateExpression" ||
                (parent.type === "VariableDeclarator" && parent.id === reference.identifier)
              )) {
                // Variable is modified - don't provide auto-fix
                return null;
              }
            }

            // If we get here, the variable is never modified, so we can safely auto-fix
            const fixes: ReturnType<typeof fixer.remove>[] = [];

            // 1. Remove the entire variable declaration
            const declaration = node.parent;
            if (declaration && declaration.type === "VariableDeclaration") {
              // If this is the only declaration in the statement, remove the entire statement
              if (declaration.declarations.length === 1) {
                fixes.push(fixer.remove(declaration));
              } else {
                // If there are multiple declarations, just remove this one
                // Use findIndex with explicit comparison since indexOf has type issues with union types
                const varIndex = declaration.declarations.findIndex(d => d === node);
                if (varIndex > -1) {
                  // Remove the declaration and any preceding comma/space
                  const prevToken = context.sourceCode.getTokenBefore(node);
                  const nextToken = context.sourceCode.getTokenAfter(node);

                  if (prevToken && prevToken.value === ",") {
                    fixes.push(fixer.removeRange([prevToken.range[0], node.range[1]]));
                  } else if (nextToken && nextToken.value === ",") {
                    fixes.push(fixer.removeRange([node.range[0], nextToken.range[1]]));
                  } else {
                    fixes.push(fixer.remove(node));
                  }
                }
              }
            }

            // 2. Replace all read-only usages with the source variable
            for (const reference of variable.references) {
              // Skip the definition itself - we already handled that
              if (reference.identifier === node.id) {
                continue;
              }

              // Replace the usage with the source variable name
              fixes.push(fixer.replaceText(reference.identifier, sourceName));
            }

            return fixes;
          },
        });
      },
    };
  },
});

/**
 * Check if an identifier has any transformations applied
 */
function hasTransformation(node: TSESTree.Identifier): boolean {
  // For this rule, we're only checking if it's a simple identifier
  // If it were more complex (object property access, function call, etc.), we'd return true
  return false;
}

/**
 * Check if a name follows the CONSTANT_CASE pattern
 */
function isUpperCaseWithUnderscore(name: string): boolean {
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}

/**
 * Check if a variable is exported
 */
function isExported(node: TSESTree.Node): boolean {
  let current = node.parent;

  while (current) {
    if (current.type === "ExportNamedDeclaration" ||
        current.type === "ExportDefaultDeclaration") {
      return true;
    }
    current = current.parent;
  }

  return false;
}

/**
 * Check if we're inside an interface or type alias
 */
function isInsideInterfaceOrTypeAlias(node: TSESTree.Node): boolean {
  let current = node.parent;

  while (current) {
    if (current.type === "TSInterfaceDeclaration" ||
        current.type === "TSTypeAliasDeclaration" ||
        current.type === "TSTypeLiteral") {
      return true;
    }
    current = current.parent;
  }

  return false;
}

/**
 * Check if the variable declaration is part of a for loop initialization
 */
function isForLoopInitialization(node: TSESTree.VariableDeclarator): boolean {
  // Check if parent is a VariableDeclaration that's part of a ForStatement
  const parent = node.parent;
  if (parent && parent.type === "VariableDeclaration") {
    const grandParent = parent.parent;
    return grandParent && grandParent.type === "ForStatement" && grandParent.init === parent;
  }
  return false;
}