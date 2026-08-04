import { Anchor, Badge } from "@mantine/core";
import { ExternalLink } from "lucide-react";

import type { LearningResource, ResourceKind } from "../types";

interface ResourceLinksProps {
  resourceIds: string[];
  resources: LearningResource[];
  compact?: boolean;
}

const kindLabels: Record<ResourceKind, string> = {
  main: "Сначала",
  "deep-dive": "Углубление",
  practice: "Практика",
  reference: "Справочник",
  "case-study": "Кейс",
};

const kindColors: Record<ResourceKind, string> = {
  main: "teal",
  "deep-dive": "violet",
  practice: "orange",
  reference: "gray",
  "case-study": "blue",
};

export function ResourceLinks({ resourceIds, resources, compact = false }: ResourceLinksProps) {
  const resourceMap = new Map(resources.map((item) => [item.id, item]));
  const linkedResources = resourceIds.flatMap((id) => {
    const item = resourceMap.get(id);
    return item ? [item] : [];
  });

  if (linkedResources.length === 0) return null;

  return (
    <div className={compact ? "resource-links compact" : "resource-links"}>
      {linkedResources.map((item) => (
        <Anchor
          className="resource-link"
          href={item.url}
          key={item.id}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${item.title}, открыть внешний источник`}
        >
          <ExternalLink size={compact ? 12 : 14} />
          <span>{item.title}</span>
          <span className="resource-link-badges">
            <Badge color={kindColors[item.kind]} size="xs" variant="light">
              {kindLabels[item.kind]}
            </Badge>
            {item.paywall ? <Badge color="red" size="xs" variant="light">Платно</Badge> : null}
            {item.registrationRequired ? (
              <Badge color="yellow" size="xs" variant="light">Регистрация</Badge>
            ) : null}
          </span>
        </Anchor>
      ))}
    </div>
  );
}
