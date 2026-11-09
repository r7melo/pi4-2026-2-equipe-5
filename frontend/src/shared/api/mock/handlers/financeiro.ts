import type MockAdapter from "axios-mock-adapter";
import {
  obterRelatorioArmazenado,
  buscarCustosArmazenados,
  atualizarCustosArmazenados,
  apurarDreArmazenado,
} from "../dados/relatorios";
import { extrairQueryParams, extrairDados } from "../core/http";
import { obterObrasArmazenadas } from "../dados/obras";
import { lerDadosCenario } from "../core/estadoCenario";
import { resolverUsuarioAutenticadoMock } from "../core/auth";
import type { ApuracaoFinanceiraEntrada } from "../geradores/contratosFinanceiros";
import { FalhaRelatorioFinanceiro } from "../geradores/prepararFinanceiro";
import { gerarExcelRelatorio, gerarPdfRelatorio } from "../pdfGenerator";
import type { AtualizarCustosPayload } from "@/types";

export function registrarFinanceiro(mock: MockAdapter): void {
  // GET /obras/:id/relatorio-custo — Rota #33
  mock.onGet(/\/obras\/\d+\/relatorio-custo\/?(\?.*)?$/).reply((config) => {
    const auth = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!auth) return [401, { error: { code: "UNAUTHORIZED", message: "Sessão ausente ou expirada." } }];
    if (!["Administrador", "Financeiro"].includes(auth.perfil.nomePerfil)) {
      return [403, { error: { code: "ACCESS_DENIED", message: "Você não possui permissão para visualizar o relatório de custos." } }];
    }
    const match = config.url?.match(/\/obras\/(\d+)\/relatorio-custo/);
    const obraId = match ? Number(match[1]) : 0;
    const relatorio = obterRelatorioArmazenado(obraId);
    if (!relatorio) {
      return [404, { error: { message: "Relatório não encontrado ou sem lançamentos." } }];
    }
    return [200, relatorio];
  });

  // GET /obras/:id/dre — Rota #34 (RF-20, RN-03)
  mock.onGet(/\/obras\/\d+\/dre\/?(\?.*)?$/).reply((config) => {
    const auth = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!auth) return [401, { error: { code: "UNAUTHORIZED", message: "Sessão ausente ou expirada." } }];
    if (!["Administrador", "Financeiro"].includes(auth.perfil.nomePerfil)) {
      return [403, { error: { code: "ACCESS_DENIED", message: "Você não possui permissão para visualizar o DRE." } }];
    }
    const match = config.url?.match(/\/obras\/(\d+)\/dre/);
    const obraId = match ? Number(match[1]) : 0;
    const apuracao = apurarDreArmazenado(obraId);
    return [apuracao.status, apuracao.corpo];
  });

  // GET /obras/:id/custos — Rota #31 (RF-14)
  mock.onGet(/\/obras\/\d+\/custos\/?(\?.*)?$/).reply((config) => {
    const auth = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!auth) return [401, { error: { code: "UNAUTHORIZED", message: "Sessão ausente ou expirada." } }];
    if (!["Administrador", "Financeiro"].includes(auth.perfil.nomePerfil)) {
      return [403, { error: { code: "ACCESS_DENIED", message: "Você não possui permissão para consultar custos." } }];
    }
    const match = config.url?.match(/\/obras\/(\d+)\/custos/);
    const obraId = match ? Number(match[1]) : 0;
    const custos = buscarCustosArmazenados(obraId);
    if (!custos) {
      return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${obraId} não encontrada.` } }];
    }
    return [200, custos];
  });

  // POST /obras/:id/custos — Rota #32 (RF-14, RN-03)
  mock.onPost(/\/obras\/\d+\/custos\/?(\?.*)?$/).reply((config) => {
    const auth = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!auth) return [401, { error: { code: "UNAUTHORIZED", message: "Sessão ausente ou expirada." } }];
    if (auth.perfil.nomePerfil !== "Financeiro") {
      return [403, { error: { code: "ACCESS_DENIED", message: "Você não possui permissão para lançar custos. Ação restrita ao Financeiro." } }];
    }
    const match = config.url?.match(/\/obras\/(\d+)\/custos/);
    const obraId = match ? Number(match[1]) : 0;
    const payload = extrairDados<AtualizarCustosPayload>(config.data);

    // Validação de limites numéricos não negativos
    for (const valor of [payload.custoMaoObra, payload.custoInsumos, payload.valorObra]) {
      if (valor !== undefined && valor !== null && (valor < 0 || isNaN(valor))) {
        return [400, { error: { code: "VALIDATION_ERROR", message: "Valores financeiros devem ser não negativos." } }];
      }
    }

    const atualizado = atualizarCustosArmazenados(obraId, payload);
    if (!atualizado) {
      return [404, { error: { code: "OBRA_NOT_FOUND", message: `Obra ${obraId} não encontrada.` } }];
    }

    return [200, atualizado];
  });

  // GET /relatorios/export — Rota #35
  mock.onGet(/\/relatorios\/export\/?(\?.*)?$/).reply(async (config) => {
    const auth = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!auth) return [401, { error: { code: "UNAUTHORIZED", message: "Sessão ausente ou expirada." } }];
    if (!["Administrador", "Financeiro"].includes(auth.perfil.nomePerfil)) {
      return [403, { error: { code: "ACCESS_DENIED", message: "Você não possui permissão para exportar este relatório." } }];
    }
    const params = extrairQueryParams(config);
    if (!["pdf", "excel", "xlsx"].includes(params.formato) || (params.tipo !== undefined && params.tipo !== "financeiro")) {
      return [400, { error: { code: "INVALID_PARAMETER", message: "Informe o formato PDF ou Excel para o relatório financeiro." } }];
    }
    if (
      (params.periodoInicio !== undefined && params.dataInicio !== undefined && params.periodoInicio !== params.dataInicio) ||
      (params.periodoFim !== undefined && params.dataFim !== undefined && params.periodoFim !== params.dataFim)
    ) {
      return [400, { error: { code: "INVALID_PERIOD", message: "Informe um único período coerente para exportar." } }];
    }
    const obraId = params.obraId === undefined ? null : Number(params.obraId);
    const contexto = {
      periodoInicio: params.periodoInicio ?? params.dataInicio,
      periodoFim: params.periodoFim ?? params.dataFim,
      clienteFiltro: params.clienteFiltro,
      emissao: new Date().toISOString(),
    };
    const obras = obterObrasArmazenadas();
    const relatorios = lerDadosCenario<Record<number, ApuracaoFinanceiraEntrada>>("mock_relatorios_v1");
    try {
      const blob =
        params.formato === "pdf"
          ? await gerarPdfRelatorio(obras, relatorios, obraId, contexto)
          : gerarExcelRelatorio(obras, relatorios, obraId, contexto);
      return [200, blob, { "Content-Type": blob.type }];
    } catch (erro) {
      if (erro instanceof FalhaRelatorioFinanceiro) {
        return [erro.status, { error: { code: erro.codigo, message: erro.message } }, { "Content-Type": "application/json" }];
      }
      return [500, { error: { code: "EXPORT_GENERATION_FAILED", message: "Não foi possível gerar o relatório. Tente novamente." } }, { "Content-Type": "application/json" }];
    }
  });
}
