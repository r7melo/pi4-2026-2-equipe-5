import { CORES_EXPORTACAO, FONTES_EXPORTACAO } from '@/shared/lib/exportacao/identidade';
import { corArgb, codificarTextoXlsx, empacotarXlsx } from '@/shared/lib/exportacao/xlsx';
import type { DadosInstalacao } from "@/types";
import { avaliarCompletudeInstalacao, descreverFaltanteInstalacao, normalizarTextoInstalacao } from "@/shared/lib/instalacao";

// Catálogo de estilos OpenXML (SpreadsheetML) alinhado à paleta institucional da ZL Engenharia
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="5">
    <font><sz val="11"/><color rgb="${corArgb(CORES_EXPORTACAO.texto)}"/><name val="${FONTES_EXPORTACAO.planilha}"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="${corArgb(CORES_EXPORTACAO.branco)}"/><name val="${FONTES_EXPORTACAO.planilha}"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="${corArgb(CORES_EXPORTACAO.texto)}"/><name val="${FONTES_EXPORTACAO.planilha}"/><family val="2"/></font>
    <font><b/><sz val="14"/><color rgb="${corArgb(CORES_EXPORTACAO.branco)}"/><name val="${FONTES_EXPORTACAO.planilha}"/><family val="2"/></font>
    <font><b/><sz val="10"/><color rgb="${corArgb(CORES_EXPORTACAO.alerta)}"/><name val="${FONTES_EXPORTACAO.planilha}"/><family val="2"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${corArgb(CORES_EXPORTACAO.institucional)}"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${corArgb(CORES_EXPORTACAO.superficie)}"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${corArgb(CORES_EXPORTACAO.cabecalho)}"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="${corArgb(CORES_EXPORTACAO.alertaFundo)}"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.borda)}"/></left>
      <right style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.borda)}"/></right>
      <top style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.borda)}"/></top>
      <bottom style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.borda)}"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.alertaBorda)}"/></left>
      <right style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.alertaBorda)}"/></right>
      <top style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.alertaBorda)}"/></top>
      <bottom style="thin"><color rgb="${corArgb(CORES_EXPORTACAO.alertaBorda)}"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="13">
    <!-- 0: Normal Esquerda -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
    <!-- 1: Cabeçalho Centro (Azul Marinho, Negrito Branco) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="top" wrapText="1"/>
    </xf>
    <!-- 2: Cabeçalho Esquerda (Azul Marinho, Negrito Branco) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
    <!-- 3: Zebrado Esquerda (Slate 50) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
    <!-- 4: Zebrado Centro (Slate 50) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="top" wrapText="1"/>
    </xf>
    <!-- 5: Zebrado Direita (Slate 50) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="top"/>
    </xf>
    <!-- 6: Normal Centro -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="top" wrapText="1"/>
    </xf>
    <!-- 7: Normal Direita -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="right" vertical="top"/>
    </xf>
    <!-- 8: Rótulo da Ficha Técnica (Slate 100, Negrito) -->
    <xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
    <!-- 9: Banner de Título Geral (Azul Marinho, 14pt Negrito Branco) -->
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
    <!-- 10: Rótulo de Alerta Operacional (Fundo Âmbar, Texto Âmbar Negrito) -->
    <xf numFmtId="0" fontId="4" fillId="5" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
    <!-- 11: Descrição do Alerta (Fundo Âmbar, Texto Normal) -->
    <xf numFmtId="0" fontId="0" fillId="5" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
    <!-- 12: Normal Esquerda com Quebra de Linha (wrapText) -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
