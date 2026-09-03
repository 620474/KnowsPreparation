import { useMemo, useRef, useState } from "react";
import { ActionIcon, Button, Modal, Tooltip, useComputedColorScheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { redo, undo } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import CodeMirror, {
  EditorView,
  keymap,
  type ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import {
  Maximize2,
  Minimize2,
  Minus,
  Play,
  Plus,
  Redo2,
  Undo2,
  WrapText,
} from "lucide-react";

interface CodeEditorProps {
  value: string;
  label: string;
  ariaLabel?: string;
  placeholder?: string;
  minHeight?: number;
  language?: "javascript" | "typescript";
  onChange: (value: string) => void;
  onRun?: () => void;
}

const minimumFontSize = 12;
const maximumFontSize = 20;

export function CodeEditor({
  value,
  label,
  ariaLabel = label,
  placeholder = "Напиши решение на JavaScript…",
  minHeight = 320,
  language = "javascript",
  onChange,
  onRun,
}: CodeEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const colorScheme = useComputedColorScheme("dark");
  const mobile = useMediaQuery("(max-width: 700px)");
  const [fullscreen, setFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [lineWrapping, setLineWrapping] = useState(true);

  const extensions = useMemo(
    () => [
      javascript({ jsx: true, typescript: language === "typescript" }),
      EditorView.theme({
        "&": {
          fontSize: `${fontSize}px`,
          color: "var(--text)",
          backgroundColor: "var(--surface-input)",
        },
        ".cm-content": {
          caretColor: "var(--accent)",
          fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
          padding: "14px 0 28px",
        },
        ".cm-line": {
          paddingInline: "12px",
        },
        ".cm-cursor, .cm-dropCursor": {
          borderLeftColor: "var(--accent)",
        },
        ".cm-gutters": {
          color: "var(--faint)",
          backgroundColor: "var(--surface-overlay)",
          borderRight: "1px solid var(--line)",
        },
        ".cm-activeLine, .cm-activeLineGutter": {
          backgroundColor: "rgba(124, 156, 255, 0.07)",
        },
        "&.cm-focused": {
          outline: "none",
        },
        "&.cm-focused .cm-selectionBackground, ::selection": {
          backgroundColor: "rgba(172, 148, 255, 0.32) !important",
        },
        ".cm-panels, .cm-tooltip": {
          color: "var(--text)",
          backgroundColor: "var(--panel)",
        },
      }),
      ...(lineWrapping ? [EditorView.lineWrapping] : []),
      ...(onRun
        ? [
            keymap.of([
              {
                key: "Mod-Enter",
                run: () => {
                  onRun();
                  return true;
                },
              },
            ]),
          ]
        : []),
    ],
    [fontSize, language, lineWrapping, onRun],
  );

  function runEditorCommand(command: typeof undo) {
    const view = editorRef.current?.view;
    if (view) {
      command(view);
      view.focus();
    }
  }

  function insertText(text: string) {
    const view = editorRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  }

  function insertPair(open: string, close: string) {
    const view = editorRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);
    const insertion = `${open}${selected}${close}`;
    view.dispatch({
      changes: { from, to, insert: insertion },
      selection: { anchor: selected ? from + insertion.length : from + open.length },
    });
    view.focus();
  }

  const editor = (expanded: boolean) => (
    <CodeMirror
      ref={editorRef}
      aria-label={ariaLabel}
      basicSetup={{
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        highlightSelectionMatches: true,
        lineNumbers: true,
        searchKeymap: true,
        tabSize: 2,
      }}
      className="ide-code-mirror"
      extensions={extensions}
      height={expanded ? "calc(100dvh - 190px)" : `${minHeight}px`}
      indentWithTab
      placeholder={placeholder}
      theme={colorScheme}
      value={value}
      onChange={onChange}
    />
  );

  const toolbar = (expanded: boolean) => (
    <div className="ide-editor-toolbar" aria-label="Инструменты редактора">
      <div>
        <Tooltip label="Отменить · Ctrl/Cmd+Z">
          <ActionIcon aria-label="Отменить" variant="subtle" onClick={() => runEditorCommand(undo)}>
            <Undo2 size={17} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Повторить · Ctrl/Cmd+Shift+Z">
          <ActionIcon aria-label="Повторить" variant="subtle" onClick={() => runEditorCommand(redo)}>
            <Redo2 size={17} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={lineWrapping ? "Не переносить строки" : "Переносить длинные строки"}>
          <ActionIcon
            aria-label="Переключить перенос строк"
            color={lineWrapping ? "brand" : undefined}
            variant={lineWrapping ? "light" : "subtle"}
            onClick={() => setLineWrapping((current) => !current)}
          >
            <WrapText size={17} />
          </ActionIcon>
        </Tooltip>
      </div>
      <div>
        <Tooltip label="Уменьшить шрифт">
          <ActionIcon
            aria-label="Уменьшить шрифт"
            disabled={fontSize <= minimumFontSize}
            variant="subtle"
            onClick={() => setFontSize((current) => Math.max(minimumFontSize, current - 1))}
          >
            <Minus size={16} />
          </ActionIcon>
        </Tooltip>
        <span className="ide-editor-font-size">{fontSize}px</span>
        <Tooltip label="Увеличить шрифт">
          <ActionIcon
            aria-label="Увеличить шрифт"
            disabled={fontSize >= maximumFontSize}
            variant="subtle"
            onClick={() => setFontSize((current) => Math.min(maximumFontSize, current + 1))}
          >
            <Plus size={16} />
          </ActionIcon>
        </Tooltip>
        {onRun ? (
          <Tooltip label="Запустить · Ctrl/Cmd+Enter">
            <ActionIcon aria-label="Запустить код" color="brand" variant="light" onClick={onRun}>
              <Play size={17} />
            </ActionIcon>
          </Tooltip>
        ) : null}
        <Tooltip label={expanded ? "Закрыть полный экран" : "Открыть на весь экран"}>
          <ActionIcon
            aria-label={expanded ? "Закрыть полный экран" : "Открыть на весь экран"}
            variant="subtle"
            onClick={() => setFullscreen(!expanded)}
          >
            {expanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );

  const mobileKeys = (
    <div className="ide-editor-mobile-keys" aria-label="Быстрые клавиши кода">
      <Button size="compact-xs" type="button" variant="default" onClick={() => insertText("  ")}>Tab</Button>
      <Button size="compact-xs" type="button" variant="default" onClick={() => insertPair("(", ")")}>()</Button>
      <Button size="compact-xs" type="button" variant="default" onClick={() => insertPair("{", "}")}>{"{}"}</Button>
      <Button size="compact-xs" type="button" variant="default" onClick={() => insertPair("[", "]")}>[]</Button>
      <Button size="compact-xs" type="button" variant="default" onClick={() => insertPair("`", "`")}>``</Button>
      <Button size="compact-xs" type="button" variant="default" onClick={() => insertText(" => ")}>{"=>"}</Button>
      <Button size="compact-xs" type="button" variant="default" onClick={() => insertText(";")}>;</Button>
    </div>
  );

  return (
    <>
      <section className="ide-code-editor">
        <header className="ide-editor-heading">
          <div>
            <strong>{label}</strong>
            <small>JavaScript · Ctrl/Cmd+F для поиска · Tab для отступа</small>
          </div>
          {toolbar(false)}
        </header>
        {!fullscreen ? editor(false) : null}
        {!fullscreen ? mobileKeys : null}
      </section>

      <Modal
        centered
        classNames={{ content: "ide-editor-modal", body: "ide-editor-modal-body" }}
        fullScreen={mobile}
        opened={fullscreen}
        size="90vw"
        title={label}
        onClose={() => setFullscreen(false)}
      >
        {toolbar(true)}
        {editor(true)}
        {mobileKeys}
      </Modal>
    </>
  );
}
