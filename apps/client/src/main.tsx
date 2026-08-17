import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import { restoreQueryCache, subscribeToQueryCache } from "./lib/query-cache";
import { appTheme } from "./theme";
import "@mantine/core/styles.css";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 20_000, networkMode: "offlineFirst" },
    mutations: { retry: 0, networkMode: "always" },
  },
});

async function startApplication() {
  await restoreQueryCache(queryClient);
  subscribeToQueryCache(queryClient);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MantineProvider theme={appTheme} defaultColorScheme="dark">
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </MantineProvider>
    </StrictMode>,
  );
}

void startApplication();
