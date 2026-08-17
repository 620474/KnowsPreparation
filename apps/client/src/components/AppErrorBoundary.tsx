import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@mantine/core";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

import { clearPersistedQueryCache } from "../lib/query-cache";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application render failed", error, info.componentStack);
  }

  private clearCacheAndReload = async () => {
    await clearPersistedQueryCache();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="state-page">
        <AlertTriangle size={42} />
        <h1>Экран не удалось открыть</h1>
        <p>Прогресс в MongoDB не потерян. Сначала попробуй перезагрузить приложение.</p>
        <Button
          className="primary-button"
          leftSection={<RefreshCw size={17} />}
          type="button"
          onClick={() => window.location.reload()}
        >
          Перезагрузить
        </Button>
        <Button
          className="secondary-button"
          leftSection={<Trash2 size={17} />}
          type="button"
          variant="default"
          onClick={() => void this.clearCacheAndReload()}
        >
          Сбросить локальный кеш
        </Button>
        <small>{this.state.error.message}</small>
      </main>
    );
  }
}
