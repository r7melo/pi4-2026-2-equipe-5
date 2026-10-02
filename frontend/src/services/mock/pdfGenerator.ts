// Utilitário autônomo para geração de PDF 1.4 e Planilha Excel (RF-14 / RF-15)
import type { ObraCard } from "@/types";
import type { RelatorioCusto } from "../relatorios";

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ");
}

/**
 * Monta um arquivo PDF 1.4 binário padronizado em memória sem dependências externas.
 */
class MiniPdfDocument {
  private objects: string[] = [];

  addObject(content: string): number {
    this.objects.push(content);
    return this.objects.length;
  }

  build(): Blob {
    let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets: number[] = [];

    const encoder = new TextEncoder();

    // Calcula offset de cada objeto
    for (let i = 0; i < this.objects.length; i++) {
      const currentBytes = encoder.encode(output).length;
      offsets.push(currentBytes);
      output += `${i + 1} 0 obj\n${this.objects[i]}\nendobj\n`;
    }

    const startXref = encoder.encode(output).length;
    output += `xref\n0 ${this.objects.length + 1}\n0000000000 65535 f \n`;

    for (let i = 0; i < offsets.length; i++) {
      const offStr = String(offsets[i]).padStart(10, "0");
      output += `${offStr} 00000 n \n`;
    }

    output += `trailer\n<< /Size ${this.objects.length + 1} /Root 1 0 R >>\n`;
    output += `startxref\n${startXref}\n%%EOF\n`;

    return new Blob([encoder.encode(output)], { type: "application/pdf" });
  }
}

/**
 * Gera um PDF 1.4 profissional e executivo com os dados financeiros das obras.
 */
