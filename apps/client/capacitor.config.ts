import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.maksim.frontendprep",
  appName: "Frontend Sprint",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
