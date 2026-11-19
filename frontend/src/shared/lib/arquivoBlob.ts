export type FormatoBinarioSuportado = "pdf" | "xlsx";

export const LIMITE_JSON_BLOB_BYTES = 65_536;
const ATRASO_REVOGACAO_BLOB_MS = 1000;

const MAGIC_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const MAGIC_XLSX = [0x50, 0x4b, 0x03, 0x04] as const;
const MIME_PDF = "application/pdf";
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Valida tipo MIME base e assinatura magic bytes de arquivos PDF/XLSX sem decodificação textual de buffers binários. */
export async function validarAssinaturaArquivo(
  blob: Blob,
  formato: FormatoBinarioSuportado,
): Promise<boolean> {
  if (!(blob instanceof Blob)) return false;

  let mimeEsperado: string;
  let magic: readonly number[];
  if (formato === "pdf") {
    mimeEsperado = MIME_PDF;
    magic = MAGIC_PDF;
  } else if (formato === "xlsx") {
    mimeEsperado = MIME_XLSX;
    magic = MAGIC_XLSX;
  } else {
    return false;
  }

  if (blob.size < magic.length) return false;

  const mimeBase = (typeof blob.type === "string" ? blob.type : "").split(";")[0].trim().toLowerCase();
  if (mimeBase !== mimeEsperado) return false;

  const bytes = new Uint8Array(await blob.slice(0, magic.length).arrayBuffer());
  if (bytes.length < magic.length) return false;
  for (let i = 0; i < magic.length; i += 1) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

/** Lê e faz parse de JSON encapsulado em Blob até o teto de bytes informado, retornando null em excesso ou falha. */
export async function lerJsonDeBlob(
  blob: unknown,
  limiteBytes = LIMITE_JSON_BLOB_BYTES,
): Promise<unknown> {
  if (!(blob instanceof Blob)) return null;
  if (!Number.isFinite(limiteBytes) || limiteBytes <= 0) return null;
  if (blob.size <= 0 || blob.size > limiteBytes) return null;

  try {
    return JSON.parse(await blob.text()) as unknown;
  } catch {
    return null;
  }
}

/** Dispara download DOM com remoção síncrona da âncora, revogação adiada em 1000ms e limpeza idempotente. */
export function baixarArquivoBlob(blob: Blob, nomeArquivo: string): () => void {
  const url = URL.createObjectURL(blob);
  let link: HTMLAnchorElement | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let limpo = false;

  const limpar = (): void => {
    if (limpo) return;
    limpo = true;
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    try {
      link?.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  try {
    link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    link.style.display = "none";
    try {
      document.body.appendChild(link);
      link.click();
    } finally {
      link.remove();
    }
    timer = setTimeout(limpar, ATRASO_REVOGACAO_BLOB_MS);
    return limpar;
  } catch (erro: unknown) {
    limpar();
    throw erro;
  }
}
