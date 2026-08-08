import type { ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import {
  BookOpenCheck,
  CalendarDays,
  CircleUserRound,
  Code2,
  Gauge,
  LibraryBig,
  ListChecks,
  Settings,
} from "lucide-react";

export type AppView =
  | "today"
  | "yandex"
  | "plan"
  | "resources"
  | "questions"
  | "algorithms"
  | "settings";

interface AppShellProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  children: ReactNode;
  weekLabel: string;
}

const navigation: Array<{
  id: AppView;
  label: string;
  shortLabel: string;
  icon: typeof Gauge;
}> = [
  { id: "today", label: "Сегодня", shortLabel: "Сегодня", icon: Gauge },
  { id: "yandex", label: "Яндекс-спринт", shortLabel: "Яндекс", icon: ListChecks },
  { id: "plan", label: "Учебный план", shortLabel: "План", icon: CalendarDays },
  { id: "resources", label: "Библиотека", shortLabel: "База", icon: LibraryBig },
  { id: "questions", label: "Банк вопросов", shortLabel: "Вопр.", icon: BookOpenCheck },
  { id: "algorithms", label: "Алгоритмы", shortLabel: "Алго", icon: Code2 },
  { id: "settings", label: "Настройки", shortLabel: "Ещё", icon: Settings },
];

export function AppShell({ activeView, onViewChange, children, weekLabel }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">FS</div>
          <div>
            <strong>Frontend Sprint</strong>
            <span>Interview OS</span>
          </div>
        </div>

        <nav aria-label="Основная навигация">
          {navigation.map(({ id, label, icon: Icon }) => (
            <UnstyledButton
              key={id}
              className={activeView === id ? "nav-button active" : "nav-button"}
              type="button"
              onClick={() => onViewChange(id)}
              aria-current={activeView === id ? "page" : undefined}
            >
              <Icon size={20} />
              {label}
            </UnstyledButton>
          ))}
        </nav>

        <div className="sidebar-profile">
          <CircleUserRound size={24} />
          <div>
            <strong>Личный план</strong>
            <span>{weekLabel}</span>
          </div>
        </div>
      </aside>

      <div className="content-shell">
        <header className="mobile-header">
          <div className="brand-mark" aria-hidden="true">FS</div>
          <div>
            <strong>Frontend Sprint</strong>
            <span>{weekLabel}</span>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {navigation.map(({ id, shortLabel, icon: Icon }) => (
          <UnstyledButton
            key={id}
            className={activeView === id ? "active" : ""}
            type="button"
            onClick={() => onViewChange(id)}
            aria-current={activeView === id ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{shortLabel}</span>
          </UnstyledButton>
        ))}
      </nav>
    </div>
  );
}
