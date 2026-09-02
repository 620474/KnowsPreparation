import type { ReactNode } from "react";
import { UnstyledButton, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import {
  CircleUserRound,
  Gauge,
  GraduationCap,
  BrainCircuit,
  Moon,
  FlaskConical,
  Settings,
  Sun,
} from "lucide-react";

import type { AppView } from "../lib/app-route";

interface AppShellProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  children: ReactNode;
  weekLabel: string;
  navigationLocked?: boolean;
}

const navigation: Array<{
  id: AppView;
  label: string;
  shortLabel: string;
  icon: typeof Gauge;
}> = [
  { id: "today", label: "Сегодня", shortLabel: "Сегодня", icon: Gauge },
  { id: "preparation", label: "Подготовка", shortLabel: "Подготовка", icon: GraduationCap },
  { id: "skills", label: "Навыки", shortLabel: "Навыки", icon: BrainCircuit },
  { id: "research", label: "Исследования", shortLabel: "Исслед.", icon: FlaskConical },
  { id: "settings", label: "Ещё", shortLabel: "Ещё", icon: Settings },
];

const preparationViews: AppView[] = [
  "preparation",
  "career",
  "yandex",
  "ozon",
  "plan",
  "interview",
  "mock-interview",
];

const knowledgeViews: AppView[] = [
  "skills",
  "knowledge",
  "ai-course",
  "resources",
  "questions",
  "review",
  "analytics",
  "algorithms",
];

const isNavigationActive = (navigationId: AppView, activeView: AppView) =>
  navigationId === activeView ||
  (navigationId === "preparation" && preparationViews.includes(activeView)) ||
  (navigationId === "skills" && knowledgeViews.includes(activeView));

function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const colorScheme = useComputedColorScheme("dark");
  const nextColorScheme = colorScheme === "dark" ? "light" : "dark";
  const label = colorScheme === "dark" ? "Включить светлую тему" : "Включить тёмную тему";

  function toggleTheme() {
    setColorScheme(nextColorScheme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", nextColorScheme === "light" ? "#f4f8f5" : "#07110f");
  }

  return (
    <UnstyledButton
      className="theme-toggle"
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
    >
      {colorScheme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </UnstyledButton>
  );
}

export function AppShell({ activeView, onViewChange, children, weekLabel, navigationLocked = false }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">FS</div>
          <div>
            <strong>Frontend Sprint</strong>
            <span>Interview OS</span>
          </div>
          <ThemeToggle />
        </div>

        <nav aria-label="Основная навигация">
          {navigation.map(({ id, label, icon: Icon }) => (
            <UnstyledButton
              key={id}
              className={isNavigationActive(id, activeView) ? "nav-button active" : "nav-button"}
              type="button"
              disabled={navigationLocked}
              title={navigationLocked ? "Навигация заблокирована до завершения экзамена" : undefined}
              onClick={() => onViewChange(id)}
              aria-current={isNavigationActive(id, activeView) ? "page" : undefined}
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
          <ThemeToggle />
        </header>
        <main className="main-content">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Мобильная навигация">
        {navigation.map(({ id, shortLabel, icon: Icon }) => (
          <UnstyledButton
            key={id}
            className={isNavigationActive(id, activeView) ? "active" : ""}
            type="button"
            disabled={navigationLocked}
            title={navigationLocked ? "Заверши экзамен, чтобы перейти в другой раздел" : undefined}
            onClick={() => onViewChange(id)}
            aria-current={isNavigationActive(id, activeView) ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{shortLabel}</span>
          </UnstyledButton>
        ))}
      </nav>
    </div>
  );
}
