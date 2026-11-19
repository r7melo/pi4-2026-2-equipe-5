import fs from "node:fs";
import path from "node:path";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LIMITE_JSON_BLOB_BYTES,
  baixarArquivoBlob,
  lerJsonDeBlob,
  validarAssinaturaArquivo,
  type FormatoBinarioSuportado,
} from "./arquivoBlob";
import * as arquivoInstalacao from "@/features/obras/lib/arquivoInstalacao";
import { normalizarErroExportacao } from "@/features/financeiro/lib/erroExportacao";
import {
  capturarSessaoOperacional,
  deveExibirErroLocal,
  erroDaSessaoAnterior,
  registrarErro403,
  sessaoOperacionalVigente,
  sincronizarSessaoOperacional,
} from "./sessaoOperacao";
import { ApiErro } from "@/shared/api/api";

const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function listarArquivosProducaoTs(diretorio: string): string[] {
  const saida: string[] = [];
  for (const entrada of fs.readdirSync(diretorio, { withFileTypes: true })) {
    const completo = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) {
      saida.push(...listarArquivosProducaoTs(completo));
    } else if (/\.(ts|tsx)$/.test(entrada.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entrada.name)) {
      saida.push(completo);
    }
  }
  return saida;
}

describe("Demanda #105 — shared/lib/arquivoBlob e contratos dos consumidores", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("CA-105-01: validarAssinaturaArquivo aprova PDF e XLSX com MIME exato ou parametrizado e rejeita falsos/truncados/inválidos", async () => {
    expect(await validarAssinaturaArquivo(new Blob(["%PDF-1.7\n"], { type: "application/pdf" }), "pdf")).toBe(true);
    expect(
      await validarAssinaturaArquivo(
        new Blob(["%PDF-1.4\n" + "A".repeat(70_000)], { type: " Application/PDF ; charset=binary " }),
        "pdf",
      ),
    ).toBe(true);
    expect(await validarAssinaturaArquivo(new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14])], { type: MIME_XLSX }), "xlsx")).toBe(true);
    expect(
      await validarAssinaturaArquivo(
        new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], { type: `${MIME_XLSX}; charset=binary` }),
        "xlsx",
      ),
    ).toBe(true);

    // Vazios, truncados, magic byte parcial, MIME ausente/divergente, HTML/JSON mascarados
    expect(await validarAssinaturaArquivo(new Blob([], { type: "application/pdf" }), "pdf")).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob(["%PDF"], { type: "application/pdf" }), "pdf")).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob(["%PDFX"], { type: "application/pdf" }), "pdf")).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob([new Uint8Array([0x50, 0x4b, 0x03])], { type: MIME_XLSX }), "xlsx")).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x05])], { type: MIME_XLSX }), "xlsx")).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob(["%PDF-1.4"], { type: "" }), "pdf")).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob(["%PDF-1.4"], { type: "text/html" }), "pdf")).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob(["<html></html>"], { type: "application/pdf" }), "pdf")).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob(['{"error":"x"}'], { type: "application/pdf" }), "pdf")).toBe(false);

    // Não-Blob e formatos inválidos em runtime (inclusive chaves de protótipo)
    expect(await validarAssinaturaArquivo("%PDF-1.4" as unknown as Blob, "pdf")).toBe(false);
    expect(await validarAssinaturaArquivo(null as unknown as Blob, "pdf")).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob(["%PDF-1.4"], { type: "application/pdf" }), "csv" as unknown as FormatoBinarioSuportado)).toBe(false);
    expect(await validarAssinaturaArquivo(new Blob(["%PDF-1.4"], { type: "application/pdf" }), "toString" as unknown as FormatoBinarioSuportado)).toBe(false);
  });

  it("CA-105-02: lerJsonDeBlob decodifica até 65536 bytes e devolve null sem ler texto em excesso, vazio ou não-Blob", async () => {
    expect(LIMITE_JSON_BLOB_BYTES).toBe(65_536);

    const valido = new Blob([JSON.stringify({ ok: true, n: 105 })], { type: "application/json" });
    expect(await lerJsonDeBlob(valido)).toEqual({ ok: true, n: 105 });

    // Borda exata de 65536 bytes
    const prefixo = '{"v":"';
    const sufixo = '"}';
    const exato = new Blob([prefixo + "a".repeat(65_536 - prefixo.length - sufixo.length) + sufixo], { type: "application/json" });
    expect(exato.size).toBe(65_536);
    expect(await lerJsonDeBlob(exato)).toEqual({ v: "a".repeat(65_536 - prefixo.length - sufixo.length) });

    // Acima de 65536 bytes: não pode invocar blob.text()
    const gigante = new Blob(["a".repeat(65_537)], { type: "application/json" });
    const spyTextoGigante = vi.spyOn(gigante, "text");
    expect(await lerJsonDeBlob(gigante)).toBeNull();
    expect(spyTextoGigante).not.toHaveBeenCalled();

    // JSON literal null, sintaxe inválida, vazio, limite inválido e não-Blob
    expect(await lerJsonDeBlob(new Blob(["null"], { type: "application/json" }))).toBeNull();
    expect(await lerJsonDeBlob(new Blob(["{invalido"], { type: "application/json" }))).toBeNull();
    expect(await lerJsonDeBlob(new Blob([], { type: "application/json" }))).toBeNull();
    expect(await lerJsonDeBlob(valido, 0)).toBeNull();
    expect(await lerJsonDeBlob(valido, -10)).toBeNull();
    expect(await lerJsonDeBlob(valido, Number.NaN)).toBeNull();
    expect(await lerJsonDeBlob(valido, Number.POSITIVE_INFINITY)).toBeNull();
    expect(await lerJsonDeBlob("{}" as unknown as Blob)).toBeNull();
  });

  it("CA-105-02: erroExportacao e arquivoInstalacao preservam semântica de erros, 401/403 e herdarContexto403", async () => {
    const config = { headers: new AxiosHeaders() };

    // Blob > 65536, JSON inválido e JSON null retornam AxiosError original intacto
    const casosIntactos = [
      new Blob(["x".repeat(65_537)], { type: "application/json" }),
      new Blob(["<html>erro</html>"], { type: "text/html" }),
      new Blob(["null"], { type: "application/json" }),
    ].map((data) => {
      const original = new AxiosError("Falha", "ERR_BAD_RESPONSE", config, undefined, {
        status: 500,
        statusText: "Erro",
        headers: {},
        config,
        data,
      });
      return { original, promessa: normalizarErroExportacao(original) };
    });
    const resultadosIntactos = await Promise.all(casosIntactos.map((c) => c.promessa));
    resultadosIntactos.forEach((normalizado, i) => {
      expect(normalizado).toBe(casosIntactos[i].original);
      expect((normalizado as AxiosError).response?.status).toBe(500);
    });

    // 401 preservado e 403 convertido em ApiErro mantendo herdarContexto403 no WeakMap de sessaoOperacao
    const erro401 = new AxiosError("401", "ERR_BAD_REQUEST", config, undefined, {
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config,
      data: new Blob([JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Expirado" } })]),
    });
    expect(await normalizarErroExportacao(erro401)).toBe(erro401);

    sincronizarSessaoOperacional({ token: "tok", usuario: { id: 1, perfil: { nomePerfil: "Administrador" } }, expiresAt: "2099-01-01T00:00:00Z" });
    const sessaoAtual = capturarSessaoOperacional();
    const erro403Antigo = new AxiosError("403", "ERR_BAD_REQUEST", config, undefined, {
      status: 403,
      statusText: "Forbidden",
      headers: {},
      config,
      data: {},
    });
    registrarErro403(erro403Antigo, { sessao: 999_999, avisoGlobal: false });
    const api403Antigo = await normalizarErroExportacao(erro403Antigo);
    expect(api403Antigo).toBeInstanceOf(ApiErro);
    expect((api403Antigo as ApiErro).status).toBe(403);
    expect(sessaoOperacionalVigente(999_999)).toBe(false);
    expect(erroDaSessaoAnterior(api403Antigo)).toBe(true);

    const erro403Aviso = new AxiosError("403", "ERR_BAD_REQUEST", config, undefined, {
      status: 403,
      statusText: "Forbidden",
      headers: {},
      config,
      data: {},
    });
    registrarErro403(erro403Aviso, { sessao: sessaoAtual, avisoGlobal: true });
    const api403Aviso = await normalizarErroExportacao(erro403Aviso);
    expect(api403Aviso).toBeInstanceOf(ApiErro);
    expect(erroDaSessaoAnterior(api403Aviso)).toBe(false);
    expect(deveExibirErroLocal(api403Aviso)).toBe(false);

    // Payload JSON válido em Blob e objeto direto viram ApiErro (inclusive herdando contexto 403 se registrado)
    const blobValido = new Blob([JSON.stringify({ error: { code: "NO_WORKS", message: "Sem obras" } })], { type: "application/json" });
    const errBlob = new AxiosError("404", "ERR_BAD_REQUEST", config, undefined, { status: 404, statusText: "Not Found", headers: {}, config, data: blobValido });
    const resBlob = await normalizarErroExportacao(errBlob);
    expect(resBlob).toBeInstanceOf(ApiErro);
    expect((resBlob as ApiErro).codigo).toBe("NO_WORKS");
    expect(resBlob.message).toBe("Sem obras");

    const errObj = new AxiosError("404", "ERR_BAD_REQUEST", config, undefined, {
      status: 404,
      statusText: "Not Found",
      headers: {},
      config,
      data: { error: { code: "NO_WORKS", message: "Objeto direto" } },
    });
    const resObj = await normalizarErroExportacao(errObj);
    expect(resObj).toBeInstanceOf(ApiErro);
    expect(resObj.message).toBe("Objeto direto");

    // Erro não-Axios comum preservado
    const erroComum = new Error("Resposta de exportação inválida. Tente novamente.");
    expect(await normalizarErroExportacao(erroComum)).toBe(erroComum);

    // arquivoInstalacao.ts com objeto { response } não-Axios, HTML e gigante
    expect(
      await arquivoInstalacao.extrairErroBlob({
        response: { status: 404, data: new Blob([JSON.stringify({ error: { code: "OBRA_NOT_FOUND" } })], { type: "application/json" }) },
      }),
    ).toEqual({ status: 404, codigo: "OBRA_NOT_FOUND", mensagem: "Obra não encontrada." });
    expect(
      await arquivoInstalacao.extrairErroBlob({
        response: { status: 500, data: new Blob(["<html>erro</html>"], { type: "text/html" }) },
      }),
    ).toEqual({ status: 500, codigo: null, mensagem: "Não foi possível gerar o arquivo." });
    expect(
      await arquivoInstalacao.extrairErroBlob({
        response: { status: 500, data: new Blob(["x".repeat(65_537)], { type: "application/json" }) },
      }),
    ).toEqual({ status: 500, codigo: null, mensagem: "Não foi possível gerar o arquivo." });
  });

  it("CA-105-03: baixarArquivoBlob gerencia âncora no try/finally, preserva URL antes de 1000ms, revoga em 1000ms e limpa em exceções", () => {
    vi.useFakeTimers();

    const prepararAmbienteDom = (opts: { falharAppend?: boolean; falharClick?: boolean } = {}) => {
      const nosNoBody: unknown[] = [];
      const eventos: string[] = [];
      let revogacoes = 0;
      let criacoes = 0;
      let ultimoLink: {
        href: string;
        download: string;
        style: { display: string };
        click: () => void;
        remove: () => void;
      } | null = null;

      vi.stubGlobal("URL", {
        createObjectURL: () => {
          criacoes += 1;
          return `blob:teste-${criacoes}`;
        },
        revokeObjectURL: () => {
          revogacoes += 1;
        },
      });
      vi.stubGlobal("document", {
        createElement: () => {
          const el = {
            href: "",
            download: "",
            style: { display: "" },
            click: () => {
              eventos.push("click");
              if (opts.falharClick) throw new Error("falha click");
            },
            remove: () => {
              eventos.push("remove");
              const idx = nosNoBody.indexOf(el);
              if (idx >= 0) nosNoBody.splice(idx, 1);
            },
          };
          ultimoLink = el;
          return el;
        },
        body: {
          appendChild: (node: unknown) => {
            eventos.push("appendChild");
            if (opts.falharAppend) throw new Error("falha append");
            nosNoBody.push(node);
            return node;
          },
        },
      });
      return { nosNoBody, eventos, getRevogacoes: () => revogacoes, getUltimoLink: () => ultimoLink };
    };

    // Fluxo normal: ordem appendChild -> click -> remove, 999ms não revoga, 1000ms revoga uma única vez, idempotente
    const dom1 = prepararAmbienteDom();
    const limpar1 = baixarArquivoBlob(new Blob(["%PDF-1.4"]), "rel.pdf");
    expect(dom1.eventos).toEqual(["appendChild", "click", "remove"]);
    expect(dom1.nosNoBody).toHaveLength(0);
    expect(dom1.getUltimoLink()?.style.display).toBe("none");
    expect(dom1.getUltimoLink()?.download).toBe("rel.pdf");
    vi.advanceTimersByTime(999);
    expect(dom1.getRevogacoes()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(dom1.getRevogacoes()).toBe(1);
    limpar1();
    limpar1();
    expect(dom1.getRevogacoes()).toBe(1);

    // Limpeza explícita antes de 1000ms cancela timer e revoga uma vez
    const dom2 = prepararAmbienteDom();
    const limpar2 = baixarArquivoBlob(new Blob(["%PDF-1.4"]), "rel2.pdf");
    limpar2();
    limpar2();
    expect(dom2.getRevogacoes()).toBe(1);
    vi.advanceTimersByTime(1500);
    expect(dom2.getRevogacoes()).toBe(1);

    // Falha em appendChild, click e agendamento (setTimeout) removem nó e revogam imediatamente
    const dom3 = prepararAmbienteDom({ falharAppend: true });
    expect(() => baixarArquivoBlob(new Blob(["a"]), "a.pdf")).toThrow("falha append");
    expect(dom3.nosNoBody).toHaveLength(0);
    expect(dom3.getRevogacoes()).toBe(1);

    const dom4 = prepararAmbienteDom({ falharClick: true });
    expect(() => baixarArquivoBlob(new Blob(["a"]), "b.pdf")).toThrow("falha click");
    expect(dom4.nosNoBody).toHaveLength(0);
    expect(dom4.getRevogacoes()).toBe(1);

    const dom5 = prepararAmbienteDom();
    vi.stubGlobal("setTimeout", () => {
      throw new Error("falha timer");
    });
    expect(() => baixarArquivoBlob(new Blob(["a"]), "c.pdf")).toThrow("falha timer");
    expect(dom5.nosNoBody).toHaveLength(0);
    expect(dom5.getRevogacoes()).toBe(1);
  });

  it("CA-105-04 e CA-105-05: preserva DAG estrito, exports de arquivoInstalacao, zero código morto e timer real pós-cleanup", async () => {
    // Garante que o teardown do teste anterior não deixou FakeTimers órfão em globalThis.setTimeout
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const srcRoot = path.resolve(import.meta.dirname, "../..");
    const conteudoModulo = fs.readFileSync(path.join(srcRoot, "shared/lib/arquivoBlob.ts"), "utf8");
    expect(conteudoModulo).not.toMatch(/from\s+["'](?:@\/features|@\/types|\.\.\/\.\.\/features|.*composition)/);
    expect(conteudoModulo).not.toMatch(/import\s*\(/);

    expect(Object.keys(arquivoInstalacao).sort()).toEqual([
      "baixarArquivoBlob",
      "extrairErroBlob",
      "validarAssinaturaArquivo",
    ]);

    const simboloMorto = "gerarLinkCompartilhadoRelatorio";
    for (const arq of listarArquivosProducaoTs(srcRoot)) {
      const txt = fs.readFileSync(arq, "utf8");
      expect(txt, `Código morto encontrado em ${arq}`).not.toContain(simboloMorto);
    }
  });
});
