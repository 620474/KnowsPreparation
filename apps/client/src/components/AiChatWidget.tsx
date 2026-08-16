import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Drawer,
  Loader,
  Select,
  Textarea,
  UnstyledButton,
} from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, MessageCircle, Send, Sparkles, Trash2 } from "lucide-react";

import { learningApi } from "../api";
import type { AiChatHistory, AiChatScope } from "../types";

export interface AiChatTopic {
  id: string;
  title: string;
  objective: string;
}

interface AiChatWidgetProps {
  enabled: boolean;
  scope: AiChatScope;
  topics: AiChatTopic[];
  opened: boolean;
  activeItemId: string | null;
  draftRequest: { id: number; content: string } | null;
  onClose: () => void;
  onOpen: () => void;
  onItemChange: (itemId: string) => void;
}

const chatKey = (scope: AiChatScope, itemId: string) => ["ai-chat", scope, itemId] as const;

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

export function AiChatWidget({
  enabled,
  scope,
  topics,
  opened,
  activeItemId,
  draftRequest,
  onClose,
  onOpen,
  onItemChange,
}: AiChatWidgetProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(draftRequest?.content ?? "");
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeItem = topics.find((item) => item.id === activeItemId) ?? null;

  const chatQuery = useQuery({
    queryKey: chatKey(scope, activeItemId ?? "none"),
    queryFn: () => learningApi.getAiChat(scope, activeItemId ?? ""),
    enabled: opened && Boolean(activeItemId),
    staleTime: 15_000,
  });

  const sendMutation = useMutation({
    mutationFn: ({ itemId, content }: { itemId: string; content: string }) =>
      learningApi.sendAiChatMessage(scope, itemId, content),
    onSuccess: ({ messages }, { itemId }) => {
      queryClient.setQueryData<AiChatHistory>(chatKey(scope, itemId), (current) =>
        current
          ? { ...current, messages: [...current.messages, ...messages] }
          : {
              itemId,
              title: topics.find((item) => item.id === itemId)?.title ?? "AI-чат",
              messages,
            },
      );
      setDraft("");
    },
  });

  const clearMutation = useMutation({
    mutationFn: (itemId: string) => learningApi.clearAiChat(scope, itemId),
    onSuccess: (_result, itemId) => {
      queryClient.setQueryData<AiChatHistory>(chatKey(scope, itemId), (current) =>
        current ? { ...current, messages: [] } : current,
      );
    },
  });

  const messages = chatQuery.data?.messages ?? [];
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sendMutation.isPending]);

  useEffect(() => {
    if (!opened || !draftRequest) return;
    window.requestAnimationFrame(() => textareaRef.current?.focus());
  }, [draftRequest, opened]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!activeItemId || !content || sendMutation.isPending) return;
    sendMutation.mutate({ itemId: activeItemId, content });
  };

  if (topics.length === 0) return null;

  return (
    <>
      <UnstyledButton
        className="ai-chat-fab"
        type="button"
        aria-label={`Открыть AI-чат${activeItem ? ` по теме ${activeItem.title}` : ""}`}
        onClick={onOpen}
      >
        <MessageCircle size={24} />
        <span>AI</span>
      </UnstyledButton>

      <Drawer
        className="ai-chat-drawer"
        opened={opened}
        onClose={onClose}
        position="right"
        size="md"
        title={
          <div className="ai-chat-title">
            <Sparkles size={19} />
            <div><strong>Наставник</strong><span>Понимает текущий урок</span></div>
          </div>
        }
      >
        <div className="ai-chat-layout">
          <div className="ai-chat-context">
            <Select
              label="Текущая тема"
              data={topics.map((item, index) => ({
                value: item.id,
                label: `${index + 1}. ${item.title}`,
              }))}
              value={activeItemId}
              allowDeselect={false}
              onChange={(value) => value && onItemChange(value)}
            />
            {activeItem ? <p>{activeItem.objective}</p> : null}
          </div>

          <div className="ai-chat-messages" aria-live="polite">
            {chatQuery.isPending ? (
              <div className="ai-chat-state"><Loader color="mint" size="sm" />Загружаю историю…</div>
            ) : null}
            {chatQuery.isError ? (
              <Alert color="red" icon={<AlertTriangle size={16} />} variant="light">
                {chatQuery.error.message}
              </Alert>
            ) : null}
            {!chatQuery.isPending && messages.length === 0 ? (
              <div className="ai-chat-empty">
                <MessageCircle size={30} />
                <strong>Спроси по текущей теме</strong>
                <p>Можно прислать код, ошибку или попросить объяснить материал проще.</p>
              </div>
            ) : null}
            {messages.map((message) => (
              <article className={`ai-chat-message ${message.role}`} key={message.id}>
                <div>{message.role === "user" ? "Ты" : "AI"}<span>{formatTime(message.createdAt)}</span></div>
                <p>{message.content}</p>
              </article>
            ))}
            {sendMutation.isPending ? (
              <div className="ai-chat-typing"><Loader color="mint" size="xs" />AI разбирает вопрос…</div>
            ) : null}
            {sendMutation.isError ? (
              <Alert color="red" icon={<AlertTriangle size={16} />} variant="light">
                {sendMutation.error.message}
              </Alert>
            ) : null}
            <div ref={messageEndRef} />
          </div>

          <form className="ai-chat-form" onSubmit={submit}>
            <Textarea
              ref={textareaRef}
              aria-label="Сообщение AI-наставнику"
              placeholder="Вставь код, ошибку или задай вопрос…"
              minRows={3}
              maxRows={8}
              maxLength={12_000}
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
            />
            <div className="ai-chat-actions">
              <Button
                className="secondary-button danger"
                type="button"
                variant="default"
                leftSection={<Trash2 size={16} />}
                loading={clearMutation.isPending}
                disabled={!activeItemId || messages.length === 0}
                onClick={() => activeItemId && clearMutation.mutate(activeItemId)}
              >
                Очистить
              </Button>
              <Button
                className="primary-button"
                type="submit"
                leftSection={<Send size={16} />}
                loading={sendMutation.isPending}
                disabled={
                  !activeItemId ||
                  !draft.trim() ||
                  !enabled ||
                  chatQuery.isPending
                }
              >
                Отправить
              </Button>
            </div>
          </form>
        </div>
      </Drawer>
    </>
  );
}
