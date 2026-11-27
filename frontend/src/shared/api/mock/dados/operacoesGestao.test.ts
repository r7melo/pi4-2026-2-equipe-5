import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/shared/api/api";
import { coordenarTransporteMock } from "@/shared/api/mock/core/coordenacao";
import { geracaoCenario, iniciarCenario } from "@/shared/api/mock/core/estadoCenario";
import { MOCK_USUARIOS } from "@/shared/api/mock/dados/usuarios";
import { registrarGestaoUsuarios } from "@/shared/api/mock/handlers/gestaoUsuarios";
import { registrarUsuarios } from "@/shared/api/mock/handlers/usuarios";
import {
  atualizarStatus,
  editarUsuario,
  listarParticipacoesFuturasInstalador,
  listarUsuarios,
} from "@/features/usuarios/services/gestaoUsuarios";
import { criarUsuario } from "@/features/usuarios/services/usuarios";
import { hojeCivilSaoPaulo, somarDiasCivisUTC } from "@/shared/lib/datasCivis";
import { capturarSessaoOperacional } from "@/shared/lib/sessaoOperacao";
import { useAuthStore } from "@/shared/stores/useAuthStore";
import type { Usuario } from "@/shared/types/autorizacao";

function criarStorageMemoria(): Storage {
  const mapa = new Map<string, string>();
  return {
    get length() {
      return mapa.size;
    },
    clear() {
      mapa.clear();
    },
    getItem(chave: string) {
      return mapa.get(chave) ?? null;
    },
    key(indice: number) {
      return Array.from(mapa.keys())[indice] ?? null;
    },
    removeItem(chave: string) {
      mapa.delete(chave);
    },
    setItem(chave: string, valor: string) {
      mapa.set(chave, String(valor));
    },
  };
}

const usuarioAdminTeste: Usuario = MOCK_USUARIOS["admin@admin.com"];