</styleSheet>`;

interface CelulaXlsx {
  v: string | number;
  s?: number;
}

interface ConfiguracaoPlanilha {
  nome: string;
  larguras: number[];
  congelar?: boolean;
  filtro?: string;
  mesclas?: string[];
  linhas: CelulaXlsx[][];
}

// A altura de exibição do Excel é limitada. Os valores originais ficam nas
// células contratuais; a leitura completa dos textos extensos fica na ficha.
function linhasVisuais(valor: string, largura: number): string[] {
  const linhas: string[] = [];
  let linha = "", unidades = 0;
  const caracteres = Array.from(valor);
  for (let indice = 0; indice < caracteres.length; indice++) {
    let caractere = caracteres[indice];
    if (caractere === "\r" || caractere === "\n") {
      if (caractere === "\r" && caracteres[indice + 1] === "\n") {
        caractere += "\n"; indice++;
      }
      linhas.push(linha + caractere); linha = ""; unidades = 0; continue;
    }
    const codigo = caractere.codePointAt(0) ?? 0;
    const peso = caractere === "\t" ? 4 : codigo >= 0x2e80 ? 2 : /[WM@#%]/.test(caractere) ? 1.6 : 1;
    if (unidades + peso > Math.max(8, largura - 4) && linha) {
      linhas.push(linha); linha = ""; unidades = 0;
    }
    linha += caractere; unidades += peso;
  }
  if (linha || linhas.length === 0) linhas.push(linha);
  return linhas;
}

export function gerarXlsxInstalacao(dados: DadosInstalacao): Blob {
  const limpar = (valor: string) => Array.from(valor).filter((c) => {
    const codigo = c.codePointAt(0) ?? 0;
    return codigo === 9 || codigo === 10 || codigo === 13 ||
      (codigo >= 32 && codigo <= 0xd7ff) || (codigo >= 0xe000 && codigo <= 0xfffd) || codigo >= 0x10000;
  }).join("");
  const xml = (valor: string | number) => codificarTextoXlsx(limpar(String(valor)));
  const texto = (valor?: string | null) => limpar(normalizarTextoInstalacao(valor) ?? "Não informado");
  const c = (v: string | number, s = 0): CelulaXlsx => ({ v, s });
  const pendencias = avaliarCompletudeInstalacao(dados);
  const grupos: Record<string, string> = { materiais: "Materiais", endereco: "Endereço", observacoes: "Observações", equipes: "Equipe", periodos: "Período" };

  const instalacao: ConfiguracaoPlanilha = {
    nome: "Instalação", larguras: [28, 75], mesclas: ["A1:B1"], linhas: [
      [c("Dossiê de instalação solar - ZL Engenharia", 9)],
      [c("Obra", 8), c(texto(dados.tituloObra))],
      [c("Cliente", 8), c(texto(dados.clienteNome))],
      [c("Endereço", 8), c(texto(dados.endereco))],
      [c("Observações técnicas", 8), c(texto(dados.observacoesTecnicas), 12)],
    ],
  };
  if (pendencias.length) {
    instalacao.mesclas!.push("A6:B6");
    instalacao.linhas.push([c("⚠️ PENDÊNCIAS OPERACIONAIS (EXPORTAÇÃO PARCIAL)", 10)]);
    for (const p of pendencias) {
      const complemento = p.programacaoId === undefined ? "" : ` #${p.programacaoId}`;
      instalacao.linhas.push([c(`Alerta • ${grupos[p.grupo]}${complemento}`, 10), c(descreverFaltanteInstalacao(p), 11)]);
    }
  }
  const materiais: ConfiguracaoPlanilha = {
    nome: "Materiais", larguras: [16, 45, 16, 14], congelar: true,
    filtro: `A1:D${Math.max(1, dados.materiais.length + 1)}`,
    linhas: [
      [c("Identificação", 1), c("Material", 2), c("Quantidade", 1), c("Unidade", 1)],
      ...dados.materiais.map((m, i) => {
        const z = i % 2 === 1;
        return [c(m.id, z ? 4 : 6), c(texto(m.nome), z ? 3 : 0),
          c(m.quantidade ?? "Não informado", typeof m.quantidade === "number" ? (z ? 5 : 7) : (z ? 4 : 6)), c(texto(m.unidade), z ? 4 : 6)];
      }),
      ...(dados.materiais.length ? [] : [[c("Não informado")]]),
    ],
  };
  const programacoes: ConfiguracaoPlanilha = {
    nome: "Programações", larguras: [18, 34, 18, 22], congelar: true,
    filtro: `A1:D${Math.max(1, dados.programacoes.length + 1)}`,
    linhas: [
      [c("Programação", 1), c("Equipe", 2), c("Início", 1), c("Término inclusivo", 1)],
      ...dados.programacoes.map((p, i) => {
        const z = i % 2 === 1;
        return [c(p.id, z ? 4 : 6), c(texto(p.nomeEquipe), z ? 3 : 0), c(texto(p.dataInicio), z ? 4 : 6), c(texto(p.dataFim), z ? 4 : 6)];
      }),
      ...(dados.programacoes.length ? [] : [[c("Não informado")]]),
    ],
  };
  const planilhas = [instalacao, materiais, programacoes];
  const extensos: { origem: string; partes: string[] }[] = [];
  for (const p of planilhas) {
    p.linhas.forEach((linha, r) => linha.forEach((celula, coluna) => {
      if (typeof celula.v !== "string") {
        if (!Number.isFinite(celula.v)) throw new Error("Não foi possível gerar a planilha: valor numérico inválido.");
        return;
      }
      if (celula.v.length > 32767 || (celula.v.match(/\r\n|\r|\n/g)?.length ?? 0) > 253) {
        throw new Error("Texto excede o limite de uma célula do Excel. Reduza o conteúdo para exportar a planilha.");
      }
      // Banners mesclados usam a soma das larguras, não apenas a coluna A.
      const mesclado = p.mesclas?.includes(`A${r + 1}:B${r + 1}`) && coluna === 0;
      const largura = mesclado ? p.larguras.reduce((s, v) => s + v, 0) : p.larguras[coluna];
      if (linhasVisuais(celula.v, largura).length <= 20) return;
      const linhas = linhasVisuais(celula.v, 75), partes: string[] = [];
      for (let i = 0; i < linhas.length; i += 16) partes.push(linhas.slice(i, i + 16).join(""));
      extensos.push({ origem: `${p.nome}!${String.fromCharCode(65 + coluna)}${r + 1}`, partes });
    }));
  }
  if (extensos.length) {
    instalacao.linhas.push([c("Leitura completa", 8), c("Textos que excedem a altura de exibição estão reproduzidos abaixo. Os valores originais permanecem nas células indicadas.")]);
    const linha = instalacao.linhas.length + 1;
    instalacao.mesclas!.push(`A${linha}:B${linha}`);
    instalacao.linhas.push([c("Textos extensos — leitura completa", 2)]);
    for (const item of extensos) {
      item.partes.forEach((parte, i) => instalacao.linhas.push([c(`${item.origem} • ${i + 1}/${item.partes.length}`, 8), c(parte, 12)]));
    }
  }

  const montarPlanilha = (p: ConfiguracaoPlanilha) => {
    const linhas = p.linhas.map((linha, r) => {
      let quantidadeLinhas = 1;
      const celulas = linha.map((celula, coluna) => {
        const ref = `${String.fromCharCode(65 + coluna)}${r + 1}`;
        const s = ` s="${celula.s ?? 0}"`;
        const mesclado = coluna === 0 && p.mesclas?.includes(`A${r + 1}:B${r + 1}`);
        const largura = mesclado ? p.larguras.reduce((soma, valor) => soma + valor, 0) : p.larguras[coluna];
        quantidadeLinhas = Math.max(quantidadeLinhas, linhasVisuais(String(celula.v), largura).length);
        if (typeof celula.v === "number") return `<c r="${ref}"${s}><v>${celula.v}</v></c>`;
        return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xml(celula.v)}</t></is></c>`;
      }).join("");
      const altura = Math.min(396, Math.max(r === 0 ? 36 : 28, quantidadeLinhas * 18 + 10));
      return `<row r="${r + 1}" ht="${altura}" customHeight="1">${celulas}</row>`;
    }).join("");
    const views = p.congelar ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/>' : '';
    const mesclas = p.mesclas?.length ? `<mergeCells count="${p.mesclas.length}">${p.mesclas.map(ref => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0">${views}</sheetView></sheetViews>
  <cols>${p.larguras.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>
  <sheetData>${linhas}</sheetData>
  ${p.filtro ? `<autoFilter ref="${p.filtro}"/>` : ''}
  ${mesclas}
</worksheet>`;
  };
  const folhas = planilhas.map(montarPlanilha);
  const partes: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${folhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    "_rels/.rels": '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${planilhas.map((p, i) => `<sheet name="${p.nome}" sheetId="${i + 1}" r:id="rId${i + 1}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>`).join("")}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${folhas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": STYLES_XML,
  };
  folhas.forEach((folha, i) => { partes[`xl/worksheets/sheet${i + 1}.xml`] = folha; });
  return empacotarXlsx(partes);
}
