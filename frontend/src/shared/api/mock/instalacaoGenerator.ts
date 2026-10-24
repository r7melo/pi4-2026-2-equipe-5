import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fonteUrl from "dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url";
import type { DadosInstalacao } from "@/types";
import { avaliarCompletudeInstalacao, descreverFaltanteInstalacao, normalizarTextoInstalacao } from "@/shared/lib/instalacao";

let fontePendente: Promise<Uint8Array> | null = null;
function carregarFonte(): Promise<Uint8Array> {
  fontePendente ??= fetch(fonteUrl).then(async (resposta) => {
    if (!resposta.ok) throw new Error("Fonte indisponível");
    return new Uint8Array(await resposta.arrayBuffer());
  }).catch((erro: unknown) => { fontePendente = null; throw erro; });
  return fontePendente;
}

export async function gerarPdfInstalacao(dados: DadosInstalacao): Promise<Blob> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonte = await pdf.embedFont(await carregarFonte(), { subset: true });
  const caracteres = new Set(fonte.getCharacterSet());
  let pagina = pdf.addPage([595.28, 841.89]);
  let y = 790;
  const escrever = (valor: string, tamanho = 9) => {
    const texto = (valor.replace(/\s+/g, " ").trim() || "Não informado").normalize("NFC");
    if (Array.from(texto).some((c) => !caracteres.has(c.codePointAt(0) ?? 0))) {
      throw new Error("Texto sem representação na fonte; não gerar arquivo com dados perdidos");
    }
    let linha = "";
    const imprimir = () => {
      if (y - tamanho < 50) {
        pagina = pdf.addPage([595.28, 841.89]);
        pagina.drawText(`Dossiê de instalação — obra #${dados.obraId} — continuação`, { x: 50, y: 805, size: 9, font: fonte });
        y = 780;
      }
      pagina.drawText(linha.trimEnd(), { x: 50, y, size: tamanho, font: fonte });
      y -= tamanho + 5;
      linha = "";
    };
    for (const caractere of Array.from(texto)) {
      if (fonte.widthOfTextAtSize(linha + caractere, tamanho) > 495) imprimir();
      if (linha || caractere !== " ") linha += caractere;
    }
    if (linha) imprimir();
  };
  const texto = (valor?: string | null) => normalizarTextoInstalacao(valor) ?? "Não informado";
  escrever("Dossiê de instalação solar — ZL Engenharia", 12);
  escrever(`Obra: #${dados.obraId} — ${texto(dados.tituloObra)}`);
  escrever(`Cliente: ${texto(dados.clienteNome)}`);
  escrever(`Endereço: ${texto(dados.endereco)}`);
  escrever("Observações técnicas", 11);
  escrever(texto(dados.observacoesTecnicas));
  escrever("Equipes e períodos", 11);
  if (!dados.programacoes.length) escrever("Equipe e período: Não informado");
  for (const p of dados.programacoes) escrever(`Programação #${p.id}: ${texto(p.nomeEquipe)}; início: ${texto(p.dataInicio)}; término inclusivo: ${texto(p.dataFim)}`);
  escrever("Kit de materiais", 11);
  if (!dados.materiais.length) escrever("Materiais: Não informado");
  for (const m of dados.materiais) escrever(`#${m.id} — ${texto(m.nome)}; quantidade: ${m.quantidade ?? "Não informado"}; unidade: ${texto(m.unidade)}`);
  const faltantes = avaliarCompletudeInstalacao(dados);
  if (faltantes.length) {
    escrever("Dados não informados ou inválidos", 11);
    faltantes.forEach((f) => escrever(descreverFaltanteInstalacao(f)));
  }
  return new Blob([new Uint8Array(await pdf.save())], { type: "application/pdf" });
}
