import { ESLintUtils } from "@typescript-eslint/utils";
import type { TSESTree } from "@typescript-eslint/utils";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/Mearman/BibGraph/blob/main/tools/eslint-rules/${name}.md`
);

export const maxFileLength = createRule({
  name: "max-file-length",
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce a maximum file length to improve code maintainability",
    },
    messages: {
      fileTooLong: "File too long ({{current}} lines). Maximum allowed is {{max}} lines ({{percentage}}% over limit).\nConsider refactoring into smaller modules or add to excludePatterns if justified.",
    },
    schema: [
      {
        type: "object",
        properties: {
          max: {
            type: "number",
            minimum: 1,
          },
          excludePatterns: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [],
  create(context, [options]) {
    const maxLines = options?.max ?? 750;

    return {
      Program(node: TSESTree.Program) {
        const currentLines = context.sourceCode.lines.length;

        if (currentLines > maxLines) {
          const percentage = Math.round(((currentLines - maxLines) / maxLines) * 100);

          context.report({
            node,
            messageId: "fileTooLong",
            data: {
              current: currentLines,
              max: maxLines,
              percentage,
            },
          });
        }
      },
    };
  },
});
