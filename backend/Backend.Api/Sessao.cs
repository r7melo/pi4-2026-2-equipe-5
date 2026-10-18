namespace Backend.Api;

public static class Sessao
{
    // Sem JWT ainda: usa o token fixo do login e, sem token válido, atribui a ação ao Administrador (id 1).
    public static int UsuarioAtualId(this BancoDados banco, HttpRequest request)
    {
        var id = RegrasBase.IdDoToken(request.Headers.Authorization);
        return id is int usuarioId && banco.BuscarUsuarioPorId(usuarioId) is not null ? usuarioId : 1;
    }
}
