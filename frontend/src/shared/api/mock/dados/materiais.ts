import type { Material } from "@/types";

// ─── MATERIAIS (RF-06) ───
const STORAGE_KEY_MAT = "mock_materiais";

export const MOCK_MATERIAIS_FIXTURE: Material[] = [
  // Obra 301 - Rede Alfa Supermercados (45 painéis)
  { id: 501, obraId: 301, descricao: "Painel Solar 550W Monocristalino", quantidade: 45, unidade: "un", statusLogistico: "Comprado" },
  { id: 502, obraId: 301, descricao: "Inversor String 25kW Trifásico", quantidade: 1, unidade: "un", statusLogistico: "EmTransito" },
  { id: 503, obraId: 301, descricao: "Cabo Solar 6mm Preto/Vermelho", quantidade: 400, unidade: "m", statusLogistico: "Comprado" },
  { id: 504, obraId: 301, descricao: "Estrutura Fixação Telhado Trapezoidal", quantidade: 12, unidade: "kit", statusLogistico: "EmTransito" },
  { id: 505, obraId: 301, descricao: "String Box CC 1000V com DPS Integrado", quantidade: 1, unidade: "un", statusLogistico: "Comprado" },

  // Obra 302 - Indústria Metalúrgica Ramos (120 painéis)
  { id: 506, obraId: 302, descricao: "Módulo Fotovoltaico 550W Bifacial", quantidade: 120, unidade: "un", statusLogistico: "Comprado" },
  { id: 507, obraId: 302, descricao: "Inversor Central Trifásico 75kW", quantidade: 1, unidade: "un", statusLogistico: "EmTransito" },
  { id: 508, obraId: 302, descricao: "Cabo Solar 10mm Dupla Isolação", quantidade: 600, unidade: "m", statusLogistico: "Comprado" },
  { id: 509, obraId: 302, descricao: "Estrutura Metálica Reforçada Alumínio", quantidade: 30, unidade: "kit", statusLogistico: "Comprado" },
  { id: 510, obraId: 302, descricao: "Painel de Média Tensão e Proteção", quantidade: 1, unidade: "un", statusLogistico: "EmTransito" },
  { id: 511, obraId: 302, descricao: "Conectores MC4 Industriais Blindados", quantidade: 32, unidade: "par", statusLogistico: "Comprado" },

  // Obra 303 - Residencial Vista Verde (24 painéis)
  { id: 512, obraId: 303, descricao: "Painel Solar 550W Monocristalino", quantidade: 24, unidade: "un", statusLogistico: "Disponivel" },
  { id: 513, obraId: 303, descricao: "Microinversor 2000W 4 MPPT", quantidade: 6, unidade: "un", statusLogistico: "Disponivel" },
  { id: 514, obraId: 303, descricao: "Cabo Tronco e Cabo Solar 6mm", quantidade: 80, unidade: "m", statusLogistico: "Disponivel" },
  { id: 515, obraId: 303, descricao: "Estrutura Telha Cerâmica com Gancho Inox", quantidade: 6, unidade: "kit", statusLogistico: "Disponivel" },
  { id: 516, obraId: 303, descricao: "Quadro de Distribuição CA com DPS e Disjuntor", quantidade: 1, unidade: "un", statusLogistico: "Disponivel" },

  // Obra 304 - Fazenda Santa Maria (80 painéis)
  { id: 517, obraId: 304, descricao: "Módulo Fotovoltaico 550W Tier 1", quantidade: 80, unidade: "un", statusLogistico: "Disponivel" },
  { id: 518, obraId: 304, descricao: "Inversor Trifásico 20kW", quantidade: 2, unidade: "un", statusLogistico: "Disponivel" },
  { id: 519, obraId: 304, descricao: "Cabo Solar 6mm", quantidade: 400, unidade: "m", statusLogistico: "Disponivel" },
  { id: 520, obraId: 304, descricao: "Estrutura Biposte de Solo em Aço Galvanizado", quantidade: 20, unidade: "kit", statusLogistico: "Disponivel" },
  { id: 521, obraId: 304, descricao: "String Box CC 2 Entradas / 2 Saídas", quantidade: 2, unidade: "un", statusLogistico: "Disponivel" },
  { id: 522, obraId: 304, descricao: "Eletroduto Corrugado Reforçado 2\"", quantidade: 150, unidade: "m", statusLogistico: "Disponivel" },

  // Obra 305 - Hospital São Lucas (96 painéis)
  { id: 523, obraId: 305, descricao: "Painel Solar 550W Alta Eficiência", quantidade: 96, unidade: "un", statusLogistico: "Utilizado" },
  { id: 524, obraId: 305, descricao: "Inversor Híbrido 25kW com Suporte a Nobreak", quantidade: 2, unidade: "un", statusLogistico: "Utilizado" },
  { id: 525, obraId: 305, descricao: "Cabo Solar 6mm Retardante a Chamas", quantidade: 500, unidade: "m", statusLogistico: "Utilizado" },
  { id: 526, obraId: 305, descricao: "Estrutura Especial Fixação Alumínio Anodizado", quantidade: 24, unidade: "kit", statusLogistico: "Utilizado" },
  { id: 527, obraId: 305, descricao: "Sistema de Aterramento e Malha SPDA Hospitalar", quantidade: 1, unidade: "un", statusLogistico: "Utilizado" },
  { id: 528, obraId: 305, descricao: "Chave de Transferência Automática ATS", quantidade: 2, unidade: "un", statusLogistico: "Utilizado" },

  // Obra 306 - Condomínio Solar das Flores (36 painéis)
  { id: 529, obraId: 306, descricao: "Módulo Fotovoltaico 550W", quantidade: 36, unidade: "un", statusLogistico: "Utilizado" },
  { id: 530, obraId: 306, descricao: "Inversor Trifásico 15kW", quantidade: 1, unidade: "un", statusLogistico: "Utilizado" },
  { id: 531, obraId: 306, descricao: "Cabo Solar 6mm", quantidade: 150, unidade: "m", statusLogistico: "Utilizado" },
  { id: 532, obraId: 306, descricao: "Estrutura Especial para Telhas Shingle", quantidade: 9, unidade: "kit", statusLogistico: "Utilizado" },
  { id: 533, obraId: 306, descricao: "Caixa de Proteção CA/CC Integrada", quantidade: 1, unidade: "un", statusLogistico: "Utilizado" },

  // Obra 307 - Posto Alvorada Combustíveis (50 painéis)
  { id: 534, obraId: 307, descricao: "Painel Solar 550W com Certificação Anti-chama", quantidade: 50, unidade: "un", statusLogistico: "Disponivel" },
  { id: 535, obraId: 307, descricao: "Inversor IP66 para Área Classificada", quantidade: 1, unidade: "un", statusLogistico: "Disponivel" },
  { id: 536, obraId: 307, descricao: "Cabo Solar Blindado 6mm", quantidade: 250, unidade: "m", statusLogistico: "Disponivel" },
  { id: 537, obraId: 307, descricao: "Estrutura em Aço Inox 316", quantidade: 14, unidade: "kit", statusLogistico: "Disponivel" },
  { id: 538, obraId: 307, descricao: "Eletrodutos Galvanizados à Prova de Explosão", quantidade: 80, unidade: "m", statusLogistico: "Disponivel" },

  // Obra 308 - Manutenção Preventiva — Granja Silva (30 painéis)
  { id: 539, obraId: 308, descricao: "Conector MC4 Original Stäubli", quantidade: 20, unidade: "par", statusLogistico: "Comprado" },
  { id: 540, obraId: 308, descricao: "Diodo de Bypass 15A 1000V", quantidade: 4, unidade: "un", statusLogistico: "Comprado" },
  { id: 541, obraId: 308, descricao: "Fusível Fotovoltaico gPV 1000V 15A", quantidade: 2, unidade: "un", statusLogistico: "Comprado" },
  { id: 542, obraId: 308, descricao: "Solução Desengordurante Biodegradável para Módulos", quantidade: 50, unidade: "l", statusLogistico: "Comprado" },
];

export function obterMateriaisArmazenados(): Material[] {
  if (typeof window === "undefined") return MOCK_MATERIAIS_FIXTURE;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_MAT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= MOCK_MATERIAIS_FIXTURE.length) {
        return parsed;
      }
    }
  } catch { }
  sessionStorage.setItem(STORAGE_KEY_MAT, JSON.stringify(MOCK_MATERIAIS_FIXTURE));
  return MOCK_MATERIAIS_FIXTURE;
}

export function adicionarMaterialArmazenado(obraId: number, payload: Omit<Material, "id" | "obraId">): Material {
  const materiais = obterMateriaisArmazenados();
  const novoId = materiais.reduce((acc, curr) => Math.max(acc, curr.id), 500) + 1;
  const novo: Material = { id: novoId, obraId, ...payload };
  const atualizados = [...materiais, novo];
  sessionStorage.setItem(STORAGE_KEY_MAT, JSON.stringify(atualizados));
  return novo;
}
