import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FeedbackVazioProps {
  titulo: string;
  mensagem?: string;
  textoBotao?: string;
  onAcao?: () => void;
}

export default function FeedbackVazio({
  titulo,
  mensagem,
  textoBotao,
  onAcao,
}: FeedbackVazioProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <Inbox className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-1">{titulo}</h3>
      {mensagem && <p className="text-sm text-slate-500 max-w-md mb-6">{mensagem}</p>}
      {textoBotao && onAcao && (
        <Button variant="outline" size="sm" onClick={onAcao}>
          {textoBotao}
        </Button>
      )}
    </div>
  );
}
