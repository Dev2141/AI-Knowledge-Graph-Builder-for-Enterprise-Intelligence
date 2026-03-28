import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Sparkles } from "lucide-react";

interface Props {
  question: string;
  answer: string;
}

export default function AnswerPanel({ question, answer }: Props) {
  return (
    <div className="glass rounded-xl p-5 animate-slide-up">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-accent-blue/15">
          <Bot size={15} className="text-accent-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-slate-500 mb-0.5">Query</div>
          <div className="text-sm font-medium text-slate-200 truncate">{question}</div>
        </div>
        <Sparkles size={14} className="text-accent-purple shrink-0" />
      </div>

      <div className="answer-content prose prose-invert prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
      </div>
    </div>
  );
}
