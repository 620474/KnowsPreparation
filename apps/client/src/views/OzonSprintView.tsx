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
      description="React-transfer программа по присланным конспектам 2024 года. JavaScript, async, браузер и алгоритмы переносимы; React-блоки не выдаются за официальный актуальный стек Ozon."
      eyebrow="Ozon · React-transfer · 14 дней"
      sprintDays={props.data.ozonSprint}
      track="ozon"
      title="Ozon: React-transfer"
      weekTitles={["JavaScript и асинхронность", "Браузер, перенос React-знаний и мок"]}
    />
  );
}
