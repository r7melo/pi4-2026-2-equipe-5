import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BotaoVisibilidadeSenha,
  type BotaoVisibilidadeSenhaProps,
} from "../components/ui/BotaoVisibilidadeSenha";
import { Input } from "../components/ui/Input";

function renderizarBotao(props: Partial<BotaoVisibilidadeSenhaProps> = {}) {
  return renderToStaticMarkup(
    createElement(BotaoVisibilidadeSenha, {
      visivel: false,
      onAlternar: () => {},
      ...props,
    }),
  );
}

describe("BotaoVisibilidadeSenha e Input.acaoDireita (RN-109-01 / RN-109-02 / RN-109-04)", () => {
  it("renderiza button sem aria-pressed, com rótulo padrão dinâmico, ícone aria-hidden e caixa 44×44px", () => {
    const htmlOculto = renderizarBotao({ visivel: false });
    expect(htmlOculto).toMatch(/^<button[^>]*type="button"/);
    expect(htmlOculto).toContain('aria-label="Mostrar senha"');
    expect(htmlOculto).not.toContain("aria-pressed");
    expect(htmlOculto).toContain("h-11");
    expect(htmlOculto).toContain("w-11");
    expect(htmlOculto).toContain("min-h-11");
    expect(htmlOculto).toContain("min-w-11");
    expect(htmlOculto).not.toContain("focus-visible:outline-none");
    expect(htmlOculto).toContain("focus:outline-none");
    expect(htmlOculto).toContain("focus-visible:ring-2 focus-visible:ring-primary");
    expect(htmlOculto).not.toMatch(/<button[^>]*\sdisabled(?:=""|\s|>)/);
    expect(htmlOculto).toMatch(/<svg[^>]*aria-hidden="true"/);

    const htmlVisivel = renderizarBotao({ visivel: true });
    expect(htmlVisivel).toContain('aria-label="Ocultar senha"');
    expect(htmlVisivel).not.toContain("aria-pressed");
    expect(htmlVisivel).not.toMatch(/<button[^>]*\sdisabled(?:=""|\s|>)/);
    expect(htmlVisivel).toMatch(/<svg[^>]*aria-hidden="true"/);
  });

  it("respeita rótulos customizados, disabled e substituição vertical conjunta via twMerge", () => {
    const htmlCustom = renderizarBotao({
      visivel: true,
      disabled: true,
      rotuloMostrar: "Mostrar senha atual",
      rotuloOcultar: "Ocultar senha atual",
    });
    expect(htmlCustom).toContain('aria-label="Ocultar senha atual"');
    expect(htmlCustom).toMatch(/<button[^>]*\sdisabled(?:=""|\s|>)/);

    const htmlOverride = renderizarBotao({
      className: "top-2 translate-y-0",
    });
    const classe = htmlOverride.match(/class="([^"]+)"/)?.[1] ?? "";
    expect(classe).toContain("top-2");
    expect(classe).toContain("translate-y-0");
    expect(classe).not.toContain("top-1/2");
    expect(classe).not.toContain("-translate-y-1/2");
  });

  it("renderiza acaoDireita dentro do wrapper relative de Input.tsx mantendo compatibilidade aditiva", () => {
    const htmlSemAcao = renderToStaticMarkup(
      createElement(Input, { id: "campo-comum", label: "E-mail", type: "email" }),
    );
    expect(htmlSemAcao).not.toContain("<button");
    expect(htmlSemAcao).not.toContain("acaoDireita");

    const htmlComAcao = renderToStaticMarkup(
      createElement(Input, {
        id: "usuario-senha",
        label: "Senha inicial",
        type: "password",
        className: "py-3 pr-14",
        acaoDireita: createElement(BotaoVisibilidadeSenha, {
          visivel: false,
          onAlternar: () => {},
        }),
      }),
    );

    const relMatch = htmlComAcao.match(/<div class="relative">([\s\S]*?)<\/div>/);
    expect(relMatch?.[1]).toBeTruthy();
    expect(relMatch?.[1]).toContain('<input id="usuario-senha"');
    expect(relMatch?.[1]).toContain('aria-label="Mostrar senha"');
    expect(relMatch?.[1]).not.toContain("<label");

    const inputTag = relMatch?.[1].match(/<input[^>]*>/)?.[0] ?? "";
    expect(inputTag).toContain("py-3");
    expect(inputTag).toContain("pr-14");
    expect(inputTag).not.toContain("py-2.5");
  });
});
