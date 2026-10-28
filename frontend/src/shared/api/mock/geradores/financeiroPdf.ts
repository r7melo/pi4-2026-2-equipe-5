import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fonteUrl from "dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url";
import type { ObraCard, RelatorioCusto } from "@/types";
import { formatarMoeda } from "./formatacaoFinanceira";

export async function gerarPdfRelatorio(obras: ObraCard[], relatorios: Record<number, RelatorioCusto>, obraFiltroId?: number | null): Promise<Blob> {
  const alvo = obraFiltroId ? obras.filter(o => o.id === obraFiltroId) : obras;
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const resposta = await fetch(fonteUrl);
  if (!resposta.ok) throw new Error("Fonte indisponível.");
  const fonte = await pdf.embedFont(await resposta.arrayBuffer(), { subset: true });
  const caracteres = new Set(fonte.getCharacterSet());
  let pagina = pdf.addPage([595.28, 841.89]), y = 790;
  function escrever(valor: string, tamanho = 9): void {
    const texto = valor.replace(/\s+/g, " ").normalize("NFC");
    if (Array.from(texto).some(c => !caracteres.has(c.codePointAt(0) ?? 0))) throw new Error("Texto sem representação na fonte.");
    let linha = "";
    function imprimir() {
      if (y < 55) { pagina = pdf.addPage([595.28, 841.89]); y = 790; }
      pagina.drawText(linha.trim(), { x: 45, y, size: tamanho, font: fonte });
      y -= tamanho + 5; linha = "";
    }
    for (const c of texto) { if (fonte.widthOfTextAtSize(linha + c, tamanho) > 505) imprimir(); linha += c; }
    if (linha) imprimir();
  }
  escrever("Relatório financeiro — ZL Engenharia", 13);
  escrever(`Demonstração fictícia. Emissão: ${new Date().toLocaleDateString("pt-BR")}. ${alvo.length} obras no recorte.`);
  let receita = 0, custo = 0, precificadas = 0;
  for (const obra of alvo) {
    escrever(`#${obra.id} — ${obra.clienteNome} — ${obra.status}`, 10);
    escrever(`${obra.quantidadePaineis} painéis; término: ${obra.dataFimReal || obra.dataFimEstimada}.`);
    const rel = relatorios[obra.id];
    if (!rel) { escrever("Sem dados financeiros apurados."); continue; }
    receita += rel.receita; custo += rel.custoTotal; precificadas++;
    escrever(`Receita: ${formatarMoeda(rel.receita)}; custo: ${formatarMoeda(rel.custoTotal)}; resultado: ${formatarMoeda(rel.lucro)}.`);
    rel.itens.forEach(item => escrever(`${item.descricao}: ${formatarMoeda(item.valor)}`));
  }
  escrever(`Totais das obras precificadas: ${precificadas} de ${alvo.length}.`, 11);
  if (precificadas) escrever(`Receita: ${formatarMoeda(receita)}; custo: ${formatarMoeda(custo)}; resultado: ${formatarMoeda(receita - custo)}.`);
  else escrever("Nenhuma obra com dados financeiros apurados no recorte.");
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}
