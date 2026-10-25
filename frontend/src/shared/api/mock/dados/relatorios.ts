import type { RelatorioCusto } from "@/types";
import { obterObrasArmazenadas } from "./obras";

// ─── RELATÓRIOS (RF-14/15/20) ───
export const MOCK_RELATORIOS_FIXTURE: Record<number, RelatorioCusto> = {
  301: {
    obraId: 301,
    custoTotal: 38600.0,
    receita: 58500.0,
    lucro: 19900.0,
    itens: [
      { descricao: "Mão de Obra de Instalação e Montagem", valor: 10500.0 },
      { descricao: "45 Módulos Fotovoltaicos 550W Monocristalinos", valor: 18200.0 },
      { descricao: "Inversor String Trifásico 25kW", valor: 5800.0 },
      { descricao: "Estruturas de Fixação Telhado Trapezoidal", valor: 2100.0 },
      { descricao: "Cabeamento Solar 6mm e String Box CC/CA", valor: 1200.0 },
      { descricao: "Homologação, Projeto Elétrico e ART", valor: 800.0 },
    ],
    balancoMateriais: [
      { tipo: "Painel Solar 550W Monocristalino", unidade: "un", quantidadeComprada: 45, quantidadeUtilizada: 45 },
      { tipo: "Inversor String 25kW Trifásico", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 1 },
      { tipo: "Cabo Solar 6mm Preto/Vermelho", unidade: "m", quantidadeComprada: 400, quantidadeUtilizada: 367 },
      { tipo: "Estrutura Fixação Telhado Trapezoidal", unidade: "kit", quantidadeComprada: 12, quantidadeUtilizada: 12 },
      { tipo: "String Box CC 1000V com DPS Integrado", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 1 },
    ],
  },
  302: {
    obraId: 302,
    custoTotal: 102400.0,
    receita: 156000.0,
    lucro: 53600.0,
    itens: [
      { descricao: "Mão de Obra Especializada Industrial", valor: 26000.0 },
      { descricao: "120 Módulos Fotovoltaicos 550W Bifaciais", valor: 48000.0 },
      { descricao: "Inversor Central Trifásico 75kW", valor: 15400.0 },
      { descricao: "Estruturas de Fixação Reforçadas em Alumínio", valor: 6200.0 },
      { descricao: "Subestação, Painel de Média Tensão e Proteção", valor: 4500.0 },
      { descricao: "Cabeamento Solar 10mm e Conectores MC4", valor: 2300.0 },
    ],
    balancoMateriais: [
      { tipo: "Módulo Fotovoltaico 550W Bifacial", unidade: "un", quantidadeComprada: 120, quantidadeUtilizada: 0 },
      { tipo: "Inversor Central Trifásico 75kW", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 0 },
      { tipo: "Cabo Solar 10mm Dupla Isolação", unidade: "m", quantidadeComprada: 600, quantidadeUtilizada: 0 },
      { tipo: "Estrutura Metálica Reforçada Alumínio", unidade: "kit", quantidadeComprada: 30, quantidadeUtilizada: 0 },
      { tipo: "Conectores MC4 Industriais Blindados", unidade: "par", quantidadeComprada: 32, quantidadeUtilizada: 0 },
    ],
  },
  303: {
    obraId: 303,
    custoTotal: 21300.0,
    receita: 32000.0,
    lucro: 10700.0,
    itens: [
      { descricao: "Mão de Obra Residencial (Telhado Inclinado)", valor: 6000.0 },
      { descricao: "24 Módulos Fotovoltaicos 550W", valor: 9800.0 },
      { descricao: "6 Microinversores 2000W", valor: 3600.0 },
      { descricao: "Estrutura Telha Cerâmica e Ganchos Inox", valor: 1100.0 },
      { descricao: "Quadro de Distribuição CA e Disjuntores", valor: 800.0 },
    ],
    balancoMateriais: [
      { tipo: "Painel Solar 550W Monocristalino", unidade: "un", quantidadeComprada: 24, quantidadeUtilizada: 24 },
      { tipo: "Microinversor 2000W 4 MPPT", unidade: "un", quantidadeComprada: 6, quantidadeUtilizada: 6 },
      { tipo: "Cabo Tronco e Cabo Solar 6mm", unidade: "m", quantidadeComprada: 80, quantidadeUtilizada: 73 },
      { tipo: "Estrutura Telha Cerâmica com Gancho Inox", unidade: "kit", quantidadeComprada: 6, quantidadeUtilizada: 6 },
    ],
  },
  304: {
    obraId: 304,
    custoTotal: 68900.0,
    receita: 104000.0,
    lucro: 35100.0,
    itens: [
      { descricao: "Mão de Obra Montagem Usina em Solo", valor: 18000.0 },
      { descricao: "80 Módulos Fotovoltaicos 550W Tier 1", valor: 32400.0 },
      { descricao: "2 Inversores Trifásicos 20kW", valor: 11200.0 },
      { descricao: "Estrutura de Fixação Biposte em Solo Galvanizado", valor: 4800.0 },
      { descricao: "Valas, Eletrodutos Enterrados e Cabos de Cobre", valor: 2500.0 },
    ],
    balancoMateriais: [
      { tipo: "Módulo Fotovoltaico 550W Tier 1", unidade: "un", quantidadeComprada: 80, quantidadeUtilizada: 0 },
      { tipo: "Inversor Trifásico 20kW", unidade: "un", quantidadeComprada: 2, quantidadeUtilizada: 0 },
      { tipo: "Cabo Solar 6mm", unidade: "m", quantidadeComprada: 400, quantidadeUtilizada: 0 },
      { tipo: "Estrutura Biposte de Solo em Aço Galvanizado", unidade: "kit", quantidadeComprada: 20, quantidadeUtilizada: 0 },
      { tipo: "Eletroduto Corrugado Reforçado 2\"", unidade: "m", quantidadeComprada: 150, quantidadeUtilizada: 0 },
    ],
  },
  305: {
    obraId: 305,
    custoTotal: 83500.0,
    receita: 128000.0,
    lucro: 44500.0,
    itens: [
      { descricao: "Mão de Obra Especializada com Escala Noturna", valor: 22500.0 },
      { descricao: "96 Módulos Fotovoltaicos 550W Alta Eficiência", valor: 39000.0 },
      { descricao: "Inversores Híbridos com Integração a Gerador", valor: 14200.0 },
      { descricao: "Sistema de Aterramento e Malha SPDA Hospitalar", valor: 4800.0 },
      { descricao: "String Boxes com Chave Seccionadora Motorizada", valor: 3000.0 },
    ],
    balancoMateriais: [
      { tipo: "Painel Solar 550W Alta Eficiência", unidade: "un", quantidadeComprada: 96, quantidadeUtilizada: 58 },
      { tipo: "Inversor Híbrido 25kW com Suporte a Nobreak", unidade: "un", quantidadeComprada: 2, quantidadeUtilizada: 1 },
      { tipo: "Cabo Solar 6mm Retardante a Chamas", unidade: "m", quantidadeComprada: 500, quantidadeUtilizada: 280 },
      { tipo: "Estrutura Especial Fixação Alumínio Anodizado", unidade: "kit", quantidadeComprada: 24, quantidadeUtilizada: 14 },
      { tipo: "Chave de Transferência Automática ATS", unidade: "un", quantidadeComprada: 2, quantidadeUtilizada: 1 },
    ],
  },
  306: {
    obraId: 306,
    custoTotal: 31800.0,
    receita: 48000.0,
    lucro: 16200.0,
    itens: [
      { descricao: "Mão de Obra com Equipamento de Linha de Vida (NR-35)", valor: 8500.0 },
      { descricao: "36 Módulos Fotovoltaicos 550W", valor: 14800.0 },
      { descricao: "Inversor Trifásico 15kW", valor: 5200.0 },
      { descricao: "Estruturas de Fixação para Telhas Shingle", valor: 1900.0 },
      { descricao: "Cabeamento Solar e Quadro Geral", valor: 1400.0 },
    ],
    balancoMateriais: [
      { tipo: "Módulo Fotovoltaico 550W", unidade: "un", quantidadeComprada: 36, quantidadeUtilizada: 21 },
      { tipo: "Inversor Trifásico 15kW", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 0 },
      { tipo: "Cabo Solar 6mm", unidade: "m", quantidadeComprada: 150, quantidadeUtilizada: 88 },
      { tipo: "Estrutura Especial para Telhas Shingle", unidade: "kit", quantidadeComprada: 9, quantidadeUtilizada: 5 },
    ],
  },
  307: {
    obraId: 307,
    custoTotal: 44700.0,
    receita: 69000.0,
    lucro: 24300.0,
    itens: [
      { descricao: "Mão de Obra com Certificações NR-10, NR-20 e NR-35", valor: 12000.0 },
      { descricao: "50 Módulos Fotovoltaicos Anti-deflagrantes 550W", valor: 21000.0 },
      { descricao: "Inversor String Grau de Proteção IP66", valor: 7200.0 },
      { descricao: "Eletrodutos Galvanizados à Prova de Explosão", valor: 2900.0 },
      { descricao: "Laudo de Conformidade de Área Classificada e ART", valor: 1600.0 },
    ],
    balancoMateriais: [
      { tipo: "Painel Solar 550W com Certificação Anti-chama", unidade: "un", quantidadeComprada: 50, quantidadeUtilizada: 50 },
      { tipo: "Inversor IP66 para Área Classificada", unidade: "un", quantidadeComprada: 1, quantidadeUtilizada: 1 },
      { tipo: "Cabo Solar Blindado 6mm", unidade: "m", quantidadeComprada: 250, quantidadeUtilizada: 231 },
      { tipo: "Estrutura em Aço Inox 316", unidade: "kit", quantidadeComprada: 14, quantidadeUtilizada: 14 },
      { tipo: "Eletrodutos Galvanizados à Prova de Explosão", unidade: "m", quantidadeComprada: 80, quantidadeUtilizada: 80 },
    ],
  },
  308: {
    obraId: 308,
    custoTotal: 9400.0,
    receita: 18000.0,
    lucro: 8600.0,
    itens: [
      { descricao: "Equipe Técnica Especializada em O&M Solar", valor: 4200.0 },
      { descricao: "Substituição de Conectores MC4 e Diodos de Bypass", valor: 1800.0 },
      { descricao: "Limpeza Química e Descontaminação dos Módulos", valor: 1900.0 },
      { descricao: "Inspeção Termográfica com Drone e Relatório Técnico", valor: 1500.0 },
    ],
    balancoMateriais: [
      { tipo: "Conector MC4 Original Stäubli", unidade: "par", quantidadeComprada: 20, quantidadeUtilizada: 14 },
      { tipo: "Diodo de Bypass 15A 1000V", unidade: "un", quantidadeComprada: 4, quantidadeUtilizada: 3 },
      { tipo: "Fusível Fotovoltaico gPV 1000V 15A", unidade: "un", quantidadeComprada: 2, quantidadeUtilizada: 2 },
      { tipo: "Solução Desengordurante Biodegradável", unidade: "l", quantidadeComprada: 50, quantidadeUtilizada: 42 },
    ],
  },
};

