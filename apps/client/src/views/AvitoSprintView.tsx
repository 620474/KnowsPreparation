import type { BootstrapData } from "../types";
import { YandexSprintView } from "./YandexSprintView";

interface AvitoSprintViewProps {
  data: BootstrapData;
  onOpenDay: (dayId: string) => void;
}

export function AvitoSprintView(props: AvitoSprintViewProps) {
  return (
    <YandexSprintView
      {...props}
      description="Programming, Platform, Design и защита решений по официальной структуре найма Avito. Учебные задачи — аналоги, а не утечка реальных вопросов."
      eyebrow="Avito · 12 дней"
      priorityLabel="Programming · Platform · Design"
      sprintDays={props.data.avitoSprint}
      track="avito"
      title="Подготовка к Avito"
      weekTitles={["Programming и Platform", "Design, production и моки"]}
    />
  );
}
