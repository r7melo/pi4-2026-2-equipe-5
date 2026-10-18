namespace Backend.Api;

// Regras de cálculo do Gantt (RN-01, RN-02, ADR-011). Sábados e domingos não são dias úteis;
// feriados ainda não entram na conta (questão Q2 em aberto).
public static class Gantt
{
    public const int PaineisPorDia = 9;

    // RN-01: painéis ÷ produtividade, arredondado para cima (CT-04: 200 painéis = 23 dias).
    public static int DuracaoEmDias(int quantidadePaineis) =>
        (int)Math.Ceiling(quantidadePaineis / (double)PaineisPorDia);

    public static bool DiaUtil(DateOnly data) =>
        data.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday);

    public static DateOnly ProximoDiaUtil(DateOnly data)
    {
        while (!DiaUtil(data)) data = data.AddDays(1);
        return data;
    }

    // Data de término contando o início como primeiro dia útil.
    public static DateOnly DataFim(DateOnly inicio, int dias)
    {
        var fim = ProximoDiaUtil(inicio);
        for (var contados = 1; contados < dias; contados++)
            fim = ProximoDiaUtil(fim.AddDays(1));
        return fim;
    }

    // Dias úteis entre início e fim, contando os dois (mínimo 1).
    public static int DiasUteis(DateOnly inicio, DateOnly fim)
    {
        var dias = 0;
        for (var data = inicio; data <= fim; data = data.AddDays(1))
            if (DiaUtil(data)) dias++;
        return Math.Max(dias, 1);
    }

    // Deslocamento com sinal, em dias úteis, de uma data útil até outra.
    public static int DeslocamentoEmDiasUteis(DateOnly de, DateOnly ate)
    {
        de = ProximoDiaUtil(de);
        if (ate == de) return 0;
        var sinal = ate > de ? 1 : -1;
        var dias = 0;
        for (var data = de; data != ate; data = data.AddDays(sinal))
            if (DiaUtil(data.AddDays(sinal))) dias += sinal;
        return dias;
    }

    public static DateOnly Deslocar(DateOnly data, int diasUteis)
    {
        data = ProximoDiaUtil(data);
        var sinal = Math.Sign(diasUteis);
        for (var restantes = Math.Abs(diasUteis); restantes > 0;)
        {
            data = data.AddDays(sinal);
            if (DiaUtil(data)) restantes--;
        }
        return data;
    }
}
