import type { BootstrapData } from "../types";
import { YandexSprintView } from "./YandexSprintView";

interface TBankSprintViewProps {
  data: BootstrapData;
  onOpenDay: (dayId: string) => void;
}

export function TBankSprintView(props: TBankSprintViewProps) {
  return (
    <YandexSprintView
      {...props}
      description="Language/framework, algorithms, architecture и team matching — отдельные направления официального маршрута Т-Банка."
      eyebrow="Т-Банк · 10 дней"
      priorityLabel="Algorithms · Architecture"
      sprintDays={props.data.tbankSprint}
      track="tbank"
      title="Подготовка к Т-Банку"
      weekTitles={["Language, framework и algorithms", "Architecture и полные моки"]}
    />
  );
}
