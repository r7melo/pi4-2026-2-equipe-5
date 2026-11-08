/**
 * Utilitários de validação matemática e formatação de CPF e CNPJ
 * Compatível 100% com as regras de dígitos verificadores do backend C# (Validacoes.cs).
 */

export function limparDocumento(documento: string): string {
  return documento.replace(/\D/g, "");
}

export function validarCpf(cpf: string): boolean {
  const doc = limparDocumento(cpf);
  if (doc.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(doc)) return false;

  const pesos1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];

  const calcDigito = (pesos: number[]): number => {
    const soma = pesos.reduce((acc, peso, i) => acc + parseInt(doc[i], 10) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcDigito(pesos1) === parseInt(doc[9], 10) && calcDigito(pesos2) === parseInt(doc[10], 10);
}

export function validarCnpj(cnpj: string): boolean {
  const doc = limparDocumento(cnpj);
  if (doc.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(doc)) return false;

  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const calcDigito = (pesos: number[]): number => {
    const soma = pesos.reduce((acc, peso, i) => acc + parseInt(doc[i], 10) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcDigito(pesos1) === parseInt(doc[12], 10) && calcDigito(pesos2) === parseInt(doc[13], 10);
}

export function validarCpfCnpj(documento: string): boolean {
  const doc = limparDocumento(documento);
  if (doc.length === 11) return validarCpf(doc);
  if (doc.length === 14) return validarCnpj(doc);
  return false;
}

export function formatarCpfCnpj(valor: string): string {
  const doc = limparDocumento(valor).slice(0, 14);
  if (doc.length <= 11) {
    return doc
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return doc
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatarTelefone(valor: string): string {
  const tel = valor.replace(/\D/g, "").slice(0, 11);
  if (tel.length <= 10) {
    return tel
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return tel
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
