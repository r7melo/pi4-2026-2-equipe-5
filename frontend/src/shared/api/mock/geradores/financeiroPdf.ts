import { CORES_EXPORTACAO } from '@/shared/lib/exportacao/identidade';
import { corPdf, carregarFontePdf, FonteExportacaoIndisponivel } from '@/shared/lib/exportacao/pdf';
import { PDFDocument, type PDFPage, type PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { ObraFinanceiraEntrada, ApuracaoFinanceiraEntrada, ContextoFinanceiro } from './contratosFinanceiros';
import { prepararFinanceiro, FalhaRelatorioFinanceiro } from './prepararFinanceiro';
const brl = (v: number | null | undefined): string => v == null ? 'Não informado' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (v: string): string => v.split('-').reverse().join('/');
const statuses: Record<string, string> = { Concluido: 'Concluída', EmAndamento: 'Em andamento', NoDeposito: 'No depósito', Recebido: 'Recebida', Agendado: 'Agendada', Assistencia: 'Assistência' };
const navy = CORES_EXPORTACAO.institucional, ink = CORES_EXPORTACAO.texto, muted = CORES_EXPORTACAO.secundario, pale = CORES_EXPORTACAO.cabecalho, zebra = CORES_EXPORTACAO.superficie, border = CORES_EXPORTACAO.borda;
const color = corPdf;
export async function gerarPdfRelatorio(obras: ObraFinanceiraEntrada[], relatorios: Record<number, ApuracaoFinanceiraEntrada>, obraFiltroId?: number | null, contexto: ContextoFinanceiro = {}): Promise<Blob> {
  const d = prepararFinanceiro(obras, relatorios, obraFiltroId, contexto);
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  let fontes: Uint8Array[];
  try { fontes = await Promise.all([carregarFontePdf(), carregarFontePdf('negrito')]); }
  catch (erro: unknown) {
    if (erro instanceof FonteExportacaoIndisponivel) throw new FalhaRelatorioFinanceiro('EXPORT_GENERATION_FAILED', 'Não foi possível carregar a fonte do relatório. Tente novamente.', 500);
    throw erro;
  }
  const regular = await doc.embedFont(fontes[0], { subset: true });
  const bold = await doc.embedFont(fontes[1], { subset: true });
  const caracteres = new Set(regular.getCharacterSet());
  const textos = [d.cliente, ...d.obras.flatMap(o => [o.clienteNome, o.status, ...(o.relatorio?.itens.map(i => i.descricao) ?? [])])];
  if (textos.some(t => Array.from(t.normalize('NFC').replace(/[\r\n\t]/g, ' ')).some(c => !caracteres.has(c.codePointAt(0)!))))
    throw new FalhaRelatorioFinanceiro('EXPORT_TEXT_UNSUPPORTED', 'O texto do recorte contém caracteres sem representação na fonte PDF. Revise os textos.');
  const medidas = new Map<string, number>();
  function medir(texto: string, tamanho: number, fonte: PDFFont): number {
    const chave = `${fonte === bold ? 'b' : 'r'}:${tamanho}:${texto}`;
    let valor = medidas.get(chave);
    if (valor === undefined) { valor = fonte.widthOfTextAtSize(texto, tamanho); if (medidas.size > 50000) medidas.clear(); medidas.set(chave, valor); }
    return valor;
  }
  const width = 841.89, height = 595.28, left = 44, area = width - 88;
  let page: PDFPage, y: number;
  function text(value: string | number, x: number, at: number, size = 9, font: PDFFont = regular, fill: string = ink) { page.drawText(String(value), { x, y: at, size, font, color: color(fill) }); }
  function box(x: number, at: number, w: number, h: number, fill: string) { page.drawRectangle({ x, y: at, width: w, height: h, color: color(fill) }); }
  function next() {
    page = doc.addPage([width, height]);
    text('Relatório financeiro', left, 551, 19, bold, navy);
    text('ZL Engenharia', 704, 552, 10, bold, navy);
    text('Demonstração fictícia • Emissão: ' + d.emissao, left, 530, 8, regular, muted);
    y = 508;
  }
  function wrap(value: string | number, max: number, size = 9, font: PDFFont = regular) {
    const lines: string[] = [];
    for (const paragraph of String(value).normalize('NFC').replace(/\r\n?/g, '\n').split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/u)) {
        const candidate = line ? line + ' ' + word : word;
        if (medir(candidate, size, font) <= max) { line = candidate; continue; }
        if (line) { lines.push(line); line = ''; }
        for (const c of word) {
          if (medir(line + c, size, font) > max && line) { lines.push(line); line = ''; }
          line += c;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  function table(headers: string[], rows: (string | number)[][], widths: number[], aligns: string[], breadcrumb = '', compact = false) {
    const header = () => {
      const hh = compact ? 23 : 25; box(left, y - hh, area, hh, navy); let x = left;
      headers.forEach((h, i) => { text(h, x + 8, y - 16, 8.5, bold, CORES_EXPORTACAO.branco); x += widths[i]; }); y -= compact ? 23 : 25;
    };
    const continuation = () => { next(); if (breadcrumb) { for (const line of wrap(breadcrumb, area, 10, bold)) { text(line, left, y, 10, bold, navy); y -= 14; } y -= 8; } header(); };
    if (y < 135) next(); header();
    rows.forEach((row, index) => {
      const lines = row.map((v, i) => wrap(v, widths[i] - 16));
      const count = Math.max(...lines.map(l => l.length)); let offset = 0;
      while (offset < count) {
        if (y < 119) continuation();
        const available = Math.max(1, Math.floor((y - 90 - (compact ? 12 : 14)) / 13));
        const take = Math.min(count - offset, available), h = Math.max(compact ? 26 : 30, take * 13 + (compact ? 12 : 14));
        box(left, y - h, area, h, index % 2 ? zebra : CORES_EXPORTACAO.branco);
        let x = left;
        row.forEach((value, i) => {
          const visible = lines[i].slice(offset, offset + take);
          visible.forEach((line, n) => {
            const tx = aligns[i] === 'right' ? x + widths[i] - 8 - medir(line, 9, regular) : x + 8;
            text(line, tx, y - 17 - n * 13, 9, regular, String(value).startsWith('-') || String(value).includes('-R$') ? CORES_EXPORTACAO.negativo : ink);
          }); x += widths[i];
        });
        y -= h; offset += take;
        if (offset < count) continuation();
      }
    }); y -= compact ? 8 : 20;
  }
  for (const obra of d.obras) {
    if (obra.relatorio && wrap(`Obra #${obra.id} • ${obra.clienteNome}`, area, 10, bold).length > 8)
      throw new FalhaRelatorioFinanceiro('EXPORT_TEXT_LIMIT', `Obra #${obra.id}: identificação excede oito linhas no título de custos do PDF. Reduza o texto para exportar sem cortes.`);
  }
  next();
  const clienteLinhas = wrap(d.cliente, area / 2 - 28);
  if (clienteLinhas.length > 8) throw new FalhaRelatorioFinanceiro('EXPORT_TEXT_LIMIT', 'O nome do cliente excede oito linhas na identificação do PDF. Reduza o texto para exportar sem cortes.');
  const ajuste = Math.max(0, (clienteLinhas.length - 1) * 13);
  box(left, 465 - ajuste, area, 49 + ajuste, pale); box(left, 465 - ajuste, 3, 49 + ajuste, navy);
  text('Período do recorte', 57, 496, 9, bold, navy); text(d.inicio && d.fim ? date(d.inicio) + ' a ' + date(d.fim) : 'Sem restrição de período', 57, 480);
  text('Cliente', 405, 496, 9, bold, navy); clienteLinhas.forEach((line, i) => text(line, 405, 480 - i * 13));
  text((obraFiltroId ? `Obra #${obraFiltroId} • ` : '') + 'Filtro pelo término real da obra ou, na ausência, pelo término estimado. Datas inclusivas.', left, 450 - ajuste, 8, regular, muted);
  const s = d.totais;
  ([['Receita', s.receita], ['Custo', s.custo], ['Resultado', s.resultado]] as [string, number | null][]).forEach(([label, value], i) => {
    const x = left + i * 260; text(label, x, 423 - ajuste, 9, regular, muted);
    text(brl(value), x, 401 - ajuste, value == null ? 13 : 18, bold, value != null && value < 0 ? CORES_EXPORTACAO.negativo : value == null ? muted : navy);
  });
  text(`${s.apuradas} de ${d.obras.length} obras com apuração financeira. Totais consideram somente as obras apuradas.`, left, 379 - ajuste, 9, regular, muted);
  text('Obras do recorte', left, 350 - ajuste, 12, bold, navy); y = 335 - ajuste;
  const rows = d.obras.map(o => [o.id, o.clienteNome, (statuses[o.status] ?? o.status), o.quantidadePaineis, date(o.termino), brl(o.relatorio?.receita), brl(o.relatorio?.custoTotal), brl(o.relatorio?.lucro)]);
  table(['Obra', 'Cliente', 'Situação', 'Painéis', 'Término', 'Receita', 'Custo', 'Resultado'], rows, [36, 190, 88, 47, 85, 102, 102, area - 650], ['left', 'left', 'left', 'right', 'left', 'right', 'right', 'right'], 'Obras do recorte • continuação');
  if (y < 105) next(); text('Não informado: a obra não possui apuração financeira disponível.', left, y, 8, regular, muted);
  const apuradas = d.obras.filter(o => o.relatorio);
  if (apuradas.length || y < 220) next(); else y -= 30;
  text('Custos por obra', left, y, 14, bold, navy); y -= 28;
  if (!apuradas.length) {
    box(left, y - 55, area, 55, CORES_EXPORTACAO.alertaFundo); text('Nenhuma obra do recorte possui apuração financeira.', left + 12, y - 21, 11, bold, CORES_EXPORTACAO.alertaFinanceiro);
    text('Nenhum item de custo informado. Ausência de apuração não significa custo zero.', left + 12, y - 41, 9, regular, ink);
  }
  for (const o of apuradas) {
    if (y < 180) next();
    const title = `Obra #${o.id} • ${o.clienteNome}`;
    const tituloLinhas = wrap(title, area, 10, bold);
    if (y - tituloLinhas.length * 14 < 150) next();
    tituloLinhas.forEach(line => { text(line, left, y, 10, bold, navy); y -= 14; });
    if (!o.relatorio!.itens.length) { text('Nenhum item de custo informado.', left, y - 14, 9, regular, muted); y -= 42; continue; }
    table(['Item', 'Descrição do custo', 'Valor'], o.relatorio!.itens.map((item, i) => [i + 1, item.descricao, brl(item.valor)]), [40, area - 146, 106], ['left', 'left', 'right'], title, true);
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: left, y: 73 }, end: { x: width - left, y: 73 }, thickness: .6, color: color(border) });
    p.drawText('ZL Engenharia • Dados fictícios de demonstração', { x: left, y: 57, size: 8, font: regular, color: color(muted) });
    const n = `Página ${i + 1} de ${pages.length}`;
    p.drawText(n, { x: width - left - regular.widthOfTextAtSize(n, 8), y: 57, size: 8, font: regular, color: color(muted) });
  });
  return new Blob([new Uint8Array(await doc.save())], { type: 'application/pdf' });
}


