import { Progress, UnstyledButton } from "@mantine/core";
import { Check, ChevronDown, ChevronRight, Clock3 } from "lucide-react";

import { getDayForOffset, getStudyPosition } from "../lib/date";
import type { BootstrapData } from "../types";

interface PlanViewProps {
  data: BootstrapData;
  onOpenDay: (dayId: string) => void;
}

export function PlanView({ data, onOpenDay }: PlanViewProps) {
  const currentPosition = getStudyPosition(data.settings.startDate);
  const currentWeek = Math.min(
    Math.max(currentPosition.weekNumber, 1),
    data.curriculum.length,
  );
  const currentDay = getDayForOffset(data.curriculum, currentPosition.rawOffset);

  return (
    <div className="page-stack">
      <header className="page-header plan-page-header">
        <div>
          <p className="eyebrow">
            Маршрут · {data.settings.coreWeeks} основных недель + {data.settings.bufferWeeks} буферная
          </p>
          <h1>Учебный план</h1>
          <p>Выбери день, чтобы открыть его задачи, материалы и сохранённые решения.</p>
        </div>
        <div className="header-stat"><Clock3 size={20} /><strong>168 ч</strong><span>с буфером</span></div>
      </header>

      <div className="week-list">
        {data.curriculum.map((week) => {
          const blocks = week.days.flatMap((day) => day.blocks);
          const done = blocks.filter((block) => data.progress.tasks[block.id]?.completed).length;
          const progress = Math.round((done / blocks.length) * 100);

          return (
            <details className="week-card" key={week.number} open={week.number === currentWeek}>
              <summary>
                <div className={week.isBuffer ? "week-number buffer" : "week-number"}>
                  {String(week.number).padStart(2, "0")}
                </div>
                <div className="week-summary-copy">
                  <span>{week.isBuffer ? "Буферная неделя" : `Неделя ${week.number}`}</span>
                  <h2>{week.title}</h2>
                  <p>{week.outcome}</p>
                </div>
                <div className="week-progress">
                  <strong>{progress}%</strong>
                  <span>{done}/{blocks.length}</span>
                </div>
                <ChevronDown className="summary-chevron" size={22} />
              </summary>

              <div className="plan-day-list">
                {week.days.map((day) => {
                  const completed = day.blocks.filter(
                    (block) => data.progress.tasks[block.id]?.completed,
                  ).length;
                  const dayProgress = Math.round((completed / day.blocks.length) * 100);
                  const totalMinutes = day.blocks.reduce((sum, block) => sum + block.minutes, 0);
                  const isCurrent = currentDay?.id === day.id;

                  return (
                    <UnstyledButton
                      className={isCurrent ? "plan-day-row current" : "plan-day-row"}
                      key={day.id}
                      type="button"
                      onClick={() => onOpenDay(day.id)}
                    >
                      <span className="plan-day-marker">
                        <small>День</small>
                        <strong>{String(day.dayNumber).padStart(2, "0")}</strong>
                      </span>
                      <span className="plan-day-copy">
                        <span className="plan-day-title-line">
                          <strong>{day.title}</strong>
                          {isCurrent ? <em>Сегодня</em> : null}
                        </span>
                        <small>{totalMinutes} минут · {completed} из {day.blocks.length} блоков</small>
                        <Progress color="brand" radius="xl" size={5} value={dayProgress} />
                      </span>
                      <span className={dayProgress === 100 ? "plan-day-state complete" : "plan-day-state"}>
                        {dayProgress === 100 ? <Check size={18} /> : <span>{dayProgress}%</span>}
                        <ChevronRight size={19} />
                      </span>
                    </UnstyledButton>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
