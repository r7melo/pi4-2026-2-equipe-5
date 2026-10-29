import { rgb } from 'pdf-lib';
import { FONTES_EXPORTACAO } from './identidade';

export function corPdf(hex: string) {
  return rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
}
export class FonteExportacaoIndisponivel extends Error {
  constructor() { super('Fonte indisponível'); }
}
// Compartilhar apenas carregamentos em voo. Cada PDF recebe bytes privados e incorpora sua própria fonte.
const pendentes = new Map<string, Promise<Uint8Array>>();
export async function carregarFontePdf(peso: 'regular' | 'negrito' = 'regular'): Promise<Uint8Array> {
  const url = FONTES_EXPORTACAO.pdf[peso];
  let pendente = pendentes.get(url);
  if (!pendente) {
    pendente = fetch(url).then(async resposta => {
      if (!resposta.ok) throw new FonteExportacaoIndisponivel();
      return new Uint8Array(await resposta.arrayBuffer());
    }).finally(() => { pendentes.delete(url); });
    pendentes.set(url, pendente);
  }
  return (await pendente).slice();
}