describe("gestaoUsuarios alinhada ao contrato oficial sem equipe fixa", () => {
  let adapterOriginal: typeof api.defaults.adapter;
  let mock: MockAdapter | undefined;

  beforeEach(async () => {
    const localStorageMem = criarStorageMemoria();
    const sessionStorageMem = criarStorageMemoria();
    vi.stubGlobal("localStorage", localStorageMem);
    vi.stubGlobal("sessionStorage", sessionStorageMem);
    vi.stubGlobal("navigator", {
      locks: {
        request: (_nome: string, _opcoes: unknown, tarefa: () => Promise<unknown> | unknown) =>
          Promise.resolve(tarefa()),
      },
    });
    vi.stubGlobal("window", {
      localStorage: localStorageMem,
      sessionStorage: sessionStorageMem,
      dispatchEvent: vi.fn(),
      location: { pathname: "/usuarios", search: "" },
    });

    adapterOriginal = api.defaults.adapter;
    mock = new MockAdapter(api);
    registrarUsuarios(mock);
    registrarGestaoUsuarios(mock);
    coordenarTransporteMock();
    await iniciarCenario();

    const token = `mock_jwt_token_${btoa(usuarioAdminTeste.email)}_${Date.now()}_v0_a0_g${geracaoCenario()}`;
    useAuthStore.getState().login(token, usuarioAdminTeste, "2099-01-01T00:00:00Z");
  });

  afterEach(() => {
    useAuthStore.getState().logout();
    mock?.restore();
    api.defaults.adapter = adapterOriginal;
    vi.unstubAllGlobals();
  });

  it("cadastra sem equipeId, edita nome/e-mail/perfil e alterna ativo via /usuarios/:id/ativo", async () => {
    const sessao = capturarSessaoOperacional();
    const emailInicial = "instalador.sem.equipe1@zl.com.br";
    const criado = await criarUsuario(
      {
        nome: "Lucas Campo",
        email: emailInicial,
        senha: "Senha123!",
        perfil: "InstaladorCampo",
      },
      sessao,
    );
    expect(criado.equipeId).toBeNull();

    const listagemInicial = await listarUsuarios(
      { page: 1, pageSize: 20, busca: emailInicial, ativo: "true" },
      sessao,
    );
    const usuarioCriado = listagemInicial.itens.find((u) => u.id === criado.id);
    expect(usuarioCriado).toBeDefined();

    const emailAtualizado = "lucas.campo.novo@zl.com.br";
    const editado = await editarUsuario(
      criado.id,
      {
        nome: "Lucas Campo Atualizado",
        email: emailAtualizado,
        perfil: "InstaladorCampo",
        revisao: usuarioCriado!.revisao,
      },
      sessao,
    );
    expect(editado.nome).toBe("Lucas Campo Atualizado");
    expect(editado.email).toBe(emailAtualizado);

    const listagemPorNovoEmail = await listarUsuarios(
      { page: 1, pageSize: 20, busca: emailAtualizado, ativo: "true" },
      sessao,
    );
    expect(listagemPorNovoEmail.itens.some((u) => u.id === criado.id)).toBe(true);

    const inativado = await atualizarStatus(
      criado.id,
      { ativo: false, revisao: editado.revisao },
      sessao,
    );
    expect(inativado.ativo).toBe(false);

    const reativado = await atualizarStatus(
      criado.id,
      { ativo: true, revisao: inativado.revisao },
      sessao,
    );
    expect(reativado.ativo).toBe(true);
  });

  it("rejeita com 409 EMAIL_ALREADY_EXISTS ao tentar editar para e-mail já em uso", async () => {
    const sessao = capturarSessaoOperacional();
    const emailTeste = "instalador.sem.equipe2@zl.com.br";
    const criado = await criarUsuario(
      {
        nome: "Rafael Sem Equipe",
        email: emailTeste,
        senha: "Senha123!",
        perfil: "InstaladorCampo",
      },
      sessao,
    );
    const listagem = await listarUsuarios(
      { page: 1, pageSize: 20, busca: emailTeste, ativo: "true" },
      sessao,
    );
    const item = listagem.itens.find((u) => u.id === criado.id)!;

    await expect(
      editarUsuario(
        criado.id,
        {
          nome: "Rafael Sem Equipe",
          email: usuarioAdminTeste.email,
          perfil: "InstaladorCampo",
          revisao: item.revisao,
        },
        sessao,
      ),
    ).rejects.toMatchObject({
      status: 409,
      codigo: "EMAIL_ALREADY_EXISTS",
    });
  });

  it("lista participações ativas/futuras com nome da obra e ignora participações já encerradas", async () => {
    const hoje = hojeCivilSaoPaulo();
    const ontem = somarDiasCivisUTC(hoje, -1);
    const anteontem = somarDiasCivisUTC(hoje, -5);
    const amanha = somarDiasCivisUTC(hoje, 1);
    const semanaQueVem = somarDiasCivisUTC(hoje, 5);

    mock!.onGet(/\/programacoes\/?(\?.*)?$/).reply(200, [
      {
        id: 101,
        obraId: 301,
        dataInicio: anteontem,
        dataFim: ontem,
        prioridade: 1,
        equipe: {
          pessoasPrevistas: 1,
          pessoasAlocadas: 1,
          pessoasFaltantes: 0,
          pessoaDia: 3,
          integrantes: [{ usuarioId: 4, nome: "Marcos", dataEntrada: anteontem, dataSaida: ontem }],
        },
      },
      {
        id: 102,
        obraId: 302,
        dataInicio: ontem,
        dataFim: amanha,
        prioridade: 1,
        equipe: {
          pessoasPrevistas: 1,
          pessoasAlocadas: 1,
          pessoasFaltantes: 0,
          pessoaDia: 3,
          integrantes: [{ usuarioId: 4, nome: "Marcos", dataEntrada: ontem, dataSaida: amanha }],
        },
      },
      {
        id: 103,
        obraId: 303,
        dataInicio: amanha,
        dataFim: semanaQueVem,
        prioridade: 2,
        equipe: {
          pessoasPrevistas: 1,
          pessoasAlocadas: 1,
          pessoasFaltantes: 0,
          pessoaDia: 4,
          integrantes: [{ usuarioId: 4, nome: "Marcos", dataEntrada: amanha, dataSaida: semanaQueVem }],
        },
      },
    ]);
    mock!.onGet(/\/obras\/?(\?.*)?$/).reply(200, {
      itens: [
        { id: 302, clienteNome: "Clínica Solar" },
        { id: 303, clienteNome: "Mercado Horizonte" },
      ],
    });

    const sessao = capturarSessaoOperacional();
    const participacoes = await listarParticipacoesFuturasInstalador(4, sessao);
    expect(participacoes).toEqual([
      {
        programacaoId: 102,
        obraId: 302,
        obraNome: "Clínica Solar",
        dataEntrada: ontem,
        dataSaida: amanha,
        emAndamento: true,
      },
      {
        programacaoId: 103,
        obraId: 303,
        obraNome: "Mercado Horizonte",
        dataEntrada: amanha,
        dataSaida: semanaQueVem,
        emAndamento: false,
      },
    ]);
  });
});
