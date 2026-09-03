import { createTheme } from "@mantine/core";

export const appTheme = createTheme({
  colors: {
    mint: [
      "#effff7",
      "#d9ffeb",
      "#b5fbd6",
      "#8af0d1",
      "#63e6be",
      "#2dd4a3",
      "#1eb58a",
      "#15965f",
      "#0d7048",
      "#06462e",
    ],
  },
  primaryColor: "mint",
  primaryShade: { light: 6, dark: 4 },
  defaultRadius: "md",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
});
