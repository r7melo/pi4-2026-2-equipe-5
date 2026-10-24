import type { ObraCard, RelatorioCusto } from "@/types";
import { formatarMoeda } from "./formatacaoFinanceira";

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
