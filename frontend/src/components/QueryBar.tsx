import { useState, useRef, type KeyboardEvent } from "react";
import { Search, Loader2, Send } from "lucide-react";

interface Props {
  onQuery: (question: string) => void;
  isLoading: boolean;
}

const EXAMPLE_QUESTIONS = [
  "Who communicated most about natural gas trading?",
  "What relationships involve FERC?",
  "What entities are linked to EnronOnline?",
  "Who sent the most emails about energy trading?",
];

export default function QueryBar({ onQuery, isLoading }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const q = value.trim();
    if (!q || isLoading) return;
    onQuery(q);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative glass rounded-xl overflow-hidden transition-all duration-200 focus-within:border-accent-blue/40 focus-within:shadow-[0_0_0_1px_rgba(59,130,246,0.3)]">
        <div className="flex items-start gap-3 p-4">
          <Search size={18} className="text-slate-500 mt-0.5 shrink-0" />
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask a question about the Enron knowledge graph…"
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-slate-200 placeholder-slate-600 outline-none text-sm leading-relaxed disabled:opacity-60"
          />
          <button
            onClick={submit}
            disabled={!value.trim() || isLoading}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue border border-accent-blue/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 mt-0.5"
            title="Send (Enter)"
          >
            {isLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>

        {isLoading && (
          <div className="h-0.5 bg-surface-700 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent-blue via-accent-purple to-accent-cyan animate-[shimmer_1.5s_infinite] bg-[length:200%_100%]" />
          </div>
        )}
      </div>

      {/* Example questions */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => {
              setValue(q);
              inputRef.current?.focus();
            }}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full bg-surface-700/50 text-slate-500 hover:text-slate-300 hover:bg-surface-600/60 border border-white/5 transition-all duration-200 disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
