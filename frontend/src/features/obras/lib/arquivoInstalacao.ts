import axios from "axios";
import type { FormatoExportacaoInstalacao } from "@/types";
import type { ErroExportacaoInstalacao } from "../types/exportacaoInstalacao";

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
    try { dado = JSON.parse(await dado.text()) as unknown; } catch { dado = null; }
  }
  const envelope: unknown = registro(dado) && registro(dado.error) ? dado.error : dado;
  const codigo = registro(envelope) && typeof envelope.code === "string" ? envelope.code : null;
  return { status, codigo, mensagem: mensagemErro(status, codigo) };
}

export async function validarAssinaturaArquivo(blob: Blob, formato: FormatoExportacaoInstalacao): Promise<boolean> {
  if (!(blob instanceof Blob) || blob.size === 0) return false;
  const mime = blob.type.split(";")[0].trim().toLowerCase();
  const esperado = formato === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (mime !== esperado) return false;
  const bytes = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  if (formato === "pdf") return [0x25, 0x50, 0x44, 0x46, 0x2d].every((b, i) => bytes[i] === b);
  if (formato === "xlsx") return [0x50, 0x4b, 0x03, 0x04].every((b, i) => bytes[i] === b);
  return false;
}

export function baixarArquivoBlob(blob: Blob, nomeArquivo: string): () => void {
  const url = window.URL.createObjectURL(blob);
  let link: HTMLAnchorElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let limpo = false;
  const limpar = () => {
    if (limpo) return;
    limpo = true;
    if (timer !== undefined) clearTimeout(timer);
    link?.remove();
    window.URL.revokeObjectURL(url);
  };
  try {
    link = document.createElement("a");
    link.href = url; link.download = nomeArquivo; link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    timer = setTimeout(limpar, 1000);
    return limpar;
  } catch (erro: unknown) {
    limpar();
    throw erro;
  }
}
