import type MockAdapter from "axios-mock-adapter";
import { obterRelatorioArmazenado } from "../dados/relatorios";
import { extrairQueryParams } from "../core/http";
import { obterObrasArmazenadas } from "../dados/obras";
import type { RelatorioCusto } from "@/types";
import { gerarExcelRelatorio, gerarPdfRelatorio } from "../pdfGenerator";

export function registrarFinanceiro(mock: MockAdapter): void {
  // GET /obras/:id/relatorio-custo
  mock.onGet(/\/obras\/\d+\/relatorio-custo\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/obras\/(\d+)\/relatorio-custo/);
    const obraId = match ? Number(match[1]) : 0;
    const relatorio = obterRelatorioArmazenado(obraId);
    if (!relatorio) {
      return [404, { error: { message: "Relatório não encontrado ou sem lançamentos." } }];
    }
    return [200, relatorio];
  });
  
  // GET /relatorios/export (Gera PDF ou Excel com base em todas as obras cadastradas)
  mock.onGet(/\/relatorios\/export\/?(\?.*)?$/).reply((config) => {
    const params = extrairQueryParams(config);
    const formato = params.formato === "excel" ? "excel" : "pdf";
    const obraId = params.obraId ? Number(params.obraId) : null;
  
    const obras = obterObrasArmazenadas();
    // Garante que todas as obras possuam relatório calculado
    const relatorios: Record<number, RelatorioCusto> = {};
    for (const o of obras) {
      const rel = obterRelatorioArmazenado(o.id);
      if (rel) {
        relatorios[o.id] = rel;
      }
    }
  
    if (formato === "excel") {
      const blob = gerarExcelRelatorio(obras, relatorios, obraId);
      return [200, blob];
    }
  
    const blob = gerarPdfRelatorio(obras, relatorios, obraId);
    return [200, blob];
  });
}
