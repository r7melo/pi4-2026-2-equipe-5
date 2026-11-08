/* eslint-disable react-refresh/only-export-components -- Provider e hook formam uma única API de contexto. */
import {
  createContext, useContext, useLayoutEffect, useMemo, useState,
  useSyncExternalStore, type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

const CONSULTA_VIEWPORT = "(min-width: 768px) and (min-height: 600px)";
const AVISO_FALLBACK = "Não foi possível entrar em tela cheia. O modo apresentação continua na janela.";
let proximoEpoch = 0;
let nativaAtual: { dono: symbol; tipo: "entrada" | "saida" } | null = null;
const assinantesNativos = new Set<() => void>();

function publicarTransicao(): void {
  assinantesNativos.forEach((avisar) => avisar());
}

function executarNativa(
  dono: symbol,
  tipo: "entrada" | "saida",
  iniciar: () => Promise<void>,
  concluir: (sucesso: boolean) => Promise<void> | void,
): void {
  const transicao = { dono, tipo };
  nativaAtual = transicao;
  publicarTransicao();
  let promessa: Promise<void>;
  try {
    // A entrada ocorre neste mesmo stack do gesto; não há await anterior.
    promessa = iniciar();
  } catch {
    promessa = Promise.reject(new Error("Transição nativa recusada"));
  }
  void promessa.then(
    () => concluir(true),
    () => concluir(false),
  ).catch(() => {
    // Limpeza nativa não pode deixar rejeição não tratada.
  }).finally(() => {
    if (nativaAtual === transicao) {
      nativaAtual = null;
      publicarTransicao();
    }
  });
}

interface EstadoDisplay {
  ativo: boolean;
  emTransicao: boolean;
  elegivelParaModo: boolean;
  alturaSelo: number;
  deveRestaurarFoco: boolean;
  epoch: number;
}

interface ConfiguracaoDisplay {
  autorizado: boolean;
  identidadeSessao: string | null;
  perfil: string | null | undefined;
  pathname: string;
}

class ControleDisplay {
  private readonly dono = Symbol("display");
  private readonly assinantes = new Set<() => void>();
  private montado = false;
  private token = 0;
  private entradaPendente = false;
  private possuiFullscreen = false;
  private media: MediaQueryList | null = null;
  private configuracao: ConfiguracaoDisplay | null = null;
  private estado: EstadoDisplay = {
    ativo: false, emTransicao: nativaAtual !== null, elegivelParaModo: false,
    alturaSelo: 96, deveRestaurarFoco: false, epoch: ++proximoEpoch,
  };

  assinar = (avisar: () => void): (() => void) => {
    this.assinantes.add(avisar);
    return () => { this.assinantes.delete(avisar); };
  };
  lerEstado = (): EstadoDisplay => this.estado;
  lerEpoch = (): number => this.estado.epoch;
  podeInteragir = (epoch?: number): boolean =>
    this.montado && !this.estado.ativo &&
    (epoch === undefined || epoch === this.estado.epoch);

  private publicar(parcial: Partial<EstadoDisplay>): void {
    const seguinte = { ...this.estado, ...parcial };
    if (
      seguinte.ativo === this.estado.ativo &&
      seguinte.emTransicao === this.estado.emTransicao &&
      seguinte.elegivelParaModo === this.estado.elegivelParaModo &&
      seguinte.alturaSelo === this.estado.alturaSelo &&
      seguinte.deveRestaurarFoco === this.estado.deveRestaurarFoco &&
      seguinte.epoch === this.estado.epoch
    ) return;
    this.estado = seguinte;
    this.assinantes.forEach((avisar) => avisar());
  }

  private podeAtivar(): boolean {
    const cfg = this.configuracao;
    return this.montado && cfg !== null && cfg.autorizado &&
      (cfg.pathname === "/kanban" || cfg.pathname === "/equipes") &&
      window.location.pathname === cfg.pathname && Boolean(this.media?.matches);
  }

  configurar(configuracao: ConfiguracaoDisplay): void {
    const anterior = this.configuracao;
    this.configuracao = configuracao;
    if (anterior && (
      anterior.pathname !== configuracao.pathname ||
      anterior.autorizado !== configuracao.autorizado ||
      anterior.identidadeSessao !== configuracao.identidadeSessao ||
      anterior.perfil !== configuracao.perfil
    )) this.sair(false);
    if (this.estado.ativo && !this.podeAtivar()) this.sair(false);
  }

  private atualizarTransicao = (): void => {
    this.publicar({ emTransicao: nativaAtual !== null });
  };
  private atualizarViewport = (): void => {
    this.publicar({ elegivelParaModo: Boolean(this.media?.matches) });
    if (this.estado.ativo && !this.podeAtivar()) this.sair(false);
  };
  private aoMudarFullscreen = (): void => {
    if (!this.estado.ativo) return;
    if (!document.fullscreenElement) {
      this.sair(true);
    } else if (this.entradaPendente && document.fullscreenElement === document.documentElement) {
      this.possuiFullscreen = true;
    }
  };
  private aoPressionarTecla = (evento: KeyboardEvent): void => {
    if (evento.key === "Escape" && this.estado.ativo && !document.fullscreenElement) {
      evento.preventDefault();
      this.sair(true);
    }
  };

  montar(): () => void {
    this.montado = true;
    this.media = window.matchMedia(CONSULTA_VIEWPORT);
    this.media.addEventListener("change", this.atualizarViewport);
    document.addEventListener("fullscreenchange", this.aoMudarFullscreen);
    window.addEventListener("keydown", this.aoPressionarTecla);
    assinantesNativos.add(this.atualizarTransicao);
    this.atualizarTransicao();
    this.atualizarViewport();
    return () => {
      this.sair(false);
      this.montado = false;
      this.media?.removeEventListener("change", this.atualizarViewport);
      document.removeEventListener("fullscreenchange", this.aoMudarFullscreen);
      window.removeEventListener("keydown", this.aoPressionarTecla);
      assinantesNativos.delete(this.atualizarTransicao);
      this.media = null;
    };
  }

  ativar = (): void => {
    if (!this.podeAtivar() || this.estado.ativo || nativaAtual) return;
    const token = ++this.token;
    this.publicar({
      ativo: true, epoch: ++proximoEpoch, deveRestaurarFoco: false,
    });
    // Uma tela cheia anterior não pertence ao modo; não tomamos sua propriedade.
    if (document.fullscreenElement) return;
    if (!document.fullscreenEnabled ||
        typeof document.documentElement.requestFullscreen !== "function" ||
        typeof document.exitFullscreen !== "function") {
      toast.info(AVISO_FALLBACK);
      return;
    }
    this.entradaPendente = true;
    executarNativa(
      this.dono, "entrada",
      () => document.documentElement.requestFullscreen({ navigationUI: "hide" }),
      async (sucesso) => {
        this.entradaPendente = false;
        const vigente = this.montado && this.token === token &&
          this.estado.ativo && this.podeAtivar();
        if (!vigente) {
          if (document.fullscreenElement === document.documentElement) {
            try { await document.exitFullscreen(); } catch { /* Saída recusada. */ }
          }
          this.possuiFullscreen = false;
          return;
        }
        if (!sucesso) {
          toast.info(AVISO_FALLBACK);
          return;
        }
        if (document.fullscreenElement === document.documentElement) {
          this.possuiFullscreen = true;
        } else {
          this.sair(true);
        }
      },
    );
  };

  sair = (restaurarFoco = true): void => {
    const estavaAtivo = this.estado.ativo;
    ++this.token;
    this.publicar({
      ativo: false, epoch: ++proximoEpoch,
      deveRestaurarFoco: estavaAtivo && restaurarFoco,
    });
    if (!this.possuiFullscreen || nativaAtual) return;
    this.possuiFullscreen = false;
    if (document.fullscreenElement !== document.documentElement ||
        typeof document.exitFullscreen !== "function") return;
    executarNativa(this.dono, "saida", () => document.exitFullscreen(), () => {});
  };

  definirAlturaSelo = (altura: number): void => {
    if (Number.isFinite(altura) && altura > 0) {
      this.publicar({ alturaSelo: Math.ceil(altura) + 32 });
    }
  };
}

interface ModoDisplayProviderProps {
  autorizado: boolean;
  identidadeSessao: string | null;
  perfil: string | null | undefined;
  children: ReactNode;
}
interface ModoDisplayValue extends EstadoDisplay {
  ativar: () => void;
  sair: (restaurarFoco?: boolean) => void;
  lerEpoch: () => number;
  podeInteragir: (epoch?: number) => boolean;
  definirAlturaSelo: (altura: number) => void;
}

const ModoDisplayContext = createContext<ModoDisplayValue | null>(null);

export function ModoDisplayProvider({
  autorizado, identidadeSessao, perfil, children,
}: ModoDisplayProviderProps) {
  const { pathname } = useLocation();
  const [controle] = useState(() => new ControleDisplay());
  const estado = useSyncExternalStore(controle.assinar, controle.lerEstado, controle.lerEstado);
  useLayoutEffect(() => controle.montar(), [controle]);
  useLayoutEffect(() => {
    controle.configurar({ autorizado, identidadeSessao, perfil, pathname });
  }, [controle, autorizado, identidadeSessao, perfil, pathname]);
  const valor = useMemo<ModoDisplayValue>(() => ({
    ...estado,
    ativar: controle.ativar, sair: controle.sair, lerEpoch: controle.lerEpoch,
    podeInteragir: controle.podeInteragir, definirAlturaSelo: controle.definirAlturaSelo,
  }), [estado, controle]);
  return <ModoDisplayContext.Provider value={valor}>{children}</ModoDisplayContext.Provider>;
}

export function useModoDisplay(): ModoDisplayValue {
  const contexto = useContext(ModoDisplayContext);
  if (!contexto) throw new Error("Modo apresentação exige o provider do painel.");
  return contexto;
}
