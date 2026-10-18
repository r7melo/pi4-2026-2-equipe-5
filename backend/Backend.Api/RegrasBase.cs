namespace Backend.Api;

public static class RegrasBase
{
    public static readonly string[] StatusObra =
        ["MaterialComprado", "NoDeposito", "Separado", "EmAndamento", "Concluido", "Assistencia"];
    public static readonly string[] StatusLogistico = ["Comprado", "EmTransito", "Disponivel", "Utilizado"];

    // Transições do funil (04-regras-negocio.md, seção 2). Mudar para o status atual não está em nenhuma lista.
    public static readonly Dictionary<string, string[]> Transicoes = new()
    {
        ["MaterialComprado"] = ["NoDeposito"],
        ["NoDeposito"] = ["Separado"],
        ["Separado"] = ["EmAndamento"],
        ["EmAndamento"] = ["Concluido", "Assistencia"],
        ["Concluido"] = ["Assistencia"],
        ["Assistencia"] = ["EmAndamento"],
    };

    public static DateTime Agora()
    {
        var agora = DateTime.UtcNow;
        return agora.AddTicks(-(agora.Ticks % TimeSpan.TicksPerSecond));
    }
}
