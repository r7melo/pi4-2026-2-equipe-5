import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { api } from "@/shared/api/api";
import { coordenarTransporteMock } from "@/shared/api/mock/core/coordenacao";
import { geracaoCenario, iniciarCenario } from "@/shared/api/mock/core/estadoCenario";
import { MOCK_USUARIOS } from "@/shared/api/mock/dados/usuarios";
import { registrarGestaoUsuarios } from "@/shared/api/mock/handlers/gestaoUsuarios";
import { registrarUsuarios } from "@/shared/api/mock/handlers/usuarios";
import { atualizarStatus, editarUsuario, listarUsuarios } from "@/features/usuarios/services/gestaoUsuarios";
import { criarUsuario } from "@/features/usuarios/services/usuarios";
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

describe("gestaoUsuarios no mock sem exigir equipe fixa para instalador", () => {
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

  it("permite editar, inativar e reativar InstaladorCampo sem equipe fixa (equipeId: null)", async () => {
    const sessao = capturarSessaoOperacional();
    const emailTeste = "instalador.sem.equipe1@zl.com.br";
    const criado = await criarUsuario(
      {
        nome: "Lucas Campo",
        email: emailTeste,
        senha: "Senha123!",
        perfil: "InstaladorCampo",
        equipeId: null,
      },
      sessao,
    );
    expect(criado.equipeId).toBeNull();

    const listagemInicial = await listarUsuarios(
      { page: 1, pageSize: 20, busca: emailTeste, ativo: "true" },
      sessao,
    );
    const usuarioCriado = listagemInicial.itens.find((u) => u.id === criado.id);
    expect(usuarioCriado).toBeDefined();
    expect(usuarioCriado!.equipeId).toBeNull();

    const editado = await editarUsuario(
      criado.id,
      {
        nome: "Lucas Campo Atualizado",
        perfil: "InstaladorCampo",
        equipeId: null,
        revisao: usuarioCriado!.revisao,
      },
      sessao,
      usuarioCriado!.email,
    );
    expect(editado.nome).toBe("Lucas Campo Atualizado");
    expect(editado.equipeId).toBeNull();

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

  it("continua rejeitando equipeId inexistente quando informado", async () => {
    const sessao = capturarSessaoOperacional();
    const emailTeste = "instalador.sem.equipe2@zl.com.br";
    const criado = await criarUsuario(
      {
        nome: "Rafael Sem Equipe",
        email: emailTeste,
        senha: "Senha123!",
        perfil: "InstaladorCampo",
        equipeId: null,
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
          nome: "Rafael Campo",
          perfil: "InstaladorCampo",
          equipeId: 99999,
          revisao: item.revisao,
        },
        sessao,
        item.email,
      ),
    ).rejects.toMatchObject({
      status: 404,
      codigo: "EQUIPE_NOT_FOUND",
    });
  });
});
