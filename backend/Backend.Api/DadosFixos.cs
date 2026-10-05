using System.Globalization;

namespace Backend.Api;

public record Perfil(int Id, string NomePerfil, string Permissoes);
public record Usuario(int Id, string Nome, string Email, string Senha, int PerfilId, int? EquipeId);
public record Cliente(int Id, string Nome, string? Cidade);
public record Obra(int Id, string Status, string? Categoria, int QuantidadePaineis,
    DateOnly? DataInicioEstimada, DateOnly? DataFimEstimada, DateOnly? DataInicioReal, DateOnly? DataFimReal, int ClienteId);
public record Pagamento(int Id, DateOnly? DataConfirmacao, int PrazoContratualDias, int ObraId);
public record Material(int Id, string Tipo, int Quantidade, string? StatusLogistico, int ObraId);
public record Historico(int Id, string? StatusAnterior, string StatusNovo, DateTime DataAlteracao, string? Observacao, int ObraId, int UsuarioId);

// Espelho em memória do database/02_seed.sql (mesmos IDs e valores).
// ponytail: dados fixos + lock global; trocar por acesso ao PostgreSQL quando a persistência real entrar.
public static class DadosFixos
{
    public static readonly object Trava = new();

    public static readonly string[] StatusObra = ["MaterialComprado", "NoDeposito", "Separado", "EmAndamento", "Concluido", "Assistencia"];
    public static readonly string[] StatusLogistico = ["Comprado", "EmTransito", "Disponivel", "Utilizado"];

    // Mesmas regras de TRANSICOES_VALIDAS do frontend (constants/kanbanStatus.ts)
    public static readonly Dictionary<string, string[]> Transicoes = new()
    {
        ["MaterialComprado"] = ["NoDeposito"],
        ["NoDeposito"] = ["Separado"],
        ["Separado"] = ["EmAndamento"],
        ["EmAndamento"] = ["Concluido", "Assistencia"],
        ["Concluido"] = ["Assistencia"],
        ["Assistencia"] = ["EmAndamento"],
    };

    public static readonly List<Perfil> Perfis =
    [
        new(1, "Administrador", "*"),
        new(2, "EngenhariaObras", "obras:criar,obras:mover,programacoes:editar"),
        new(3, "Financeiro", "financeiro:visualizar,relatorios:visualizar"),
        new(4, "VisualizadorLeitor", "obras:visualizar"),
        new(5, "InstaladorCampo", "obras:visualizar,materiais:confirmar"),
    ];

    // ponytail: senha em texto puro (o seed guarda hash bcrypt de "Senha123!"); usar hash quando o login real com JWT entrar
    public static readonly List<Usuario> Usuarios =
    [
        new(1, "Carlos Administrador", "admin@zl.com.br", "Senha123!", 1, null),
        new(2, "Ana Souza", "engenharia@zlengenharia.com", "Senha123!", 2, 3),
        new(3, "Fernanda Financeiro", "financeiro@zl.com.br", "Senha123!", 3, null),
        new(4, "Roberto Leitor", "leitor@zl.com.br", "Senha123!", 4, null),
        new(5, "Marcos Instalador", "instalador@zl.com.br", "Senha123!", 5, 3),
        new(6, "Paulo Engenheiro", "paulo.eng@zl.com.br", "Senha123!", 2, 1),
        new(7, "Julia Engenheira", "julia.eng@zl.com.br", "Senha123!", 2, 2),
        new(8, "Diego Instalador", "diego.campo@zl.com.br", "Senha123!", 5, 1),
        new(9, "Beatriz Instaladora", "beatriz.campo@zl.com.br", "Senha123!", 5, 2),
        new(10, "Lucas Financeiro", "lucas.fin@zl.com.br", "Senha123!", 3, null),
    ];

    public static readonly List<Cliente> Clientes =
    [
        new(1, "Rede Alfa Supermercados", "Campinas"),
        new(2, "Indústria Metalúrgica Ramos", "Sorocaba"),
        new(3, "Residencial Vista Verde — Bloco A", "Campinas"),
        new(4, "Fazenda Santa Maria", "Itapetininga"),
        new(5, "Hospital São Lucas", "Santos"),
        new(6, "Condomínio Solar das Flores", "São Paulo"),
        new(7, "Posto Alvorada Combustíveis", "Guarulhos"),
        new(8, "Granja Silva", "Itu"),
        new(9, "Escola Estadual Dom Pedro II", "Campinas"),
        new(10, "Shopping Bela Vista", "São Bernardo do Campo"),
    ];

    public static readonly List<Obra> Obras =
    [
        new(301, "MaterialComprado", "Comercial", 45, D("2026-09-20"), D("2026-10-06"), null, null, 1),
        new(302, "MaterialComprado", "Industrial", 120, D("2026-10-01"), D("2026-10-25"), null, null, 2),
        new(303, "NoDeposito", "Residencial", 24, D("2026-10-05"), D("2026-10-14"), null, null, 3),
        new(304, "Separado", "Rural", 80, D("2026-10-01"), D("2026-10-08"), null, null, 4),
        new(305, "EmAndamento", "Comercial", 96, D("2026-09-25"), D("2026-10-02"), D("2026-09-26"), null, 5),
        new(306, "EmAndamento", "Residencial", 36, D("2026-09-28"), D("2026-10-04"), D("2026-09-29"), null, 6),
        new(307, "Concluido", "Comercial", 50, D("2026-09-05"), D("2026-09-18"), D("2026-09-06"), D("2026-09-17"), 7),
        new(308, "Assistencia", "Manutenção", 30, D("2026-10-10"), D("2026-10-12"), null, null, 8),
        new(309, "NoDeposito", "Comercial", 60, D("2026-10-08"), D("2026-10-20"), null, null, 9),
        new(310, "MaterialComprado", "Comercial", 200, D("2026-10-15"), D("2026-11-10"), null, null, 10),
    ];

