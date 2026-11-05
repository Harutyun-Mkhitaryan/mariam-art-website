/** @type {import("prettier").Config} */
export default {
  plugins: ["prettier-plugin-astro"],
  printWidth: 100,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  bracketSameLine: false,
  singleAttributePerLine: true,
  astroAllowShorthand: false,
  astroCompressHTML: "jsx",
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};
