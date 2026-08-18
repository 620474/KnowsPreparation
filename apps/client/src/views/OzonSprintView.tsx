import type {
  AiLessonQuestionContext,
  BootstrapData,
  TaskUpdateHandler,
} from "../types";
import { YandexSprintView } from "./YandexSprintView";

interface OzonSprintViewProps {
  data: BootstrapData;
  generatingLessonId: string | null;
  generationCharacters: number;
  onGenerateLesson: (blockId: string) => void;
  onOpenLesson: (blockId: string) => void;
  onOpenChat: (blockId: string, context?: AiLessonQuestionContext) => void;
  onUpdateTask: TaskUpdateHandler;
}

export function OzonSprintView(props: OzonSprintViewProps) {
  return (
    <YandexSprintView
      {...props}
      description="Программа основана на присланных конспектах интервью 2024 года и не является официальным списком вопросов Ozon."
      eyebrow="Ozon · 14 дней · без календаря"
      lessons={props.data.ai.lessons.ozon}
      sprintDays={props.data.ozonSprint}
      title="Спринт к интервью Ozon"
      weekTitles={["JavaScript и асинхронность", "Браузер, React и мок-интервью"]}
    />
  );
}
