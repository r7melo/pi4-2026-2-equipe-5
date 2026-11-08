import { CORES_EXPORTACAO } from '@/shared/lib/exportacao/identidade';
import { corPdf, carregarFontePdf } from '@/shared/lib/exportacao/pdf';
import { PDFDocument, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { DadosInstalacao } from "@/shared/types/exportacaoInstalacao";
import { avaliarCompletudeInstalacao, descreverFaltanteInstalacao, normalizarTextoInstalacao } from "@/shared/lib/instalacao";

// Paleta fixa de impressão aprovada; independente do tema da aplicação.
const CORES = Object.fromEntries(Object.entries(CORES_EXPORTACAO).map(([nome, hex]) => [nome, corPdf(hex)])) as Record<keyof typeof CORES_EXPORTACAO, RGB>;
type Coluna = { titulo: string; largura: number; direita?: boolean };
type LinhaCartao =
  | { tipo: "campo"; rotulo: string; inicio: boolean; valor: string }
  | { tipo: "observacao"; inicio: boolean; valor: string };

export async function gerarPdfInstalacao(dados: DadosInstalacao): Promise<Blob> {
  const emissao = new Date();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonte = await pdf.embedFont(await carregarFontePdf(), { subset: true });
  const caracteres = new Set(fonte.getCharacterSet());
  const margem = 50, largura = 495.28, limiteInferior = 74;
  let pagina = pdf.addPage([595.28, 841.89]);
  let y = 805;

  const texto = (valor?: string | null): string => {
    const normalizado = (normalizarTextoInstalacao(valor) ?? "Não informado")
      .replace(/[\t\r\n\v\f]/g, " ").normalize("NFC");
    if (Array.from(normalizado).some(c => !caracteres.has(c.codePointAt(0) ?? 0))) {
      throw new Error("Texto sem representação na fonte; não gerar arquivo com dados perdidos");
    }
    return normalizado;
  };
  const linhas = (valor: string | null | undefined, tamanho: number, espaco: number): string[] => {
    const resultado: string[] = [];
    for (const paragrafo of (normalizarTextoInstalacao(valor) ?? "Não informado").split(/\r\n|\r|\n/)) {
      if (!paragrafo.trim()) continue;
      let linha = "";
      for (const palavra of texto(paragrafo).split(/\s+/u)) {
        const tentativa = linha ? `${linha} ${palavra}` : palavra;
        if (fonte.widthOfTextAtSize(tentativa, tamanho) <= espaco) {
          linha = tentativa;
          continue;
        }
        if (linha) resultado.push(linha);
        linha = "";
        for (const caractere of palavra) {
          if (fonte.widthOfTextAtSize(linha + caractere, tamanho) > espaco) {
            resultado.push(linha); linha = "";
          }
          linha += caractere;
        }
      }
      if (linha) resultado.push(linha);
    }
    return resultado;
  };
  const escrever = (valor: string, x: number, baseline: number, tamanho = 9, cor = CORES.texto) => {
    pagina.drawText(valor, { x, y: baseline, size: tamanho, font: fonte, color: cor });
  };
  const linhaHorizontal = (baseline: number) => pagina.drawLine({
    start: { x: margem, y: baseline }, end: { x: margem + largura, y: baseline },
    thickness: 0.5, color: CORES.borda,
  });
  const novaPagina = () => {
    pagina = pdf.addPage([595.28, 841.89]);
    escrever("ZL ENGENHARIA", margem, 794, 9, CORES.institucional);
    const rotulo = `Dossiê de instalação — obra #${dados.obraId} — continuação`;
    escrever(rotulo, margem + largura - fonte.widthOfTextAtSize(rotulo, 8), 794, 8, CORES.secundario);
    linhaHorizontal(782); y = 766;
  };

  pagina.drawRectangle({ x: margem, y: 762, width: largura, height: 43, color: CORES.institucional });
  escrever("ZL ENGENHARIA", margem + 12, 788, 11, CORES.branco);
  escrever("Sistema de Gestão de Obras", margem + 12, 774, 8, CORES.branco);
  const instante = `Emissão: ${emissao.toISOString().slice(0, 10).split("-").reverse().join("/")} ${emissao.toISOString().slice(11, 16)} UTC`;
  escrever(instante, margem + largura - 12 - fonte.widthOfTextAtSize(instante, 8), 788, 8, CORES.branco);
  const obra = `OBRA #${dados.obraId}`;
  escrever(obra, margem + largura - 12 - fonte.widthOfTextAtSize(obra, 9), 774, 9, CORES.branco);
  escrever("DOSSIÊ TÉCNICO DE INSTALAÇÃO SOLAR", margem, 740, 13, CORES.institucional);
  escrever("Dossiê de instalação solar — ZL Engenharia", margem, 722, 9, CORES.secundario);
  y = 704;

  // Cada segmento reserva cabeçalho, pelo menos uma linha e espaço inferior.
  const caixa = (titulo: string, conteudo: string[], fundo: RGB, borda: RGB, cor: RGB) => {
    let inicio = 0;
    while (inicio < conteudo.length) {
      if (y - limiteInferior < 52) novaPagina();
      const quantidade = Math.min(conteudo.length - inicio, Math.floor((y - limiteInferior - 38) / 14));
      const altura = 38 + quantidade * 14;
      pagina.drawRectangle({ x: margem, y: y - altura, width: largura, height: altura,
        color: fundo, borderColor: borda, borderWidth: 0.6 });
      escrever(titulo + (inicio ? " (continuação)" : ""), margem + 12, y - 17, 10, cor);
      for (let indice = 0; indice < quantidade; indice++) {
        escrever(conteudo[inicio + indice], margem + 12, y - 38 - indice * 14, 9, cor);
      }
      inicio += quantidade; y -= altura + 16;
      if (inicio < conteudo.length) novaPagina();
    }
  };
  // Referência aprovada: layout C com o cartão de identificação da opção A.
  const identificacao: LinhaCartao[] = [
    ["Obra", `#${dados.obraId} — ${texto(dados.tituloObra)}`],
    ["Cliente", texto(dados.clienteNome)],
    ["Endereço", texto(dados.endereco)],
  ].flatMap(([rotulo, valor]) => linhas(valor, 8.5, largura - 95).map((linha, indice) =>
    ({ tipo: "campo" as const, rotulo, inicio: indice === 0, valor: linha })));
  identificacao.push(...linhas(dados.observacoesTecnicas, 8.5, largura - 32).map((valor, indice) =>
    ({ tipo: "observacao" as const, inicio: indice === 0, valor })));
  const alturaLinhaCartao = (linha: LinhaCartao) => linha.tipo === "observacao" && linha.inicio ? 37 : 14;
  let inicioCartao = 0;
  while (inicioCartao < identificacao.length) {
    let quantidade = 0, alturaConteudo = 0;
    while (inicioCartao + quantidade < identificacao.length) {
      const proxima = alturaLinhaCartao(identificacao[inicioCartao + quantidade]);
      if (alturaConteudo + proxima > y - limiteInferior - 44) break;
      alturaConteudo += proxima; quantidade++;
    }
    if (!quantidade) { novaPagina(); continue; }
    const altura = 44 + alturaConteudo;
    pagina.drawRectangle({ x: margem, y: y - altura, width: largura, height: altura,
      color: CORES.superficie, borderColor: CORES.borda, borderWidth: 0.6 });
    pagina.drawRectangle({ x: margem, y: y - altura, width: 3.5, height: altura, color: CORES.institucional });
    escrever("Identificação da obra" + (inicioCartao ? " (continuação)" : ""), margem + 16, y - 17, 10);
    let baseline = y - 40;
    for (let indice = 0; indice < quantidade; indice++) {
      const linha = identificacao[inicioCartao + indice];
      if (linha.tipo === "campo") {
        if (linha.inicio || indice === 0) escrever(linha.rotulo, margem + 16, baseline, 8.5, CORES.secundario);
        escrever(linha.valor, margem + 79, baseline, 8.5);
      } else {
        if (linha.inicio) {
          pagina.drawLine({ start: { x: margem + 16, y: baseline + 5 },
            end: { x: margem + largura - 16, y: baseline + 5 }, thickness: 0.5, color: CORES.borda });
          escrever("Observações técnicas", margem + 16, baseline - 9, 8, CORES.secundario);
        }
        escrever(linha.valor, margem + 16, baseline - (linha.inicio ? 23 : 0), 8.5);
      }
      baseline -= alturaLinhaCartao(linha);
    }
    inicioCartao += quantidade; y -= altura + 16;
  }

  const tabela = (titulo: string, colunas: Coluna[], registros: string[][], vazio: string) => {
    const cabecalho = (continuacao = false) => {
      // Reserva título, cabeçalho e uma linha de conteúdo na mesma página.
      if (y - limiteInferior < 78) novaPagina();
      escrever(titulo + (continuacao ? " (continuação)" : ""), margem, y - 11, 11, CORES.institucional);
      y -= 25;
      pagina.drawRectangle({ x: margem, y: y - 28, width: largura, height: 28, color: CORES.cabecalho });
      let x = margem;
      for (const coluna of colunas) {
        const posicao = coluna.direita ? x + coluna.largura - 8 - fonte.widthOfTextAtSize(coluna.titulo, 8.5) : x + 8;
        escrever(coluna.titulo, posicao, y - 18, 8.5);
        x += coluna.largura;
      }
      y -= 28;
    };
    cabecalho();
    if (!registros.length) {
      escrever(vazio, margem + 8, y - 16, 9, CORES.secundario);
      y -= 42; return;
    }
    registros.forEach((registro, indiceRegistro) => {
      const celulas = colunas.map((coluna, indice) => linhas(registro[indice], 8.5, coluna.largura - 16));
      const totalLinhas = Math.max(...celulas.map(celula => celula.length));
      let inicio = 0;
      while (inicio < totalLinhas) {
        let capacidade = Math.floor((y - limiteInferior - 12) / 13);
        if (capacidade < 1) { novaPagina(); cabecalho(true); capacidade = Math.floor((y - limiteInferior - 12) / 13); }
        const quantidade = Math.min(capacidade, totalLinhas - inicio);
        const altura = quantidade * 13 + 12;
        if (indiceRegistro % 2 === 1) pagina.drawRectangle({
          x: margem, y: y - altura, width: largura, height: altura, color: CORES.superficie,
        });
        let x = margem;
        colunas.forEach((coluna, indiceColuna) => {
          const segmento = celulas[indiceColuna].slice(inicio, inicio + quantidade);
          segmento.forEach((valor, indiceLinha) => {
            const posicao = coluna.direita ? x + coluna.largura - 8 - fonte.widthOfTextAtSize(valor, 8.5) : x + 8;
            escrever(valor, posicao, y - 15 - indiceLinha * 13, 8.5);
          });
          x += coluna.largura;
          if (indiceColuna < colunas.length - 1) pagina.drawLine({
            start: { x, y }, end: { x, y: y - altura }, thickness: 0.4, color: CORES.borda,
          });
        });
        y -= altura; linhaHorizontal(y); inicio += quantidade;
        if (inicio < totalLinhas) { novaPagina(); cabecalho(true); }
      }
    });
    y -= 18;
  };
  tabela("Equipes e períodos", [
    { titulo: "Programação", largura: 100 }, { titulo: "Equipe", largura: 155.28 },
    { titulo: "Início", largura: 110 }, { titulo: "Término inclusivo", largura: 130 },
  ], dados.programacoes.map(p => [`Programação #${p.id}`, texto(p.nomeEquipe), texto(p.dataInicio), texto(p.dataFim)]), "Equipe e período: Não informado");
  tabela("Kit de materiais", [
    { titulo: "Item", largura: 48 }, { titulo: "Descrição técnica", largura: 279.28 },
    { titulo: "Quantidade", largura: 92, direita: true }, { titulo: "Unidade", largura: 76 },
  ], dados.materiais.map(m => [`#${m.id}`, texto(m.nome), String(m.quantidade ?? "Não informado"), texto(m.unidade)]), "Materiais: Não informado");

  const faltantes = avaliarCompletudeInstalacao(dados);
  if (faltantes.length) caixa("Dados não informados ou inválidos",
    faltantes.flatMap(faltante => linhas(descreverFaltanteInstalacao(faltante), 9, largura - 24)),
    CORES.alertaFundo, CORES.alertaBorda, CORES.alerta);

  const paginas = pdf.getPages();
  paginas.forEach((folha, indice) => {
    folha.drawLine({ start: { x: margem, y: 64 }, end: { x: margem + largura, y: 64 }, thickness: 0.5, color: CORES.borda });
    folha.drawText("ZL Engenharia • Sistema de Gestão de Obras", { x: margem, y: 52, size: 7.5, font: fonte, color: CORES.secundario });
    const rotulo = `Página ${indice + 1} de ${paginas.length}`;
    folha.drawText(rotulo, { x: margem + largura - fonte.widthOfTextAtSize(rotulo, 7.5), y: 52, size: 7.5, font: fonte, color: CORES.secundario });
  });
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}
