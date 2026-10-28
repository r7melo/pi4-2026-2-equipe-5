import { zipSync, strToU8 } from "fflate";
import type { ObraCard, RelatorioCusto } from "@/types";
function xml(texto: string): string { return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
export function gerarExcelRelatorio(obras: ObraCard[], relatorios: Record<number, RelatorioCusto>, obraFiltroId?: number | null): Blob {
  const alvo = obraFiltroId ? obras.filter(o => o.id === obraFiltroId) : obras;
  const linhas: (string | number)[][] = [["Obra", "Cliente", "Status", "Painéis", "Receita", "Custo", "Resultado", "Apuração"]];
  let receita = 0, custo = 0, precificadas = 0;
  for (const obra of alvo) {
    const rel = relatorios[obra.id];
    linhas.push([obra.id, obra.clienteNome, obra.status, obra.quantidadePaineis, rel?.receita ?? "Não informado", rel?.custoTotal ?? "Não informado", rel?.lucro ?? "Não informado", rel ? "Precificada" : "Sem dados financeiros"]);
    if (rel) { receita += rel.receita; custo += rel.custoTotal; precificadas++; }
  }
  linhas.push(["Totais das obras precificadas", `${precificadas} de ${alvo.length}`, "", "", precificadas ? receita : "Não informado", precificadas ? custo : "Não informado", precificadas ? receita - custo : "Não informado"]);
  linhas.push([], ["Itens de custo", "Obra", "Descrição", "Valor"]);
  alvo.forEach(o => relatorios[o.id]?.itens.forEach(item => linhas.push(["Item", o.id, item.descricao, item.valor])));
  const sheet = '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' + linhas.map((linha, indice) => '<row r="' + (indice + 1) + '">' + linha.map((valor, coluna) => {
    const ref = String.fromCharCode(65 + coluna) + (indice + 1);
    return typeof valor === "number" ? `<c r="${ref}"><v>${valor}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(valor)}</t></is></c>`;
  }).join('') + '</row>').join('') + '</sheetData></worksheet>';
  const arquivos = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Financeiro" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sheet,
  };
  const dados = zipSync(Object.fromEntries(Object.entries(arquivos).map(([nome, texto]) => [nome, strToU8(texto)])));
  return new Blob([new Uint8Array(dados)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
