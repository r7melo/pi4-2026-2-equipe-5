import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface FeedbackErroProps {
  titulo?: string;
  mensagem?: string;
  onTentarNovamente?: () => void;
}

export default function FeedbackErro({
  titulo = "Não foi possível carregar os dados",
  mensagem = "Erro de conexão ou resposta do servidor.",
  onTentarNovamente,
}: FeedbackErroProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1">{titulo}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">{mensagem}</p>
      {onTentarNovamente && (
        <Button variant="outline" size="sm" onClick={onTentarNovamente}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
