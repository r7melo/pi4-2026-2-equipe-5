import { Loader2 } from "lucide-react";

interface FeedbackLoadingProps {
  mensagem?: string;
}

export default function FeedbackLoading({ mensagem = "Carregando..." }: FeedbackLoadingProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-3">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-sm text-slate-500 font-medium">{mensagem}</p>
    </div>
  );
}
