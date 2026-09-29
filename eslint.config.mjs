import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-plugin-react 7.37.5 still calls the removed ESLint context API.
    // TypeScript, React Hooks, JSX accessibility, and Next rules remain enabled.
    rules: Object.fromEntries([
      "display-name", "jsx-key", "jsx-no-comment-textnodes", "jsx-no-duplicate-props",
      "jsx-no-target-blank", "jsx-no-undef", "jsx-uses-react", "jsx-uses-vars",
      "no-children-prop", "no-danger-with-children", "no-deprecated", "no-direct-mutation-state",
      "no-find-dom-node", "no-is-mounted", "no-render-return-value", "no-string-refs",
      "no-unescaped-entities", "no-unknown-property", "no-unsafe", "prop-types",
      "react-in-jsx-scope", "require-render-return",
    ].map(rule => [`react/${rule}`, "off"])),
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
