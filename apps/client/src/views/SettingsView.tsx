import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Button, Switch, TextInput } from "@mantine/core";
import {
  Bell,
  BookOpenCheck,
  BrainCircuit,
  Building2,
  CalendarClock,
  Code2,
  Download,
  LibraryBig,
  LogOut,
  Server,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import { getApiUrl } from "../api";
import { parseBackupJson } from "../lib/backup";
import { remindersAvailable } from "../lib/notifications";
import type { BootstrapData, LearningBackup, SettingsPatch } from "../types";

interface SettingsViewProps {
  data: BootstrapData;
  onOpenOzon: () => void;
  onOpenAiCourse: () => void;
  onOpenAlgorithms: () => void;
  onOpenQuestions: () => void;
  onOpenResources: () => void;
  onUpdateSettings: (settings: SettingsPatch) => Promise<boolean>;
  onExportBackup: () => Promise<boolean>;
  onImportBackup: (backup: LearningBackup) => Promise<number | null>;
  onLogout: () => void;
}

export function SettingsView({
  data,
  onOpenOzon,
  onOpenAiCourse,
  onOpenAlgorithms,
  onOpenQuestions,
  onOpenResources,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onLogout,
}: SettingsViewProps) {
  const [startDate, setStartDate] = useState(data.settings.startDate);
  const [reminderEnabled, setReminderEnabled] = useState(data.settings.reminderEnabled);
  const [reminderTime, setReminderTime] = useState(data.settings.reminderTime);
  const [adaptiveTodayEnabled, setAdaptiveTodayEnabled] = useState(
    data.settings.adaptiveTodayEnabled,
  );
  const [busy, setBusy] = useState<
    "date" | "reminder" | "adaptive" | "export" | "import" | null
  >(null);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeReminders = remindersAvailable();

  async function handleDateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("date");
    setStatus("");
    const saved = await onUpdateSettings({ startDate });
    setBusy(null);
    if (saved) setStatus("Дата старта сохранена.");
  }

  async function saveReminder(enabled = reminderEnabled) {
    setBusy("reminder");
    setStatus("");
    const saved = await onUpdateSettings({ reminderEnabled: enabled, reminderTime });
    setBusy(null);
    if (saved) setStatus(enabled ? `Напоминание включено на ${reminderTime}.` : "Напоминание выключено.");
    return saved;
  }

  async function handleReminderToggle(enabled: boolean) {
    setReminderEnabled(enabled);
    if (!(await saveReminder(enabled))) setReminderEnabled(!enabled);
  }

  async function handleAdaptiveToggle(enabled: boolean) {
    setAdaptiveTodayEnabled(enabled);
    setBusy("adaptive");
    setStatus("");
    const saved = await onUpdateSettings({ adaptiveTodayEnabled: enabled });
    setBusy(null);
    if (!saved) setAdaptiveTodayEnabled(!enabled);
    else setStatus(enabled ? "Адаптивный план включён." : "Включён план по календарю.");
  }

  async function handleExport() {
    setBusy("export");
    setStatus("");
    const exported = await onExportBackup();
    setBusy(null);
    if (exported) setStatus("Бэкап подготовлен. Сохрани JSON в надёжное место.");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    if (!window.confirm("Восстановить данные из этого файла? Текущие записи не удалятся.")) return;
    setBusy("import");
    setStatus("");
    try {
      const total = await onImportBackup(parseBackupJson(await file.text()));
      if (total !== null) setStatus(`Восстановлено записей: ${total}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Не удалось прочитать файл");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Управление</p>
          <h1>Ещё</h1>
          <p>Дополнительные программы и настройки приложения.</p>
        </div>
      </header>

      {status ? <p className="settings-status" role="status">{status}</p> : null}

      <section className="settings-card">
        <div className="settings-icon"><LibraryBig /></div>
        <div>
          <h2>Материалы и практика</h2>
          <p>Библиотека источников, банк вопросов и отдельный трек алгоритмов.</p>
          <div className="settings-controls">
            <Button className="secondary-button" leftSection={<LibraryBig size={17} />} type="button" variant="default" onClick={onOpenResources}>
              Библиотека
            </Button>
            <Button className="secondary-button" leftSection={<BookOpenCheck size={17} />} type="button" variant="default" onClick={onOpenQuestions}>
              Вопросы
            </Button>
            <Button className="secondary-button" leftSection={<Code2 size={17} />} type="button" variant="default" onClick={onOpenAlgorithms}>
              Алгоритмы
            </Button>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><Building2 /></div>
        <div>
          <h2>Подготовка к Ozon</h2>
          <p>14 дней: JavaScript, асинхронность, браузер, сеть, React и мок-интервью.</p>
          <Button className="primary-button" type="button" onClick={onOpenOzon}>
            Открыть Ozon-спринт
          </Button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><Sparkles /></div>
        <div>
          <h2>Персональный AI-курс</h2>
          <p>Сгенерированный план, статьи, квизы, практика и чат по выбранной цели.</p>
          <Button className="primary-button" type="button" onClick={onOpenAiCourse}>
            Открыть AI-курс
          </Button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><BrainCircuit /></div>
        <div>
          <h2>Адаптивное «Сегодня»</h2>
          <p>Собирает 120 минут из слабых тем, повторений, практики и следующего блока программы. Обычный календарный план остаётся ниже.</p>
          <Switch
            checked={adaptiveTodayEnabled}
            disabled={busy === "adaptive"}
            label="Подбирать задания по результатам"
            onChange={(event) =>
              void handleAdaptiveToggle(event.currentTarget.checked)
            }
          />
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><CalendarClock /></div>
        <div>
          <h2>Дата старта</h2>
          <p>Сегодняшнее задание рассчитывается относительно этой даты.</p>
          <form className="inline-form" onSubmit={handleDateSubmit}>
            <TextInput
              className="start-date-input"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label="Дата старта"
              size="md"
              required
            />
            <Button className="primary-button" type="submit" loading={busy === "date"}>Сохранить</Button>
          </form>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><Bell /></div>
        <div>
          <h2>Ежедневное напоминание</h2>
          <p>{nativeReminders ? "Android напомнит выделить 120 минут на подготовку." : "Локальные напоминания доступны в APK."}</p>
          <div className="settings-controls">
            <Switch
              checked={reminderEnabled}
              disabled={!nativeReminders || busy === "reminder"}
              label="Напоминать каждый день"
              onChange={(event) => void handleReminderToggle(event.currentTarget.checked)}
            />
            <TextInput
              type="time"
              value={reminderTime}
              disabled={!nativeReminders || !reminderEnabled}
              aria-label="Время напоминания"
              onChange={(event) => setReminderTime(event.currentTarget.value)}
            />
            <Button
              className="secondary-button"
              type="button"
              variant="default"
              loading={busy === "reminder"}
              disabled={!nativeReminders || !reminderEnabled}
              onClick={() => void saveReminder()}
            >
              Сохранить время
            </Button>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><Download /></div>
        <div>
          <h2>Экспорт и восстановление</h2>
          <p>JSON-бэкап содержит прогресс, решения, AI-статьи, чаты и мок-интервью. Пароль и адрес API не экспортируются.</p>
          <div className="settings-controls">
            <Button className="primary-button" type="button" leftSection={<Download size={17} />} loading={busy === "export"} onClick={() => void handleExport()}>
              Создать бэкап
            </Button>
            <Button className="secondary-button" type="button" variant="default" leftSection={<Upload size={17} />} loading={busy === "import"} onClick={() => fileInputRef.current?.click()}>
              Восстановить JSON
            </Button>
            <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={(event) => void handleImport(event)} />
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><Server /></div>
        <div>
          <h2>Точка синхронизации</h2>
          <p className="code-value">{getApiUrl()}</p>
          <p>MongoDB-реквизиты находятся только на API-сервере и не попадают в приложение.</p>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-icon"><ShieldCheck /></div>
        <div>
          <h2>Сессия устройства</h2>
          <p>Выйди, чтобы сменить API или заново ввести пароль.</p>
          <Button
            className="secondary-button danger"
            type="button"
            variant="default"
            leftSection={<LogOut size={18} />}
            onClick={onLogout}
          >
            Выйти на этом устройстве
          </Button>
        </div>
      </section>
    </div>
  );
}
