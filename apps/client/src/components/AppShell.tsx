import type { ReactNode } from "react";
import { UnstyledButton, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleUserRound,
  Code2,
  Gauge,
  LibraryBig,
  ListChecks,
  Moon,
  Settings,
  Sun,
} from "lucide-react";

import type { AppView } from "../lib/app-route";

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
  { id: "ozon", label: "Ozon-спринт", shortLabel: "Ozon", icon: Building2 },
  { id: "interview", label: "Интервью", shortLabel: "Собес", icon: BriefcaseBusiness },
  { id: "plan", label: "Учебный план", shortLabel: "План", icon: CalendarDays },
  { id: "resources", label: "Библиотека", shortLabel: "База", icon: LibraryBig },
  { id: "questions", label: "Банк вопросов", shortLabel: "Вопр.", icon: BookOpenCheck },
  { id: "algorithms", label: "Алгоритмы", shortLabel: "Алго", icon: Code2 },
  { id: "settings", label: "Ещё", shortLabel: "Ещё", icon: Settings },
];

const mobileNavigation = (["yandex", "ozon", "interview", "today", "settings"] as const)
  .map((id) => navigation.find((item) => item.id === id))
  .filter((item): item is (typeof navigation)[number] => Boolean(item));

const isNavigationActive = (navigationId: AppView, activeView: AppView) =>
  navigationId === activeView ||
  (navigationId === "settings" && activeView === "ai-course") ||
  (navigationId === "questions" &&
    ["review", "mock-interview", "analytics"].includes(activeView));

const isMobileNavigationActive = (navigationId: AppView, activeView: AppView) =>
  isNavigationActive(navigationId, activeView) ||
  (navigationId === "settings" &&
    ["ai-course", "plan", "resources", "questions", "review", "mock-interview", "analytics", "algorithms"].includes(activeView));

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
          <ThemeToggle />
        </div>

        <nav aria-label="Основная навигация">
          {navigation.map(({ id, label, icon: Icon }) => (
            <UnstyledButton
              key={id}
              className={isNavigationActive(id, activeView) ? "nav-button active" : "nav-button"}
              type="button"
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
        {mobileNavigation.map(({ id, shortLabel, icon: Icon }) => (
          <UnstyledButton
            key={id}
            className={isMobileNavigationActive(id, activeView) ? "active" : ""}
            type="button"
            onClick={() => onViewChange(id)}
            aria-current={isMobileNavigationActive(id, activeView) ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{shortLabel}</span>
          </UnstyledButton>
        ))}
      </nav>
    </div>
  );
}
