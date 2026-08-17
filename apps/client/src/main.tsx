import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import { getToken } from "./api";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { registerOfflineMutationDefaults } from "./lib/offline-mutations";
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
registerOfflineMutationDefaults(queryClient);

async function startApplication() {
  await restoreQueryCache(queryClient);
  subscribeToQueryCache(queryClient);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MantineProvider theme={appTheme} defaultColorScheme="dark">
        <AppErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </AppErrorBoundary>
      </MantineProvider>
    </StrictMode>,
  );
  const resumeOfflineMutations = () => {
    if (getToken()) void queryClient.resumePausedMutations();
  };
  window.addEventListener("online", resumeOfflineMutations);
  resumeOfflineMutations();
}

void startApplication();
