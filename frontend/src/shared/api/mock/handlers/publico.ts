import type MockAdapter from "axios-mock-adapter";
import { obterObrasArmazenadas } from "../dados/obras";
import { resolverUsuarioAutenticadoMock, erroUsuarioMock } from "../core/auth";
import { extrairDados, extrairQueryParams } from "../core/http";
import { periodoCivilValido } from "@/shared/lib/datasCivis";
import { criarLinkCronograma, buscarLinkCronograma, consultarLinkCronograma, filtrosPublicosValidos } from "../dados/linksCronograma";

export function registrarCronogramaPublico(mock: MockAdapter): void {
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
    // Compatibilidade restrita ao produtor financeiro existente; não é garantia global de privacidade.
    try {
      const decoded = atob(token);
      if (decoded.includes("|")) {
        const [periodoInicio, periodoFim, clienteFiltro] = decoded.split("|");
        const obrasArmazenadas = obterObrasArmazenadas();
        
        const obrasFiltradas = obrasArmazenadas.filter((o) => {
          const passaCliente = !clienteFiltro || clienteFiltro === "todos" || o.clienteNome.toLowerCase() === clienteFiltro.toLowerCase();
          return passaCliente;
        });
  
        const totalPaineis = obrasFiltradas.reduce((acc, o) => acc + (o.quantidadePaineis || 0), 0);
  
        return [
          200,
          {
            periodoInicio: periodoInicio || "",
            periodoFim: periodoFim || "",
            clienteFiltro: clienteFiltro || "todos",
            obras: obrasFiltradas,
            totalObras: obrasFiltradas.length,
            obrasConcluidas: obrasFiltradas.filter((o) => o.status === "Concluido").length,
            totalPaineis,
          },
        ];
      }
    } catch {
      // Não é o formato financeiro legado; rejeitar como cronograma desconhecido.
    }
  
    return erroUsuarioMock(404, "ROUTE_NOT_FOUND", "Link inválido ou expirado.");
  });
}
