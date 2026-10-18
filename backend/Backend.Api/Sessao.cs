using Microsoft.AspNetCore.Mvc;

namespace Backend.Api;

public static class Sessao
{
    // Toda rota protegida só chega ao controller com token válido, então o id sempre existe.
    public static int UsuarioAtualId(this ControllerBase controller) =>
        controller.User.UsuarioId() ?? throw new InvalidOperationException("Rota protegida sem usuário autenticado.");

    // 403 decidido no controller (ex.: instalador fora da própria equipe), também registrado no audit_log.
    public static ObjectResult AcessoNegado(this ControllerBase controller, string mensagem, string motivo)
    {
        var http = controller.HttpContext;
        http.RequestServices.GetRequiredService<BancoDados>().RegistrarAcessoNegado(controller.User.UsuarioId(), 403,
            http.Request.Method, http.Request.Path, motivo, controller.User.Perfil());
        return Erro.Criar(403, "ACCESS_DENIED", mensagem);
    }

    // RN-04: o instalador só vê obras programadas para a própria equipe.
    public static bool PodeVerObra(this ControllerBase controller, BancoDados banco, int obraId) =>
        !controller.User.Instalador()
        || controller.User.EquipeId() is int equipe && banco.ObraProgramadaParaEquipe(obraId, equipe);

    public static ObjectResult ObraDeOutraEquipe(this ControllerBase controller, int obraId) =>
        controller.AcessoNegado($"A obra {obraId} não está programada para a sua equipe.", "ObraDeOutraEquipe");
}
