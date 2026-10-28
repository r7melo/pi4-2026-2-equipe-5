import type { FiltrosRelatorioDemonstracao } from "@/shared/types/demonstracao";
import { filtrarPeriodo } from "@/shared/lib/filtrarPeriodo";
import { criarLinkRelatorio, buscarLinkRelatorio } from "../dados/linksRelatorios";
import type MockAdapter from "axios-mock-adapter";
import { obterObrasArmazenadas } from "../dados/obras";
import { resolverUsuarioAutenticadoMock, erroUsuarioMock } from "../core/auth";
import { extrairDados, extrairQueryParams } from "../core/http";
import { periodoCivilValido } from "@/shared/lib/datasCivis";
import { criarLinkCronograma, buscarLinkCronograma, consultarLinkCronograma, filtrosPublicosValidos } from "../dados/linksCronograma";

export function registrarCronogramaPublico(mock: MockAdapter): void {
  // Extensao interna exclusiva do mock; nao representa rota oficial do backend.
  mock.onPost(/\/mock\/relatorios\/compartilhado\/?$/).reply(config => {
    const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!operador) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente.");
    if (!["Administrador", "Financeiro"].includes(operador.perfil.nomePerfil)) return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso não permitido.");
    try { return [201, { token: criarLinkRelatorio(extrairDados<FiltrosRelatorioDemonstracao>(config.data), operador.id) }]; }
    catch { return erroUsuarioMock(400, "INVALID_PARAMETER", "Confira os filtros do relatório."); }
  });
  // Rota39: o handler também aplica autorização e validação, independentemente da UI.
  mock.onPost(/\/cronograma\/compartilhado\/?(?:\?.*)?$/).reply(config => {
    try {
      const operador = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
      if (!operador) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
      if (!["Administrador", "Engenharia"].includes(operador.perfil.nomePerfil)) {
        return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso não permitido.");
      }
      const valor = extrairDados<unknown>(config.data);
      if (valor === null || typeof valor !== "object") return erroUsuarioMock(400, "VALIDATION_ERROR", "Informe um período válido.");
      const dados = valor as Record<string, unknown>;
      if (!periodoCivilValido(dados.dataInicio, dados.dataFim) || typeof dados.dataFim !== "string") {
        return erroUsuarioMock(400, "VALIDATION_ERROR", "Informe início e fim válidos, em ordem.");
      }
      const link = criarLinkCronograma({ dataInicio: dados.dataInicio, dataFim: dados.dataFim }, operador.id);
      return [201, link];
    } catch {
      return erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível persistir o link do cronograma.");
    }
  });

  // Rota40: os novos tokens são classificados antes do ramo financeiro legado.
  mock.onGet(/\/cronograma\/compartilhado\/[^/]+/).reply(config => {
    const match = config.url?.match(/\/cronograma\/compartilhado\/([^/?]+)/);
    let token = "";
    try { token = decodeURIComponent(match?.[1] ?? ""); } catch { /* token inválido */ }
    if (token.startsWith("g86")) {
      try {
        const registro = buscarLinkCronograma(token);
        if (!registro) return erroUsuarioMock(404, "ROUTE_NOT_FOUND", "Link inválido ou expirado.");
        const params = extrairQueryParams(config);
        const filtros = { dataInicio: params.dataInicio, dataFim: params.dataFim };
        if (!filtrosPublicosValidos(filtros)) return erroUsuarioMock(400, "INVALID_PARAMETER", "Confira os filtros de data.");
        return [200, consultarLinkCronograma(registro, filtros)];
      } catch {
        return erroUsuarioMock(500, "INTERNAL_ERROR", "Não foi possível consultar o cronograma.");
      }
    }
    const registro = buscarLinkRelatorio(token);
    if (registro) {
      const obras = filtrarPeriodo(obterObrasArmazenadas(), registro);
      return [200, { periodoInicio: registro.periodoInicio, periodoFim: registro.periodoFim, clienteFiltro: registro.clienteFiltro, obras, totalObras: obras.length, obrasConcluidas: obras.filter(o => o.status === "Concluido").length, totalPaineis: obras.reduce((soma, o) => soma + o.quantidadePaineis, 0) }];
    }

    return erroUsuarioMock(404, "ROUTE_NOT_FOUND", "Link inválido ou expirado.");
  });
}
