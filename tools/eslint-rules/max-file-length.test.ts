import { RuleTester } from "@typescript-eslint/rule-tester";
import { afterAll, describe, it } from "vitest";
import * as path from "node:path";
import { maxFileLength } from "./max-file-length";
import * as parser from "@typescript-eslint/parser";

// Configure RuleTester to use vitest
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
});

// Test 1: File under limit
ruleTester.run("max-file-length - file under limit", maxFileLength, {
  valid: [
    {
      code: `
// Test file with 50 lines
${Array.from({ length: 49 }, (_, i) => `// Line ${i + 2}`).join("\n")}
      `.trim(),
      filename: "test-under-limit.ts",
      options: [{ max: 100 }],
    },
  ],
  invalid: [],
});

// Test 2: File exactly at limit
ruleTester.run("max-file-length - file at limit", maxFileLength, {
  valid: [
    {
      code: `
// Test file with exactly 100 lines
${Array.from({ length: 98 }, (_, i) => `// Line ${i + 3}`).join("\n")}
      `.trim(),
      filename: "test-at-limit.ts",
      options: [{ max: 100 }],
    },
  ],
  invalid: [],
});

// Test 3: File over limit
ruleTester.run("max-file-length - file over limit", maxFileLength, {
  valid: [],
  invalid: [
    {
      code: `
// Test file with 150 lines
${Array.from({ length: 149 }, (_, i) => `// Line ${i + 2}`).join("\n")}
      `.trim(),
      filename: "test-over-limit.ts",
      options: [{ max: 100 }],
      errors: [
        {
          messageId: "fileTooLong",
          data: {
            current: 150,
            max: 100,
            percentage: 50,
          },
          line: 1,
          column: 1,
        },
      ],
    },
  ],
});

// Test 4: Default max of 750
ruleTester.run("max-file-length - default max", maxFileLength, {
  valid: [],
  invalid: [
    {
      code: `
// Test file with 800 lines
${Array.from({ length: 799 }, (_, i) => `// Line ${i + 2}`).join("\n")}
      `.trim(),
      filename: "test-default-max.ts",
      errors: [
        {
          messageId: "fileTooLong",
          data: {
            current: 800,
            max: 750,
            percentage: 7,
          },
        },
      ],
    },
  ],
});

// Test 5: Custom max limit
ruleTester.run("max-file-length - custom max", maxFileLength, {
  valid: [],
  invalid: [
    {
      code: `
// Test file with 200 lines
${Array.from({ length: 199 }, (_, i) => `// Line ${i + 2}`).join("\n")}
      `.trim(),
      filename: "test-custom-max.ts",
      options: [{ max: 150 }],
      errors: [
        {
          messageId: "fileTooLong",
          data: {
            current: 200,
            max: 150,
            percentage: 33,
          },
        },
      ],
    },
  ],
});

// Test 6: Percentage calculation
ruleTester.run("max-file-length - percentage calculation", maxFileLength, {
  valid: [],
  invalid: [
    {
      code: `
// Test file with 900 lines (20% over 750 limit)
${Array.from({ length: 899 }, (_, i) => `// Line ${i + 2}`).join("\n")}
      `.trim(),
      filename: "test-percentage.ts",
      options: [{ max: 750 }],
      errors: [
        {
          messageId: "fileTooLong",
          data: {
            current: 900,
            max: 750,
            percentage: 20,
          },
        },
      ],
    },
  ],
});

// Test 7: Empty file
ruleTester.run("max-file-length - empty file", maxFileLength, {
  valid: [
    {
      code: "",
      filename: "empty.ts",
      options: [{ max: 100 }],
    },
  ],
  invalid: [],
});

// Test 8: Single line file
ruleTester.run("max-file-length - single line", maxFileLength, {
  valid: [
    {
      code: "const x = 1;",
      filename: "single-line.ts",
      options: [{ max: 100 }],
    },
  ],
  invalid: [],
});
