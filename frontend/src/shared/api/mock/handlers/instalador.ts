import type MockAdapter from "axios-mock-adapter";
import { resolverUsuarioAutenticadoMock, erroUsuarioMock } from "../core/auth";
import { obterObrasArmazenadas } from "../dados/obras";
import { obterMateriaisArmazenados } from "../dados/materiais";
import { obterProgramacoesArmazenadas } from "../dados/programacoes";
import { obterEquipesArmazenadas } from "../dados/equipes";
import { detalheCenario } from "../dados/detalhes";

export function registrarInstalador(mock: MockAdapter): void {
  // GET /api/instalador/instalacoes — Rota #37
  mock.onGet(/\/instalador\/instalacoes\/?(\?.*)?$/).reply((config) => {
    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (usuario.perfil.nomePerfil !== "InstaladorCampo") {
      return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso restrito ao instalador de campo.");
    }

    const equipeId = usuario.equipeId;
    const equipes = obterEquipesArmazenadas();
    const equipe = equipes.find((e) => e.id === equipeId || e.membros?.some((m) => m.id === usuario.id)) || equipes[0];

    const programacoes = obterProgramacoesArmazenadas();
    const progsEquipe = equipe
      ? programacoes.filter((p) => p.equipeId === equipe.id)
      : programacoes;

    const progsFiltradas = progsEquipe.length > 0 ? progsEquipe : programacoes.slice(0, 3);
    const obras = obterObrasArmazenadas();

    const resultado = progsFiltradas.map((p) => {
      const obra = obras.find((o) => o.id === p.obraId);
      const equipeProg = equipes.find((e) => e.id === p.equipeId);
      return {
        obraId: p.obraId,
        clienteNome: obra?.clienteNome || "Cliente",
        endereco: obra?.endereco || `${obra?.cidade || "Crateús"} - Centro`,
        status: obra?.status || "EmAndamento",
        dataInicio: p.dataInicio,
        dataFim: p.dataFim,
        equipeNome: equipeProg?.nome || equipe?.nome || "Equipe Alfa",
      };
    });

    return [200, resultado];
  });

  // GET /api/instalador/instalacoes/:obraId — Rota #38
  mock.onGet(/\/instalador\/instalacoes\/\d+\/?(\?.*)?$/).reply((config) => {
    const match = config.url?.match(/\/instalador\/instalacoes\/(\d+)/);
    const obraId = match ? Number(match[1]) : 0;

    const usuario = resolverUsuarioAutenticadoMock(config.headers?.Authorization);
    if (!usuario) return erroUsuarioMock(401, "UNAUTHORIZED", "Sessão ausente ou expirada.");
    if (usuario.perfil.nomePerfil !== "InstaladorCampo") {
      return erroUsuarioMock(403, "ACCESS_DENIED", "Acesso restrito ao instalador de campo.");
    }

    const obras = obterObrasArmazenadas();
    const obra = obras.find((o) => o.id === obraId);
    if (!obra) return [404, { error: { code: "OBRA_NOT_FOUND", message: "Obra não encontrada." } }];

    const detalheObra = detalheCenario(obraId);

    const materiais = obterMateriaisArmazenados().filter((m) => m.obraId === obraId);
    const kit = materiais.length > 0
      ? materiais.map((m) => ({ tipo: m.tipo || m.descricao || "Item", quantidade: m.quantidade }))
      : [
          { tipo: "Módulo Solar 550W Monocristalino", quantidade: obra.quantidadePaineis || 24 },
          { tipo: "Inversor Solar String 5kW", quantidade: 1 },
          { tipo: "Kit Estrutura Fixação Telhado", quantidade: 1 },
        ];

    const programacoes = obterProgramacoesArmazenadas();
    const prog = programacoes.find((p) => p.obraId === obraId);
    const equipes = obterEquipesArmazenadas();
    const equipeUsuario = equipes.find((e) => e.id === usuario.equipeId || e.membros?.some((m) => m.id === usuario.id));

    // Regra Condicional E na Rota #38 (RN-06.12): instalador só acessa se fizer parte da equipe da obra
    const temVinculo = prog && equipeUsuario && prog.equipeId === equipeUsuario.id;
    if (!temVinculo) {
      return [403, { error: { code: "ACCESS_DENIED", motivo: "ObraSemVinculoEquipe", message: "O instalador não possui vínculo com a equipe desta obra." } }];
    }

    const equipeProg = prog ? equipes.find((e) => e.id === prog.equipeId) : undefined;

    const endereco = obra.endereco || detalheObra?.endereco || `${obra.cidade || "Crateús/CE"}`;
    const linkNavegacao = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

    return [200, {
      obraId,
      clienteNome: obra.clienteNome,
      clienteTelefone: "(88) 99876-5432",
      endereco,
      linkNavegacao,
      kit,
      projeto: { arquivo: `projeto-executivo-${obraId}.pdf` },
      instrucoes: detalheObra?.descricao || "Fixar trilhos de alumínio antes de subir os painéis. Aterrar inversor na carcaça.",
      dataInicio: prog?.dataInicio || obra.dataFimEstimada,
      dataFim: prog?.dataFim || obra.dataFimEstimada,
      equipeNome: equipeProg?.nome || "Equipe Alfa",
    }];
  });
}
