import { Loader2 } from "lucide-react";

export function Loader({ text = "Chargement..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
