import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

export default tseslint.config(
  { ignores: ["public/dist/**", "node_modules/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      semi: ["error", "never"],
      "@typescript-eslint/semi": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
)
