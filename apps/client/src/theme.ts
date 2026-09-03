import { createTheme } from "@mantine/core";

export const appTheme = createTheme({
  colors: {
    brand: [
      "#f1f4ff",
      "#e2e8ff",
      "#c8d3ff",
      "#aabaff",
      "#8ea4ff",
      "#7c9cff",
      "#647df0",
      "#5268cf",
      "#4052aa",
      "#2e3b7f",
    ],
  },
  primaryColor: "brand",
  primaryShade: { light: 6, dark: 4 },
  defaultRadius: "md",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
});
