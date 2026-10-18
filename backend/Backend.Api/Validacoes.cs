using System.Text.RegularExpressions;

namespace Backend.Api;

public static partial class Validacoes
{
    // UC-08: CPF/CNPJ válido, conferido pelos dígitos verificadores (só dígitos).
    public static bool CpfCnpjValido(string documento) => documento.Length switch
    {
        11 => DigitosConferem(documento, [10, 9, 8, 7, 6, 5, 4, 3, 2], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]),
        14 => DigitosConferem(documento, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]),
        _ => false,
    };

    static bool DigitosConferem(string documento, int[] pesos1, int[] pesos2)
    {
        if (!documento.All(char.IsAsciiDigit) || documento.Distinct().Count() == 1) return false;
        return Digito(documento, pesos1) == documento[pesos1.Length] - '0'
            && Digito(documento, pesos2) == documento[pesos2.Length] - '0';
    }

    static int Digito(string documento, int[] pesos)
    {
        var resto = pesos.Select((peso, i) => (documento[i] - '0') * peso).Sum() % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    public static bool EmailValido(string email) => FormatoEmail().IsMatch(email);

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex FormatoEmail();
}
