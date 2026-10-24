import type MockAdapter from "axios-mock-adapter";
import { resolverUsuarioAutenticadoMock } from "../core/auth";
import { obterObrasArmazenadas } from "../dados/obras";
import { extrairQueryParams } from "../core/http";
import { obterMateriaisArmazenados } from "../dados/materiais";
import { obterProgramacoesArmazenadas } from "../dados/programacoes";
import { obterEquipesArmazenadas } from "../dados/equipes";

export function registrarInstalacao(mock: MockAdapter): void {
  // ─── RELATÓRIOS ───
  // GET /api/obras/:id/instalacao/export (RF-15 / UC-23)
  mock.onGet(/\/obras\/(\d+)\/instalacao\/export\/?(\?.*)?$/).reply(async (config) => {
    const auth = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!auth) return [401, { error: { code: "UNAUTHORIZED", message: "Token ausente ou expirado" } }];
    if (auth.perfil.nomePerfil !== "Administrador") {
      return [403, { error: { code: "ACCESS_DENIED", message: "Apenas Administradores podem exportar detalhes da instalação" } }];
    }
  
    const match = config.url?.match(/\/obras\/(\d+)\/instalacao\/export/);
    const obraId = match ? Number(match[1]) : 0;
    const obras = obterObrasArmazenadas();
    const obra = obras.find((o) => Number(o.id) === obraId);
    if (!obra) return [404, { error: { code: "OBRA_NOT_FOUND", message: "Obra não encontrada" } }];
  
    const query = extrairQueryParams(config);
    const formato = query.formato;
  
    if (formato !== "pdf" && formato !== "xlsx") {
      return [400, { error: { code: "INVALID_PARAMETER", message: "Formato de exportação inválido" } }];
    }
  
    const materiaisObra = obterMateriaisArmazenados().filter((m) => Number(m.obraId) === obraId);
    const programacoesObra = obterProgramacoesArmazenadas().filter((p) => Number(p.obraId) === obraId);
    const equipes = obterEquipesArmazenadas();
    const mapaEquipes = new Map(equipes.map((e) => [e.id, e.nome]));
  
    const dados = {
      obraId: obra.id,
      tituloObra: `Obra #${obra.id} - ${obra.clienteNome}`,
      clienteNome: obra.clienteNome,
      endereco: obra.endereco || null,
      observacoesTecnicas: (obra as { observacoes?: string; descricao?: string }).observacoes || (obra as { observacoes?: string; descricao?: string }).descricao || null,
      materiais: materiaisObra.map((m) => ({
        id: m.id,
        nome: m.descricao?.trim() || m.tipo?.trim() || null,
        quantidade: m.quantidade,
        unidade: m.unidade?.trim() || null,
      })),
      programacoes: programacoesObra.map((p) => ({
        id: p.id,
        equipeId: p.equipeId,
        nomeEquipe: mapaEquipes.get(p.equipeId) || "",
        dataInicio: p.dataInicio ? String(p.dataInicio).split("T")[0] : "",
        dataFim: p.dataFim ? String(p.dataFim).split("T")[0] : "",
      })),
    };
  
    if (formato === "pdf") {
      const { gerarPdfInstalacao } = await import("../instalacaoGenerator");
      const blob = await gerarPdfInstalacao(dados);
      return [200, blob, { "Content-Type": "application/pdf" }];
    } else {
      const { gerarXlsxInstalacao } = await import("../xlsxWriter");
      const blob = gerarXlsxInstalacao(dados);
      return [200, blob, { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }];
    }
  });
}