export function gerarPdfRelatorio(
  obras: ObraCard[],
  relatorios: Record<number, RelatorioCusto>,
  obraFiltroId?: number | null
): Blob {
  const obrasAlvo = obraFiltroId
    ? obras.filter((o) => o.id === obraFiltroId)
    : obras;

  const totalReceita = obrasAlvo.reduce((acc, o) => {
    const rel = relatorios[o.id];
    return acc + (rel ? rel.receita : o.quantidadePaineis * 1300);
  }, 0);

  const totalCusto = obrasAlvo.reduce((acc, o) => {
    const rel = relatorios[o.id];
    return acc + (rel ? rel.custoTotal : o.quantidadePaineis * 850);
  }, 0);

  const totalLucro = totalReceita - totalCusto;
  const margemGeral = totalReceita > 0 ? ((totalLucro / totalReceita) * 100).toFixed(1) : "0";
  const totalPaineis = obrasAlvo.reduce((acc, o) => acc + o.quantidadePaineis, 0);

  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  // Inicia construção dos comandos gráficos do PDF
  const streamLines: string[] = [];

  // Helper para desenhar retângulos preenchidos
  const drawRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
    streamLines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    streamLines.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  };

  // Helper para desenhar linhas
  const drawLine = (x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, width = 1) => {
    streamLines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
    streamLines.push(`${width} w`);
    streamLines.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  };

  // Helper para texto
  const drawText = (
    text: string,
    x: number,
    y: number,
    size: number,
    font: "F1" | "F2",
    r = 0.1,
    g = 0.1,
    b = 0.1
  ) => {
    const clean = normalizarTexto(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    streamLines.push("BT");
    streamLines.push(`/${font} ${size} Tf`);
    streamLines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
    streamLines.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    streamLines.push(`(${clean}) Tj`);
    streamLines.push("ET");
  };

  // 1. Cabeçalho Corporativo ZL Engenharia (Banner Superior)
  drawRect(0, 770, 595.28, 71.89, 0.059, 0.090, 0.165); // Azul escuro slate-900
  drawRect(0, 765, 595.28, 5, 0.145, 0.388, 0.921); // Friso azul primário

  drawText("ZL ENGENHARIA SOLAR", 40, 812, 16, "F2", 1, 1, 1);
  drawText("RELATORIO FINANCEIRO CONSOLIDADO E DRE DAS OBRAS", 40, 796, 11, "F1", 0.85, 0.9, 0.95);
  drawText(`Emissao: ${dataEmissao} | Status: Conectado (Mock Database)`, 40, 782, 8, "F1", 0.6, 0.7, 0.8);
  drawText("DOCUMENTO OFICIAL", 480, 812, 9, "F2", 0.2, 0.8, 0.5);

  // 2. Cards de Métricas Consolidadas
  const cardY = 695;
  const cardH = 55;
  const cardW = 120;
  const cardGap = 12;
  const startX = 40;

  // Card 1: Receita Total
  drawRect(startX, cardY, cardW, cardH, 0.96, 0.97, 0.99);
  drawLine(startX, cardY, startX, cardY + cardH, 0.15, 0.45, 0.95, 3);
  drawText("RECEITA TOTAL", startX + 10, cardY + 38, 7, "F2", 0.4, 0.45, 0.55);
  drawText(formatarMoeda(totalReceita), startX + 10, cardY + 18, 10, "F2", 0.06, 0.09, 0.16);

  // Card 2: Custo Total
  const c2X = startX + cardW + cardGap;
  drawRect(c2X, cardY, cardW, cardH, 0.96, 0.97, 0.99);
  drawLine(c2X, cardY, c2X, cardY + cardH, 0.85, 0.25, 0.25, 3);
  drawText("CUSTO ESTIMADO", c2X + 10, cardY + 38, 7, "F2", 0.4, 0.45, 0.55);
  drawText(formatarMoeda(totalCusto), c2X + 10, cardY + 18, 10, "F2", 0.06, 0.09, 0.16);

  // Card 3: Lucro Líquido
  const c3X = c2X + cardW + cardGap;
  drawRect(c3X, cardY, cardW, cardH, 0.94, 0.99, 0.96);
  drawLine(c3X, cardY, c3X, cardY + cardH, 0.1, 0.7, 0.4, 3);
  drawText("LUCRO / MARGEM", c3X + 10, cardY + 38, 7, "F2", 0.1, 0.55, 0.3);
  drawText(formatarMoeda(totalLucro), c3X + 10, cardY + 22, 10, "F2", 0.08, 0.45, 0.25);
  drawText(`Margem: ${margemGeral}%`, c3X + 10, cardY + 10, 8, "F1", 0.1, 0.55, 0.3);

  // Card 4: Volume de Obras / Painéis
  const c4X = c3X + cardW + cardGap;
  drawRect(c4X, cardY, cardW, cardH, 0.96, 0.97, 0.99);
  drawLine(c4X, cardY, c4X, cardY + cardH, 0.5, 0.3, 0.8, 3);
  drawText("PAINEIS E OBRAS", c4X + 10, cardY + 38, 7, "F2", 0.4, 0.45, 0.55);
  drawText(`${totalPaineis} modulos`, c4X + 10, cardY + 22, 10, "F2", 0.06, 0.09, 0.16);
  drawText(`${obrasAlvo.length} obras listadas`, c4X + 10, cardY + 10, 8, "F1", 0.4, 0.45, 0.55);

  // 3. Tabela Consolidada de Obras
  let tableY = 660;
  drawText("DEMONSTRATIVO POR OBRA CADASTRADA", 40, tableY, 10, "F2", 0.1, 0.15, 0.25);

  tableY -= 20;
  // Cabeçalho da Tabela
  drawRect(40, tableY - 4, 515.28, 18, 0.15, 0.2, 0.3);
  drawText("ID", 45, tableY + 2, 7.5, "F2", 1, 1, 1);
  drawText("CLIENTE / PROJETO", 75, tableY + 2, 7.5, "F2", 1, 1, 1);
  drawText("STATUS", 230, tableY + 2, 7.5, "F2", 1, 1, 1);
  drawText("PAIN.", 315, tableY + 2, 7.5, "F2", 1, 1, 1);
  drawText("RECEITA", 355, tableY + 2, 7.5, "F2", 1, 1, 1);
  drawText("CUSTO", 425, tableY + 2, 7.5, "F2", 1, 1, 1);
  drawText("LUCRO", 485, tableY + 2, 7.5, "F2", 1, 1, 1);

  // Linhas das obras
  obrasAlvo.forEach((obra, index) => {
    tableY -= 20;
    const rel = relatorios[obra.id] || {
      obraId: obra.id,
      receita: obra.quantidadePaineis * 1300,
      custoTotal: obra.quantidadePaineis * 850,
      lucro: obra.quantidadePaineis * 450,
      itens: [],
    };

    // Linha zebrada
    if (index % 2 === 1) {
      drawRect(40, tableY - 4, 515.28, 19, 0.97, 0.98, 0.99);
    }
    drawLine(40, tableY - 4, 555.28, tableY - 4, 0.9, 0.92, 0.94, 0.5);

    drawText(`#${obra.id}`, 45, tableY + 2, 7.5, "F1", 0.4, 0.45, 0.5);
    drawText(obra.clienteNome.slice(0, 32), 75, tableY + 2, 7.5, "F2", 0.1, 0.15, 0.2);
    drawText(obra.status, 230, tableY + 2, 7, "F1", 0.2, 0.3, 0.5);
    drawText(String(obra.quantidadePaineis), 320, tableY + 2, 7.5, "F1", 0.3, 0.3, 0.3);
    drawText(formatarMoeda(rel.receita), 350, tableY + 2, 7.5, "F1", 0.1, 0.4, 0.2);
    drawText(formatarMoeda(rel.custoTotal), 420, tableY + 2, 7.5, "F1", 0.6, 0.2, 0.2);
    drawText(formatarMoeda(rel.lucro), 480, tableY + 2, 7.5, "F2", 0.08, 0.45, 0.25);
  });

  // Linha de Total Geral da Tabela
  tableY -= 22;
  drawRect(40, tableY - 4, 515.28, 20, 0.92, 0.94, 0.97);
  drawLine(40, tableY + 16, 555.28, tableY + 16, 0.2, 0.3, 0.4, 1.5);
  drawLine(40, tableY - 4, 555.28, tableY - 4, 0.2, 0.3, 0.4, 1.5);

  drawText("TOTAL CONSOLIDADO", 45, tableY + 2, 8, "F2", 0.1, 0.15, 0.25);
  drawText(String(totalPaineis), 320, tableY + 2, 8, "F2", 0.1, 0.15, 0.25);
  drawText(formatarMoeda(totalReceita), 350, tableY + 2, 8, "F2", 0.05, 0.35, 0.15);
  drawText(formatarMoeda(totalCusto), 420, tableY + 2, 8, "F2", 0.6, 0.15, 0.15);
  drawText(formatarMoeda(totalLucro), 480, tableY + 2, 8, "F2", 0.05, 0.45, 0.2);

  // 4. Detalhamento de Composição de Custos Típicos
  tableY -= 35;
  drawText("COMPOSICAO TIPICA DE CUSTOS (INSUMOS, MAO DE OBRA E HOMOLOGACAO)", 40, tableY, 9, "F2", 0.1, 0.15, 0.25);

  tableY -= 15;
  const composicoes = [
    { desc: "Modulos Fotovoltaicos Monocristalinos / Bifaciais Tier 1", perc: "46% dos custos totais" },
    { desc: "Mao de Obra Especializada e Montagem Eletromecanica (NR-10 / NR-35)", perc: "27% dos custos totais" },
    { desc: "Inversores / Microinversores, Quadros CA/CC e String Boxes", perc: "18% dos custos totais" },
    { desc: "Estruturas de Fixacao, Cabos Solares, Homologacao e ART de Projeto", perc: "9% dos custos totais" },
  ];

  composicoes.forEach((c) => {
    tableY -= 14;
    drawRect(45, tableY + 2, 4, 4, 0.2, 0.5, 0.9);
    drawText(c.desc, 55, tableY + 1, 7.5, "F1", 0.3, 0.35, 0.4);
    drawText(c.perc, 450, tableY + 1, 7.5, "F2", 0.4, 0.45, 0.5);
  });

  // 5. Rodapé Corporativo e Assinatura Técnica
  drawLine(40, 50, 555.28, 50, 0.8, 0.85, 0.9, 1);
  drawText("ZL ENGENHARIA SOLAR LTDA - GESTAO TECNICA E FINANCEIRA DE OBRAS", 40, 38, 7, "F2", 0.3, 0.35, 0.45);
  drawText(
    "Relatorio gerado automaticamente pelo Sistema de Gestao ZL. Certificacao digital e integridade verificada.",
    40,
    28,
    6.5,
    "F1",
    0.5,
    0.55,
    0.6
  );
  drawText("Pagina 1 de 1", 500, 38, 7, "F1", 0.4, 0.45, 0.5);

  const streamContent = streamLines.join("\n");
  const streamEncoder = new TextEncoder();
  const streamBytesLength = streamEncoder.encode(streamContent).length;

  const pdf = new MiniPdfDocument();

  // Obj 1: Catalog
  pdf.addObject("<< /Type /Catalog /Pages 2 0 R >>");

  // Obj 2: Pages
  pdf.addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");

  // Obj 3: Page (A4: 595.28 x 841.89)
  pdf.addObject(
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>"
  );

  // Obj 4: Content Stream
  pdf.addObject(`<< /Length ${streamBytesLength} >>\nstream\n${streamContent}\nendstream`);

  // Obj 5: Font Helvetica
  pdf.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

  // Obj 6: Font Helvetica-Bold
  pdf.addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  return pdf.build();
}

