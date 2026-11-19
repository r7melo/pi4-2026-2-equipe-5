import axios from "axios";
import { baixarArquivoBlob, lerJsonDeBlob, validarAssinaturaArquivo } from "@/shared/lib/arquivoBlob";
import type { ErroExportacaoInstalacao } from "../types/exportacaoInstalacao";

export { baixarArquivoBlob, validarAssinaturaArquivo };

function registro(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}
function mensagemErro(status: number, codigo: string | null): string {
  if (codigo === "INVALID_PARAMETER") return "Formato de exportação inválido.";
  if (status === 403 || codigo === "ACCESS_DENIED") return "Você não tem permissão para exportar.";
  if (codigo === "OBRA_NOT_FOUND") return "Obra não encontrada.";
  if (codigo === "ROUTE_NOT_FOUND") return "Exportação indisponível no servidor.";
  return "Não foi possível gerar o arquivo.";
}
export async function extrairErroBlob(erro: unknown): Promise<ErroExportacaoInstalacao> {
  const resposta: unknown = axios.isAxiosError(erro) ? erro.response : registro(erro) ? erro.response : null;
  const status = registro(resposta) && typeof resposta.status === "number" ? resposta.status : 500;
  let dado: unknown = registro(resposta) ? resposta.data : null;
  if (dado instanceof Blob) {
    dado = await lerJsonDeBlob(dado);
  }
  const envelope: unknown = registro(dado) && registro(dado.error) ? dado.error : dado;
  const codigo = registro(envelope) && typeof envelope.code === "string" ? envelope.code : null;
  return { status, codigo, mensagem: mensagemErro(status, codigo) };
}
