namespace Backend.Api;

public static class RegrasBase
{
    public static readonly string[] StatusObra =
        ["MaterialComprado", "NoDeposito", "Separado", "EmAndamento", "Concluido", "Assistencia"];
    public static readonly string[] StatusLogistico = ["Comprado", "EmTransito", "Disponivel", "Utilizado"];

    public static readonly Dictionary<string, string[]> Transicoes = new()
    {
        ["MaterialComprado"] = ["NoDeposito"],
        ["NoDeposito"] = ["Separado"],
        ["Separado"] = ["EmAndamento"],
        ["EmAndamento"] = ["Concluido", "Assistencia"],
        ["Concluido"] = ["Assistencia"],
        ["Assistencia"] = ["EmAndamento"],
    };

    const string PrefixoBearer = "Bearer token-fixo-";
    public static string GerarToken(int usuarioId) => $"token-fixo-{usuarioId}";
    public static int? IdDoToken(string? authorization) =>
        authorization is not null && authorization.StartsWith(PrefixoBearer, StringComparison.Ordinal)
        && int.TryParse(authorization[PrefixoBearer.Length..], out var id) && id > 0 ? id : null;

    public static DateTime Agora()
    {
        var agora = DateTime.UtcNow;
        return agora.AddTicks(-(agora.Ticks % TimeSpan.TicksPerSecond));
    }
}
