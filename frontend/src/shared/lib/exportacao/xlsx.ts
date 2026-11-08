import { strToU8, zipSync } from 'fflate';

export function corArgb(hex: string): string { return 'FF' + hex.slice(1); }
// Recebe texto já validado pelo domínio. Não normaliza nem remove caracteres.
export function codificarTextoXlsx(valor: string | number): string {
  return String(valor).replace(/_(?=x[0-9a-fA-F]{4}_)/g, '_x005F_')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\r/g, '&#13;');
}
export function empacotarXlsx(partes: Record<string, string>): Blob {
  const arquivos = Object.fromEntries(Object.entries(partes).map(([nome, xml]) => [nome, strToU8(xml)]));
  return new Blob([new Uint8Array(zipSync(arquivos))], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
