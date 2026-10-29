import type MockAdapter from "axios-mock-adapter";
import { obterRelatorioArmazenado } from "../dados/relatorios";
import { extrairQueryParams } from "../core/http";
import { obterObrasArmazenadas } from "../dados/obras";
import { lerDadosCenario } from '../core/estadoCenario';
import { resolverUsuarioAutenticadoMock } from '../core/auth';
import type { ApuracaoFinanceiraEntrada } from '../geradores/contratosFinanceiros';
import { FalhaRelatorioFinanceiro } from '../geradores/prepararFinanceiro';
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
  mock.onGet(/\/relatorios\/export\/?(\?.*)?$/).reply(async (config) => {
    const auth = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!auth) return [401, { error: { code: 'UNAUTHORIZED', message: 'Sessão ausente ou expirada.' } }];
    if (!['Administrador', 'Financeiro'].includes(auth.perfil.nomePerfil))
      return [403, { error: { code: 'ACCESS_DENIED', message: 'Você não possui permissão para exportar este relatório.' } }];
    const params = extrairQueryParams(config);
    if (!['pdf', 'excel', 'xlsx'].includes(params.formato) || (params.tipo !== undefined && params.tipo !== 'financeiro'))
      return [400, { error: { code: 'INVALID_PARAMETER', message: 'Informe o formato PDF ou Excel para o relatório financeiro.' } }];
    if ((params.periodoInicio !== undefined && params.dataInicio !== undefined && params.periodoInicio !== params.dataInicio) ||
        (params.periodoFim !== undefined && params.dataFim !== undefined && params.periodoFim !== params.dataFim))
      return [400, { error: { code: 'INVALID_PERIOD', message: 'Informe um único período coerente para exportar.' } }];
    const obraId = params.obraId === undefined ? null : Number(params.obraId);
    const contexto = { periodoInicio: params.periodoInicio ?? params.dataInicio, periodoFim: params.periodoFim ?? params.dataFim,
      clienteFiltro: params.clienteFiltro, emissao: new Date().toISOString() };
    // A leitura coordenada fornece uma única imagem antes do primeiro await.
    const obras = obterObrasArmazenadas();
    const relatorios = lerDadosCenario<Record<number, ApuracaoFinanceiraEntrada>>('mock_relatorios_v1');
    try {
      const blob = params.formato === 'pdf' ? await gerarPdfRelatorio(obras, relatorios, obraId, contexto) : gerarExcelRelatorio(obras, relatorios, obraId, contexto);
      return [200, blob, { 'Content-Type': blob.type }];
    } catch (erro) {
      if (erro instanceof FalhaRelatorioFinanceiro) return [erro.status, { error: { code: erro.codigo, message: erro.message } }, { 'Content-Type': 'application/json' }];
      return [500, { error: { code: 'EXPORT_GENERATION_FAILED', message: 'Não foi possível gerar o relatório. Tente novamente.' } }, { 'Content-Type': 'application/json' }];
    }
  });
}
