import { describe, expect, it } from "vitest";
import {
  agruparObrasPorStatus,
  calcularStatusGargalo,
  filtrarOrdenarObrasKanban,
  selecionarVisaoIntegral,
} from "@/features/kanban/components/kanbanUtils";
import type { ObraKanbanCard } from "@/features/kanban/types/kanban";
import type { Material } from "@/shared/types/materiais";

const baseObras: ObraKanbanCard[] = [
  {
    id: 10,
    status: "MaterialComprado",
    clienteNome: "Alpha Solar",
    categoria: "Comercial",
    quantidadePaineis: 20,
    dataFimEstimada: "2026-12-10",
  },
  {
    id: 11,
    status: "EmAndamento",
    clienteNome: "Beta Rural",
    categoria: "Rural",
    quantidadePaineis: 12,
    dataFimEstimada: "2026-11-20",
  },
  {
    id: 12,
    status: "Concluido",
    clienteNome: "Gamma Antiga",
    categoria: "Residencial",
    quantidadePaineis: 8,
    dataFimEstimada: "2025-01-01",
    dataFimReal: "2025-01-01",
  },
];

describe("kanbanUtils", () => {
  it("agrupa obras por status respeitando todas as colunas", () => {
    const mapa = agruparObrasPorStatus(baseObras);
    expect(mapa.MaterialComprado.map((o) => o.id)).toEqual([10]);
    expect(mapa.EmAndamento.map((o) => o.id)).toEqual([11]);
    expect(mapa.Concluido.map((o) => o.id)).toEqual([12]);
    expect(mapa.Assistencia).toEqual([]);
  });

  it("filtra e ordena obras por busca, categoria, material e oculta concluídas >30d quando não buscadas", () => {
    const mats = new Map<number, Material[]>([
      [10, [{ id: 1, obraId: 10, tipo: "Inversor", quantidade: 1, statusLogistico: "EmTransito" }]],
      [11, [{ id: 2, obraId: 11, tipo: "Painel", quantidade: 12, statusLogistico: "Disponivel" }]],
    ]);

    const visiveisPadrao = filtrarOrdenarObrasKanban(baseObras, {
      busca: "",
      categoriaFiltro: "",
      materialFiltro: "Todos",
      mapaMateriais: mats,
      exibirArquivadas: false,
      somenteLeitura: false,
    });
    expect(visiveisPadrao.map((o) => o.id)).toEqual([11, 10]);

    const apenasTransito = filtrarOrdenarObrasKanban(baseObras, {
      busca: "alpha",
      categoriaFiltro: "Comercial",
      materialFiltro: "Em Trânsito",
      mapaMateriais: mats,
      exibirArquivadas: false,
      somenteLeitura: false,
    });
    expect(apenasTransito.map((o) => o.id)).toEqual([10]);
  });

  it("aplica visão integral ordenada em modo somente leitura e calcula gargalo corretamente", () => {
    expect(selecionarVisaoIntegral(baseObras).map((o) => o.id)).toEqual([11, 10]);
    expect(
      calcularStatusGargalo([
        { id: 1, obraId: 1, tipo: "A", quantidade: 1, statusLogistico: "Disponivel" },
        { id: 2, obraId: 1, tipo: "B", quantidade: 1, statusLogistico: "EmTransito" },
      ])
    ).toBe("EmTransito");
    expect(
      calcularStatusGargalo([
        { id: 3, obraId: 1, tipo: "C", quantidade: 1, statusLogistico: "EmSolicitacao" },
      ])
    ).toBe("EmSolicitacao");
    expect(
      calcularStatusGargalo([
        { id: 4, obraId: 1, tipo: "D", quantidade: 1, statusLogistico: "Comprado" },
        { id: 5, obraId: 1, tipo: "E", quantidade: 1, statusLogistico: "EmSolicitacao" },
      ])
    ).toBe("EmSolicitacao");
    expect(
      calcularStatusGargalo([
        { id: 6, obraId: 1, tipo: "F", quantidade: 1, statusLogistico: "Comprado" },
      ])
    ).toBe("Comprado");
  });
});
