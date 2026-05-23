"use client";

import { Bold, Code2, Eye, Heading1, Italic, List, ListOrdered, MessageSquareQuote, Pencil, SplitSquareHorizontal } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { renderSafeMarkdown } from "@/lib/markdown";

type MarkdownEditorProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
};

type Mode = "edit" | "split" | "preview";

const snippets = [
  { label: "หัวข้อ", icon: Heading1, before: "# ", after: "" },
  { label: "ตัวหนา", icon: Bold, before: "**", after: "**" },
  { label: "ตัวเอียง", icon: Italic, before: "*", after: "*" },
  { label: "รายการ", icon: List, before: "- ", after: "" },
  { label: "ลำดับ", icon: ListOrdered, before: "1. ", after: "" },
  { label: "อ้างอิง", icon: MessageSquareQuote, before: "> ", after: "" },
  { label: "โค้ด", icon: Code2, before: "`", after: "`" },
] as const;

export function MarkdownEditor({
  label = "ข้อความ Markdown",
  value,
  onChange,
  placeholder = "เขียนข้อความด้วย Markdown เช่น # หัวข้อ, **ตัวหนา**, - รายการ",
  minHeightClassName = "min-h-72",
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<Mode>("split");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewHtml = useMemo(() => renderSafeMarkdown(value), [value]);

  function insertSnippet(before: string, after: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value ? `${value}\n${before}${after}` : `${before}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const needsLineStart = ["# ", "- ", "1. ", "> "].includes(before) && start > 0 && value[start - 1] !== "\n";
    const prefix = needsLineStart ? "\n" : "";
    const next = `${value.slice(0, start)}${prefix}${before}${selected}${after}${value.slice(end)}`;
    const cursor = start + prefix.length + before.length + selected.length + after.length;

    onChange(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-black text-slate-950">{label}</p>
        <div className="flex flex-wrap items-center gap-1">
          {snippets.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                title={item.label}
                type="button"
                onClick={() => insertSnippet(item.before, item.after)}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex w-fit overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
        {[
          { value: "edit", label: "เขียน", icon: Pencil },
          { value: "split", label: "คู่กัน", icon: SplitSquareHorizontal },
          { value: "preview", label: "พรีวิว", icon: Eye },
        ].map((item) => {
          const Icon = item.icon;
          const active = mode === item.value;
          return (
            <button
              key={item.value}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition ${active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              type="button"
              onClick={() => setMode(item.value as Mode)}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className={`grid gap-3 ${mode === "split" ? "lg:grid-cols-2" : ""}`}>
        {mode !== "preview" ? (
          <textarea
            ref={textareaRef}
            className={`${minHeightClassName} w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 font-mono text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100`}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : null}
        {mode !== "edit" ? (
          <div className={`${minHeightClassName} markdown-body overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700`}>
            {previewHtml ? (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <p className="text-slate-400">พรีวิวข้อความจะแสดงตรงนี้</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
