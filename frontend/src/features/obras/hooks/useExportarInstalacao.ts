import { useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import axios from "axios";
import { toast } from "sonner";
import type { FormatoExportacaoInstalacao } from "@/types";
import type { EstadoExportacao } from "../types/exportacaoInstalacao";
import { consultarDadosInstalacao, solicitarArquivoInstalacao } from "../services/exportacaoInstalacao";
import { avaliarCompletudeInstalacao } from "@/shared/lib/instalacao";
import { extrairErroBlob, validarAssinaturaArquivo, baixarArquivoBlob } from "../lib/arquivoInstalacao";

class ControleExportacao {
  private estado: EstadoExportacao = { fase: "ocioso", tentativa: 0 };
  private montado = false;
  private ctrl: AbortController | null = null;
  private limparDownload: (() => void) | null = null;
  private assinantes = new Set<() => void>();
  private obraId: number;
  private contextoValido: () => boolean;
  private sinalContexto?: AbortSignal;
  constructor(obraId: number, contextoValido: () => boolean, sinalContexto?: AbortSignal) {
    this.obraId = obraId; this.contextoValido = contextoValido; this.sinalContexto = sinalContexto;
  }
  ler = (): EstadoExportacao => this.estado;
  assinar = (avisar: () => void): (() => void) => {
    this.assinantes.add(avisar);
    return () => { this.assinantes.delete(avisar); };
  };
  private publicar(estado: EstadoExportacao): void {
    this.estado = estado;
    this.assinantes.forEach((avisar) => avisar());
  }
  private invalidar = (): void => {
    this.ctrl?.abort(); this.ctrl = null;
    this.limparDownload?.(); this.limparDownload = null;
    this.publicar({ fase: "ocioso", tentativa: this.estado.tentativa + 1 });
  };
  montar = (): (() => void) => {
    this.montado = true;
    this.sinalContexto?.addEventListener("abort", this.invalidar, { once: true });
    return () => {
      this.montado = false;
      this.sinalContexto?.removeEventListener("abort", this.invalidar);
      this.invalidar();
    };
  };
  private vigente(tentativa: number): boolean {
    if (!this.montado || this.estado.tentativa !== tentativa) return false;
    if (this.sinalContexto?.aborted || !this.contextoValido()) {
      this.invalidar();
      return false;
    }
    return true;
  }
  async iniciar(formato: FormatoExportacaoInstalacao, origem: number): Promise<void> {
    if (!this.vigente(origem) || (this.estado.fase !== "ocioso" && this.estado.fase !== "erro")) return;
    if (!Number.isSafeInteger(this.obraId) || this.obraId <= 0 || (formato !== "pdf" && formato !== "xlsx")) return;
    const tentativa = origem + 1;
    this.ctrl?.abort(); this.ctrl = new AbortController();
    this.publicar({ fase: "verificando", tentativa, formato });
    try {
      const dados = await consultarDadosInstalacao(this.obraId, this.ctrl.signal);
      if (!this.vigente(tentativa)) return;
      const faltantes = avaliarCompletudeInstalacao(dados);
      if (faltantes.length) this.publicar({ fase: "confirmando", tentativa, formato, dados, faltantes });
      else await this.gerar(tentativa, formato);
    } catch (erro: unknown) { await this.falhar(erro, tentativa, formato); }
  }
  async confirmar(tentativa: number): Promise<void> {
    if (!this.vigente(tentativa) || this.estado.fase !== "confirmando") return;
    await this.gerar(tentativa, this.estado.formato);
  }
  cancelar(tentativa: number): void {
    if (this.vigente(tentativa)) this.invalidar();
  }
  async repetir(tentativa: number): Promise<void> {
    if (!this.vigente(tentativa) || this.estado.fase !== "erro") return;
    await this.iniciar(this.estado.formato, tentativa);
  }
  private async gerar(tentativa: number, formato: FormatoExportacaoInstalacao): Promise<void> {
    if (!this.vigente(tentativa) || !this.ctrl) return;
    this.publicar({ fase: "gerando", tentativa, formato });
    try {
      const blob = await solicitarArquivoInstalacao(this.obraId, formato, this.ctrl.signal);
      if (!this.vigente(tentativa)) return;
      const valido = await validarAssinaturaArquivo(blob, formato);
      if (!this.vigente(tentativa)) return;
      if (!valido) throw new Error("Arquivo inválido");
      this.limparDownload?.();
      this.limparDownload = baixarArquivoBlob(blob, `detalhes-instalacao-obra-${this.obraId}.${formato}`);
      if (!this.vigente(tentativa)) {
        this.limparDownload?.(); this.limparDownload = null;
        return;
      }
      toast.success("Download iniciado.");
      this.publicar({ fase: "ocioso", tentativa: tentativa + 1 });
    } catch (erro: unknown) { await this.falhar(erro, tentativa, formato); }
  }
  private async falhar(erro: unknown, tentativa: number, formato: FormatoExportacaoInstalacao): Promise<void> {
    if (!this.vigente(tentativa) || axios.isCancel(erro)) return;
    this.ctrl?.abort();
    const falha = await extrairErroBlob(erro);
    if (!this.vigente(tentativa)) return;
    if (falha.status === 401) { this.invalidar(); return; }
    toast.error(falha.mensagem);
    this.publicar({ fase: "erro", tentativa, formato, mensagem: falha.mensagem });
  }
}

export function useExportarInstalacao(obraId: number, contextoValido: () => boolean, sinalContexto?: AbortSignal) {
  const controle = useMemo(() => new ControleExportacao(obraId, contextoValido, sinalContexto), [obraId, contextoValido, sinalContexto]);
  useLayoutEffect(() => controle.montar(), [controle]);
  const estado = useSyncExternalStore(controle.assinar, controle.ler, controle.ler);
  return {
    estado,
    iniciar: (formato: FormatoExportacaoInstalacao) => controle.iniciar(formato, estado.tentativa),
    confirmarParcial: () => controle.confirmar(estado.tentativa),
    cancelar: () => controle.cancelar(estado.tentativa),
    tentarNovamente: () => controle.repetir(estado.tentativa),
  };
}
