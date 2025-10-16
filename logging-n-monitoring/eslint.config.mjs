import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL(".", import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: { js: { ignores: [] } },
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Make TypeScript rules more lenient for demo
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      
      // Make React rules more lenient
      "react/no-unescaped-entities": "warn",
      
      // Make Next.js rules more lenient
      "@next/next/no-img-element": "warn",
      
      // Allow console for demo purposes
      "no-console": "warn",
    },
  },
  {
    files: ["scripts/**/*.{js,ts}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
    },
  },
];

export default eslintConfig;
