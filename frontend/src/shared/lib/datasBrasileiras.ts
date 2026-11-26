import { dataCivilValida } from "./datasCivis";

/** Converte data civil ISO (`YYYY-MM-DD` ou prefixo de timestamp) para `dd/mm/aaaa`. */
export function isoParaDataBR(iso?: string | null): string {
  if (!iso || typeof iso !== "string") return "";
  const prefixo = iso.trim().slice(0, 10);
  if (!dataCivilValida(prefixo)) return "";
  const [ano, mes, dia] = prefixo.split("-");
  return `${dia}/${mes}/${ano}`;
}

/** Aplica máscara numérica incremental `dd/mm/aaaa` (máximo 8 dígitos). */
export function mascararDataBR(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** Valida `dd/mm/aaaa` no calendário civil e devolve `YYYY-MM-DD`, ou `null` se inválida. */
export function dataBRParaIso(br: string): string | null {
  const limpo = br.trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(limpo)) return null;
  const [dia, mes, ano] = limpo.split("/");
  const iso = `${ano}-${mes}-${dia}`;
  return dataCivilValida(iso) ? iso : null;
}