/**
 * Obtém o relatório de custos da obra ou calcula dinamicamente se for uma nova obra.
 */
export function obterRelatorioArmazenado(obraId: number): RelatorioCusto | null {
  if (MOCK_RELATORIOS_FIXTURE[obraId]) {
    return MOCK_RELATORIOS_FIXTURE[obraId];
  }

  // Se for uma obra recém-cadastrada, gera estimativa baseada no porte de painéis
  const obras = obterObrasArmazenadas();
  const obra = obras.find((o) => Number(o.id) === obraId);
  if (obra) {
    const paineis = obra.quantidadePaineis || 30;
    const receita = paineis * 1300;
    const custoTotal = paineis * 850;
    const lucro = receita - custoTotal;

    const relatorioGerado: RelatorioCusto = {
      obraId,
      receita,
      custoTotal,
      lucro,
      itens: [
        { descricao: `Módulos Fotovoltaicos (${paineis} un)`, valor: Math.round(custoTotal * 0.46) },
        { descricao: "Mão de Obra de Instalação e Homologação", valor: Math.round(custoTotal * 0.28) },
        { descricao: "Inversor String e String Box CA/CC", valor: Math.round(custoTotal * 0.18) },
        { descricao: "Estruturas de Fixação e Cabeamento Solar", valor: Math.round(custoTotal * 0.08) },
      ],
    };

    MOCK_RELATORIOS_FIXTURE[obraId] = relatorioGerado;
    return relatorioGerado;
  }

  return null;
}
