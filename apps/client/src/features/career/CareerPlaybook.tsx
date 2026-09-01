import { Button } from "@mantine/core";
import { CheckCircle2, Copy, ExternalLink, MapPinned, MessageSquareText } from "lucide-react";

import {
  careerChannels,
  careerMessageTemplates,
  interviewChecklist,
} from "./career-playbook";

export function CareerPlaybook() {
  return (
    <div className="career-playbook-grid">
      <section className="career-panel career-playbook-wide">
        <div className="section-heading"><div><p className="eyebrow">Каналы</p><h2>Где искать</h2></div><MapPinned /></div>
        <div className="career-channel-grid">
          {careerChannels.map((channel) => (
            <article key={channel.title}>
              <div><strong>{channel.title}</strong><p>{channel.note}</p></div>
              <Button component="a" href={channel.url} target="_blank" rel="noreferrer" rightSection={<ExternalLink size={15} />} size="xs" variant="default">Открыть</Button>
            </article>
          ))}
        </div>
        <p className="career-footnote">Доступность площадок и конкретных вакансий меняется. Проверяй дату публикации и карьерный сайт компании перед откликом.</p>
      </section>

      <section className="career-panel">
        <div className="section-heading"><div><p className="eyebrow">Перед встречей</p><h2>Чек-лист интервью</h2></div><CheckCircle2 /></div>
        <ol className="career-checklist">
          {interviewChecklist.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>

      <section className="career-panel career-playbook-wide">
        <div className="section-heading"><div><p className="eyebrow">Direct outreach</p><h2>Шаблоны сообщений</h2></div><MessageSquareText /></div>
        <div className="career-template-list">
          {careerMessageTemplates.map((template) => (
            <article key={template.title}>
              <strong>{template.title}</strong>
              <p>{template.text}</p>
              <Button leftSection={<Copy size={15} />} size="xs" variant="subtle" onClick={() => void navigator.clipboard?.writeText(template.text)}>Скопировать</Button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