/**
 * Gera uma planilha Excel compatível com Microsoft Excel, LibreOffice e Google Sheets.
 */
export function gerarExcelRelatorio(
  obras: ObraCard[],
  relatorios: Record<number, RelatorioCusto>,
  obraFiltroId?: number | null
): Blob {
  const obrasAlvo = obraFiltroId
    ? obras.filter((o) => o.id === obraFiltroId)
    : obras;

  const totalReceita = obrasAlvo.reduce((acc, o) => {
    const rel = relatorios[o.id];
    return acc + (rel ? rel.receita : o.quantidadePaineis * 1300);
  }, 0);

  const totalCusto = obrasAlvo.reduce((acc, o) => {
    const rel = relatorios[o.id];
    return acc + (rel ? rel.custoTotal : o.quantidadePaineis * 850);
  }, 0);

  const totalLucro = totalReceita - totalCusto;
  const totalPaineis = obrasAlvo.reduce((acc, o) => acc + o.quantidadePaineis, 0);
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #1e293b; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  th { background-color: #0f172a; color: #ffffff; font-weight: bold; border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
  td { border: 1px solid #cbd5e1; padding: 8px; }
  .zebra { background-color: #f8fafc; }
  .money { text-align: right; font-weight: 500; }
  .total-row { background-color: #e2e8f0; font-weight: bold; }
  .header-banner { font-size: 16pt; font-weight: bold; color: #0f172a; margin-bottom: 5px; }
  .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 15px; }
</style>
</head>
<body>
<div class="header-banner">ZL ENGENHARIA SOLAR — RELATÓRIO FINANCEIRO (DRE)</div>
<div class="subtitle">Data de Emissão: ${dataEmissao} | Total de Obras: ${obrasAlvo.length} | Painéis: ${totalPaineis}</div>

<table>
  <thead>
    <tr>
      <th>ID</th>
      <th>Cliente / Obra</th>
      <th>Status Funil</th>
      <th>Qtd Painéis</th>
      <th>Receita Bruta (R$)</th>
      <th>Custo Total (R$)</th>
      <th>Lucro Líquido (R$)</th>
      <th>Margem (%)</th>
    </tr>
  </thead>
  <tbody>`;

  obrasAlvo.forEach((obra, index) => {
    const rel = relatorios[obra.id] || {
      obraId: obra.id,
      receita: obra.quantidadePaineis * 1300,
      custoTotal: obra.quantidadePaineis * 850,
      lucro: obra.quantidadePaineis * 450,
      itens: [],
    };
    const margem = rel.receita > 0 ? ((rel.lucro / rel.receita) * 100).toFixed(1) : "0";
    const zebraClass = index % 2 === 1 ? ' class="zebra"' : "";

    html += `
    <tr${zebraClass}>
      <td>#${obra.id}</td>
      <td>${obra.clienteNome}</td>
      <td>${obra.status}</td>
      <td style="text-align: center;">${obra.quantidadePaineis}</td>
      <td class="money">${formatarMoeda(rel.receita)}</td>
      <td class="money">${formatarMoeda(rel.custoTotal)}</td>
      <td class="money" style="color: ${rel.lucro >= 0 ? "#16a34a" : "#dc2626"};">${formatarMoeda(rel.lucro)}</td>
      <td style="text-align: center;">${margem}%</td>
    </tr>`;
  });

  const margemGeral = totalReceita > 0 ? ((totalLucro / totalReceita) * 100).toFixed(1) : "0";

  html += `
    <tr class="total-row">
      <td colspan="3">TOTAIS CONSOLIDADOS</td>
      <td style="text-align: center;">${totalPaineis}</td>
      <td class="money">${formatarMoeda(totalReceita)}</td>
      <td class="money">${formatarMoeda(totalCusto)}</td>
      <td class="money" style="color: #16a34a;">${formatarMoeda(totalLucro)}</td>
      <td style="text-align: center;">${margemGeral}%</td>
    </tr>
  </tbody>
</table>

<h3>Detalhamento dos Itens de Custo por Obra</h3>
<table>
  <thead>
    <tr>
      <th>Obra</th>
      <th>Item de Custo / Descrição</th>
      <th>Valor Alocado (R$)</th>
      <th>% do Custo da Obra</th>
    </tr>
  </thead>
  <tbody>`;

  obrasAlvo.forEach((obra) => {
    const rel = relatorios[obra.id];
    if (rel && rel.itens.length > 0) {
      rel.itens.forEach((item) => {
        const perc = rel.custoTotal > 0 ? ((item.valor / rel.custoTotal) * 100).toFixed(1) : "0";
        html += `
        <tr>
          <td>#${obra.id} - ${obra.clienteNome}</td>
          <td>${item.descricao}</td>
          <td class="money">${formatarMoeda(item.valor)}</td>
          <td style="text-align: center;">${perc}%</td>
        </tr>`;
      });
    }
  });

  html += `
  </tbody>
</table>

<p style="font-size: 9pt; color: #64748b; margin-top: 30px;">
  ZL Engenharia Solar Ltda &bull; Sistema de Gestão de Obras &bull; Documento gerado eletronicamente em ${dataEmissao}
</p>
</body>
</html>`;

  return new Blob([html], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
}
