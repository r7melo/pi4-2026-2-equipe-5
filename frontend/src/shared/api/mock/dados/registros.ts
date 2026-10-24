// ─── HISTÓRICO E COMENTÁRIOS (RF-11/12) ───
export interface HistoricoObra {
  id: number;
  obraId: number;
  statusAnterior: string;
  statusNovo: string;
  dataAlteracao: string;
  observacao?: string;
  usuario: { id: number; nome: string };
}

export interface ComentarioObra {
  id: number;
  obraId: number;
  descricao: string;
  dataRegistro: string;
  usuario: { id: number; nome: string };
}

const STORAGE_KEY_HIST = "mock_historico";

const STORAGE_KEY_COM = "mock_comentarios";

export const MOCK_HISTORICO_FIXTURE: HistoricoObra[] = [
  // Obra 301
  {
    id: 9001,
    obraId: 301,
    statusAnterior: "Criado",
    statusNovo: "MaterialComprado",
    dataAlteracao: new Date(Date.now() - 4 * 86400000).toISOString(),
    observacao: "Pedido de compra emitido e aprovado pelo financeiro.",
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 302
  {
    id: 9002,
    obraId: 302,
    statusAnterior: "Criado",
    statusNovo: "MaterialComprado",
    dataAlteracao: new Date(Date.now() - 3 * 86400000).toISOString(),
    observacao: "Módulos bifaciais de 550W encomendados junto à fabricante.",
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 303
  {
    id: 9003,
    obraId: 303,
    statusAnterior: "MaterialComprado",
    statusNovo: "NoDeposito",
    dataAlteracao: new Date(Date.now() - 2 * 86400000).toISOString(),
    observacao: "Microinversores e módulos recebidos no almoxarifado central.",
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 304
  {
    id: 9004,
    obraId: 304,
    statusAnterior: "NoDeposito",
    statusNovo: "Separado",
    dataAlteracao: new Date(Date.now() - 86400000).toISOString(),
    observacao: "Kit de solo e estruturas metálicas separados no Pallet #04.",
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 305
  {
    id: 9005,
    obraId: 305,
    statusAnterior: "Separado",
    statusNovo: "EmAndamento",
    dataAlteracao: new Date(Date.now() - 12 * 3600000).toISOString(),
    observacao: "Equipe 02 iniciou a fixação dos suportes na cobertura do hospital.",
    usuario: { id: 15, nome: "Marcos Instalador" },
  },
  // Obra 306
  {
    id: 9006,
    obraId: 306,
    statusAnterior: "Separado",
    statusNovo: "EmAndamento",
    dataAlteracao: new Date(Date.now() - 6 * 3600000).toISOString(),
    observacao: "Instalação da linha de vida e cabeamento CA em execução.",
    usuario: { id: 15, nome: "Marcos Instalador" },
  },
  // Obra 307
  {
    id: 9007,
    obraId: 307,
    statusAnterior: "EmAndamento",
    statusNovo: "Concluido",
    dataAlteracao: new Date(Date.now() - 14 * 86400000).toISOString(),
    observacao: "Comissionamento elétrico aprovado e homologação concluída com sucesso.",
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 308
  {
    id: 9008,
    obraId: 308,
    statusAnterior: "Concluido",
    statusNovo: "Assistencia",
    dataAlteracao: new Date(Date.now() - 24 * 3600000).toISOString(),
    observacao: "Abertura de chamado de assistência para revisão pós-tempestade.",
    usuario: { id: 12, nome: "Ana Souza" },
  },
];

export const MOCK_COMENTARIOS_FIXTURE: ComentarioObra[] = [
  // Obra 301
  {
    id: 701,
    obraId: 301,
    descricao: "Cliente confirmou acesso ao telhado para descarregamento a partir de terça.",
    dataRegistro: new Date(Date.now() - 3600000 * 5).toISOString(),
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 302
  {
    id: 702,
    obraId: 302,
    descricao: "Engenharia da metalúrgica solicitou cópia do plano de içamento de cargas.",
    dataRegistro: new Date(Date.now() - 3600000 * 8).toISOString(),
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 303
  {
    id: 703,
    obraId: 303,
    descricao: "Materiais inspecionados sem avarias. Aguardando liberação da equipe.",
    dataRegistro: new Date(Date.now() - 3600000 * 12).toISOString(),
    usuario: { id: 15, nome: "Marcos Instalador" },
  },
  // Obra 304
  {
    id: 704,
    obraId: 304,
    descricao: "Trator da fazenda foi disponibilizado para abertura das valas dos cabos.",
    dataRegistro: new Date(Date.now() - 3600000 * 18).toISOString(),
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 305
  {
    id: 705,
    obraId: 305,
    descricao: "Trabalhos elétricos pesados concentrados no turno noturno para evitar ruído.",
    dataRegistro: new Date(Date.now() - 3600000 * 3).toISOString(),
    usuario: { id: 15, nome: "Marcos Instalador" },
  },
  // Obra 306
  {
    id: 706,
    obraId: 306,
    descricao: "Síndico do condomínio liberou vaga para estacionamento do furgão de ferramentas.",
    dataRegistro: new Date(Date.now() - 3600000 * 2).toISOString(),
    usuario: { id: 12, nome: "Ana Souza" },
  },
  // Obra 307
  {
    id: 707,
    obraId: 307,
    descricao: "Vistoria da concessionária finalizada com parecer de acesso 100% deferido.",
    dataRegistro: new Date(Date.now() - 86400000 * 10).toISOString(),
    usuario: { id: 1, nome: "Carlos Administrador" },
  },
  // Obra 308
  {
    id: 708,
    obraId: 308,
    descricao: "Granja solicitou lavagem especializada dos módulos para recuperar rendimento.",
    dataRegistro: new Date(Date.now() - 3600000 * 20).toISOString(),
    usuario: { id: 12, nome: "Ana Souza" },
  },
];

export function obterHistoricoArmazenado(): HistoricoObra[] {
  if (typeof window === "undefined") return MOCK_HISTORICO_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_HIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= MOCK_HISTORICO_FIXTURE.length) {
        return parsed;
      }
    }
  } catch { }
  sessionStorage.setItem(STORAGE_KEY_HIST, JSON.stringify(MOCK_HISTORICO_FIXTURE));
  return MOCK_HISTORICO_FIXTURE;
}

export function adicionarHistoricoArmazenado(obraId: number, statusAnterior: string, statusNovo: string, observacao?: string, usuario?: { id: number; nome: string }): HistoricoObra {
  const historico = obterHistoricoArmazenado();
  const novoId = historico.reduce((acc, curr) => Math.max(acc, curr.id), 9000) + 1;
  const novo: HistoricoObra = {
    id: novoId,
    obraId,
    statusAnterior,
    statusNovo,
    dataAlteracao: new Date().toISOString(),
    observacao,
    usuario: usuario || { id: 0, nome: "Sistema" },
  };
  sessionStorage.setItem(STORAGE_KEY_HIST, JSON.stringify([novo, ...historico]));
  return novo;
}

export function obterComentariosArmazenados(): ComentarioObra[] {
  if (typeof window === "undefined") return MOCK_COMENTARIOS_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_COM);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= MOCK_COMENTARIOS_FIXTURE.length) {
        return parsed;
      }
    }
  } catch { }
  sessionStorage.setItem(STORAGE_KEY_COM, JSON.stringify(MOCK_COMENTARIOS_FIXTURE));
  return MOCK_COMENTARIOS_FIXTURE;
}

export function adicionarComentarioArmazenado(obraId: number, descricao: string, usuario: { id: number; nome: string }): ComentarioObra {
  const comentarios = obterComentariosArmazenados();
  const novoId = comentarios.reduce((acc, curr) => Math.max(acc, curr.id), 700) + 1;
  const novo: ComentarioObra = {
    id: novoId,
    obraId,
    descricao,
    dataRegistro: new Date().toISOString(),
    usuario,
  };
  sessionStorage.setItem(STORAGE_KEY_COM, JSON.stringify([novo, ...comentarios]));
  return novo;
}
