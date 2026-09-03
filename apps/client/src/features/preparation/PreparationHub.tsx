import { Button, Progress } from "@mantine/core";
import {
  ArrowRight,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  MessagesSquare,
  Target,
} from "lucide-react";

import type { BootstrapData, TaskProgress } from "../../types";

interface PreparationHubProps {
  data: BootstrapData;
  onOpenInterview: () => void;
  onOpenCareer: () => void;
  onOpenOzon: () => void;
  onOpenPlan: () => void;
  onOpenYandex: () => void;
}

interface TrackDay {
  blocks: Array<{ id: string }>;
}

const summarizeTrack = (
  days: TrackDay[],
  progress: Record<string, TaskProgress>,
) => {
  const blocks = days.flatMap((day) => day.blocks);
  const completed = blocks.filter((block) => progress[block.id]?.completed).length;
  return {
    completed,
    total: blocks.length,
    percent: blocks.length ? Math.round((completed / blocks.length) * 100) : 0,
  };
};

export function PreparationHub({
  data,
  onOpenInterview,
  onOpenCareer,
  onOpenOzon,
  onOpenPlan,
  onOpenYandex,
}: PreparationHubProps) {
  const yandex = summarizeTrack(data.yandexSprint, data.progress.tasks);
  const ozon = summarizeTrack(data.ozonSprint, data.progress.tasks);
  const curriculum = summarizeTrack(
    data.curriculum.flatMap((week) => week.days),
    data.progress.tasks,
  );

  return (
    <div className="page-stack section-hub preparation-hub">
      <header className="page-header section-hub-header">
        <div>
          <p className="eyebrow">Единый маршрут</p>
          <h1>Подготовка к собеседованиям</h1>
          <p>
            Сначала приоритетные компании, затем системный план и тренировка полного
            интервью.
          </p>
        </div>
        <div className="header-stat">
          <Clock3 size={20} />
          <strong>{data.settings.dailyMinutes}</strong>
          <span>минут в день</span>
        </div>
      </header>

      <section className="section-hub-primary-grid">
        <article className="section-hub-card priority-card">
          <span className="status-pill"><Target size={15} /> Приоритет №1</span>
          <div className="section-hub-icon"><Target /></div>
          <p className="eyebrow">21-дневный спринт</p>
          <h2>Яндекс</h2>
          <p>Платформа, алгоритмы, моки и AI-секция в порядке прохождения.</p>
          <Progress color="mint" value={yandex.percent} size="sm" />
          <div className="section-hub-progress">
            <span>{yandex.completed} из {yandex.total} блоков</span>
            <strong>{yandex.percent}%</strong>
          </div>
          <Button
            className="primary-button"
            rightSection={<ArrowRight size={17} />}
            onClick={onOpenYandex}
          >
            Продолжить Яндекс
          </Button>
        </article>

        <article className="section-hub-card">
          <div className="section-hub-icon"><Building2 /></div>
          <p className="eyebrow">14-дневный спринт</p>
          <h2>Ozon</h2>
          <p>React-transfer: JavaScript, async, браузер и алгоритмы без притворной точности по текущему стеку.</p>
          <Progress color="cyan" value={ozon.percent} size="sm" />
          <div className="section-hub-progress">
            <span>{ozon.completed} из {ozon.total} блоков</span>
            <strong>{ozon.percent}%</strong>
          </div>
          <Button className="secondary-button" variant="default" onClick={onOpenOzon}>
            Открыть Ozon
          </Button>
        </article>
      </section>

      <section className="section-hub-secondary-grid">
        <button type="button" className="section-hub-link-card" onClick={onOpenCareer}>
          <BriefcaseBusiness />
          <span>
            <small>Карьерный контроль</small>
            <strong>Поиск работы</strong>
            <span>Вакансии, follow-up, интервью и недельные KPI</span>
          </span>
          <ArrowRight />
        </button>
        <button type="button" className="section-hub-link-card" onClick={onOpenPlan}>
          <CalendarDays />
          <span>
            <small>Системная база</small>
            <strong>12-недельный учебный план</strong>
            <span>{curriculum.completed} из {curriculum.total} блоков завершено</span>
          </span>
          <ArrowRight />
        </button>
        <button type="button" className="section-hub-link-card" onClick={onOpenInterview}>
          <MessagesSquare />
          <span>
            <small>Тренировка формата</small>
            <strong>Симулятор собеседования</strong>
            <span>Платформа, live coding, AI и защита решения</span>
          </span>
          <ArrowRight />
        </button>
      </section>
    </div>
  );
}
