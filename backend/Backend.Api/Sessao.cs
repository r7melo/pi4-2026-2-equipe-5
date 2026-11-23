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

    // RN-04 / RF-19: o instalador só vê obras cujas equipes integra ou integrou (vínculo pelo id do token).
    public static bool PodeVerObra(this ControllerBase controller, BancoDados banco, int obraId) =>
        !controller.User.Instalador() || banco.InstaladorNaObra(obraId, controller.UsuarioAtualId());

    public static ObjectResult ObraDeOutraEquipe(this ControllerBase controller, int obraId) =>
        controller.AcessoNegado($"Você não integra nenhuma equipe da obra {obraId}.", "ObraDeOutraEquipe");
}
