import { AlertTriangle } from "lucide-react";

interface Props {
  warnings: string[];
}

export default function WarningBanner({ warnings }: Props) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-400" />
          <span>{w}</span>
        </div>
      ))}
    </div>
  );
}
