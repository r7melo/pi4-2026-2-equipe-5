namespace Backend.Api;

// Matriz de permissões (04-regras-negocio.md, seção 4; RN-04 e RN-05).
// VisualizadorLeitor existe no banco, mas não recebe permissão em nenhuma rota (questão Q4).
public static class Perfis
{
    public const string Administrador = "Administrador";
    public const string Engenharia = "EngenhariaObras";
    public const string Financeiro = "Financeiro";
    public const string Instalador = "InstaladorCampo";

    // Valores para [Authorize(Roles = ...)].
    public const string Gestao = Administrador + "," + Engenharia;
    public const string Leitura = Administrador + "," + Engenharia + "," + Financeiro;
    public const string Todos = Administrador + "," + Engenharia + "," + Financeiro + "," + Instalador;
    public const string Comentaristas = Administrador + "," + Engenharia + "," + Financeiro;
}