    public static readonly List<Pagamento> Pagamentos =
    [
        new(1, D("2026-09-15"), 45, 301),
        new(2, D("2026-09-20"), 60, 302),
        new(3, D("2026-09-28"), 30, 303),
        new(4, D("2026-09-18"), 45, 304),
        new(5, D("2026-09-10"), 30, 305),
        new(6, D("2026-09-22"), 30, 306),
        new(7, D("2026-08-20"), 45, 307),
        new(8, D("2026-10-01"), 15, 308),
        new(9, D("2026-09-30"), 45, 309),
        new(10, D("2026-10-05"), 90, 310),
    ];

    public static readonly List<Material> Materiais =
    [
        new(501, "Painel Solar 550W", 45, "EmTransito", 301),
        new(502, "Inversor 5kW", 2, "Disponivel", 301),
        new(503, "Cabo Solar 6mm", 200, "Comprado", 301),
        new(504, "Painel Solar 550W", 120, "Comprado", 302),
        new(505, "Inversor 10kW", 6, "Comprado", 302),
        new(506, "Painel Solar 400W", 24, "Disponivel", 303),
        new(507, "Inversor 3kW", 1, "Disponivel", 303),
        new(508, "Painel Solar 550W", 80, "Disponivel", 304),
        new(509, "Inversor 8kW", 4, "Disponivel", 304),
        new(510, "Painel Solar 550W", 96, "Utilizado", 305),
        new(511, "Inversor 10kW", 5, "Utilizado", 305),
        new(512, "Painel Solar 400W", 36, "Utilizado", 306),
        new(513, "Inversor 3kW", 2, "Utilizado", 306),
        new(514, "Painel Solar 550W", 50, "Utilizado", 307),
        new(515, "Painel Solar 400W", 30, "Comprado", 308),
    ];

    public static readonly List<Historico> Historicos =
    [
        new(9001, null, "MaterialComprado", T("2026-09-20 09:00:00"), "Obra criada no sistema.", 301, 1),
        new(9002, null, "MaterialComprado", T("2026-09-21 10:00:00"), "Obra criada no sistema.", 302, 1),
        new(9003, null, "MaterialComprado", T("2026-09-28 11:00:00"), "Obra criada no sistema.", 303, 2),
        new(9004, "MaterialComprado", "NoDeposito", T("2026-10-01 14:00:00"), "Material chegou ao depósito.", 303, 6),
        new(9005, null, "MaterialComprado", T("2026-09-18 09:30:00"), "Obra criada no sistema.", 304, 2),
        new(9006, "MaterialComprado", "NoDeposito", T("2026-09-22 10:00:00"), "Material recebido e conferido.", 304, 2),
        new(9007, "NoDeposito", "Separado", T("2026-09-28 15:00:00"), "Kits separados por endereço de entrega.", 304, 6),
        new(9008, null, "MaterialComprado", T("2026-09-10 08:00:00"), "Obra criada no sistema.", 305, 1),
        new(9009, "MaterialComprado", "NoDeposito", T("2026-09-15 11:00:00"), "Material no depósito.", 305, 2),
        new(9010, "NoDeposito", "Separado", T("2026-09-20 13:00:00"), "Separação concluída.", 305, 6),
        new(9011, "Separado", "EmAndamento", T("2026-09-26 08:00:00"), "Equipe iniciou instalação hoje.", 305, 2),
        new(9012, "Separado", "EmAndamento", T("2026-09-29 08:30:00"), "Equipe 02 a caminho do local.", 306, 7),
        new(9013, "EmAndamento", "Concluido", T("2026-09-17 16:00:00"), "Instalação concluída. Sistema ligado.", 307, 2),
        new(9014, "Concluido", "Assistencia", T("2026-10-02 07:00:00"), "Cliente relatou problema no inversor.", 308, 5),
    ];

    // Token fake (sem JWT): "token-fixo-{idUsuario}"
    const string PrefixoBearer = "Bearer token-fixo-";

    public static string GerarToken(Usuario u) => $"token-fixo-{u.Id}";

    public static Usuario? UsuarioDoToken(string? authorization) =>
        authorization is not null && authorization.StartsWith(PrefixoBearer) && int.TryParse(authorization[PrefixoBearer.Length..], out var id)
            ? Usuarios.FirstOrDefault(u => u.Id == id)
            : null;

    // Contrato pede DateTime sem fração de segundo (yyyy-MM-ddTHH:mm:ssZ)
    public static DateTime Agora()
    {
        var n = DateTime.UtcNow;
        return n.AddTicks(-(n.Ticks % TimeSpan.TicksPerSecond));
    }

    static DateOnly D(string s) => DateOnly.Parse(s, CultureInfo.InvariantCulture);
    static DateTime T(string s) => DateTime.SpecifyKind(DateTime.Parse(s, CultureInfo.InvariantCulture), DateTimeKind.Utc);
}
