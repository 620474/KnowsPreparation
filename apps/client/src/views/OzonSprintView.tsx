import type { BootstrapData } from "../types";
import { YandexSprintView } from "./YandexSprintView";

interface OzonSprintViewProps {
  data: BootstrapData;
  onOpenDay: (dayId: string) => void;
}

export function OzonSprintView(props: OzonSprintViewProps) {
  return (
    <YandexSprintView
      {...props}
      description="Программа основана на присланных конспектах интервью 2024 года и не является официальным списком вопросов Ozon."
      eyebrow="Ozon · 14 дней · без календаря"
      sprintDays={props.data.ozonSprint}
      track="ozon"
      title="Спринт к интервью Ozon"
      weekTitles={["JavaScript и асинхронность", "Браузер, React и мок-интервью"]}
    />
  );
}
