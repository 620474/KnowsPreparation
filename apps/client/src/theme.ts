import { createTheme } from "@mantine/core";

export const appTheme = createTheme({
  colors: {
    mint: [
      "#effff7",
      "#d9ffeb",
      "#b5fbd6",
      "#8cf7c0",
      "#6bf5b0",
      "#38d993",
      "#22bd7a",
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
