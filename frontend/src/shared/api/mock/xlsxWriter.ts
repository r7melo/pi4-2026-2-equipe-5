import { zipSync, strToU8 } from "fflate";
import type { DadosInstalacao } from "@/types";
import { avaliarCompletudeInstalacao, descreverFaltanteInstalacao, normalizarTextoInstalacao } from "@/shared/lib/instalacao";

export function gerarXlsxInstalacao(dados: DadosInstalacao): Blob {
  const xml = (valor: string) => Array.from(valor).filter((c) => {
    const codigo = c.codePointAt(0) ?? 0;
    return codigo === 9 || codigo === 10 || codigo === 13 ||
      (codigo >= 32 && codigo <= 0xd7ff) || (codigo >= 0xe000 && codigo <= 0xfffd) || codigo >= 0x10000;
  }).join("")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const texto = (valor?: string | null) => normalizarTextoInstalacao(valor) ?? "Não informado";
  const planilha = (linhas: (string | number)[][]) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${linhas.map((linha, r) =>
    `<row r="${r + 1}">${linha.map((valor, c) => {
      const ref = `${String.fromCharCode(65 + c)}${r + 1}`;
      return typeof valor === "number" ? `<c r="${ref}"><v>${valor}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(valor)}</t></is></c>`;
    }).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const nomes = ["Instalação", "Materiais", "Programações"];
  const folhas = [
    planilha([
      ["Dossiê de instalação solar - ZL Engenharia"],
      ["Obra", dados.obraId, texto(dados.tituloObra)], ["Cliente", texto(dados.clienteNome)],
      ["Endereço", texto(dados.endereco)], ["Observações técnicas", texto(dados.observacoesTecnicas)],
      ...avaliarCompletudeInstalacao(dados).map((f) => ["Dados não informados ou inválidos", descreverFaltanteInstalacao(f)]),
    ]),
    planilha([
      ["Identificação", "Material", "Quantidade", "Unidade"],
      ...dados.materiais.map((m) => [m.id, texto(m.nome), m.quantidade ?? "Não informado", texto(m.unidade)]),
      ...(dados.materiais.length ? [] : [["Não informado"]]),
    ]),
    planilha([
      ["Programação", "Equipe", "Início", "Término inclusivo"],
      ...dados.programacoes.map((p) => [p.id, texto(p.nomeEquipe), texto(p.dataInicio), texto(p.dataFim)]),
      ...(dados.programacoes.length ? [] : [["Não informado"]]),
    ]),
  ];
  const partes: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${folhas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`),
    "_rels/.rels": strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nomes.map((nome, i) => `<sheet name="${nome}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${folhas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`),
  };
  folhas.forEach((folha, i) => { partes[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(folha); });
  const bytes = zipSync(partes);
  return new Blob([new Uint8Array(bytes)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
