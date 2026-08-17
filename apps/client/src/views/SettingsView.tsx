import { useState, type FormEvent } from "react";
import { Button, TextInput } from "@mantine/core";
import { Building2, CalendarClock, LogOut, Server, ShieldCheck } from "lucide-react";

import { getApiUrl } from "../api";
import type { BootstrapData } from "../types";

interface SettingsViewProps {
  data: BootstrapData;
  onOpenOzon: () => void;
  onUpdateStartDate: (startDate: string) => void;
  onLogout: () => void;
}

export function SettingsView({
  data,
  onOpenOzon,
  onUpdateStartDate,
  onLogout,
}: SettingsViewProps) {
  const [startDate, setStartDate] = useState(data.settings.startDate);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdateStartDate(startDate);
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
        <div className="settings-icon"><CalendarClock /></div>
        <div>
          <h2>Дата старта</h2>
          <p>Сегодняшнее задание рассчитывается относительно этой даты.</p>
          <form className="inline-form" onSubmit={handleSubmit}>
            <TextInput
              className="start-date-input"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label="Дата старта"
              size="md"
              required
            />
            <Button className="primary-button" type="submit">Сохранить</Button>
          </form>
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
