using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Controllers;

// Módulo do instalador de campo (RF-19, RN-04): só a própria equipe, sem valores financeiros.
// A equipe vem sempre do token, nunca de parâmetro da requisição.
[ApiController]
[Route("api/instalador")]
[Authorize(Roles = Perfis.Instalador)]
public class InstaladorController(BancoDados banco) : ControllerBase
{
    /// <summary>Lista as instalações programadas para a equipe do usuário logado (rota 31, RF-19).</summary>
    [HttpGet("instalacoes")]
    [ProducesResponseType(typeof(List<InstalacaoListaBanco>), StatusCodes.Status200OK)]
    public IActionResult ListarInstalacoes() =>
        Ok(User.EquipeId() is int equipe ? banco.ListarInstalacoesEquipe(equipe) : []);

    /// <summary>Detalhe da instalação: kit sem preços, endereço, projeto, instruções e link de navegação (rota 32, RF-19).</summary>
    /// <remarks>Obra de outra equipe responde 404, como obra inexistente, para não revelar que ela existe.</remarks>
    [HttpGet("instalacoes/{obraId:int}")]
    [ProducesResponseType(typeof(InstalacaoDetalheSaida), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status404NotFound)]
    public IActionResult DetalharInstalacao(int obraId)
    {
        var detalhe = User.EquipeId() is int equipe ? banco.BuscarInstalacaoEquipe(obraId, equipe) : null;
        if (detalhe is null) return Erro.Criar(404, "OBRA_NOT_FOUND", $"Obra {obraId} não encontrada.");
        return Ok(new InstalacaoDetalheSaida(detalhe.ObraId, detalhe.ClienteNome, detalhe.Endereco,
            LinkNavegacao(detalhe.Endereco), detalhe.Kit, detalhe.Projeto, detalhe.Instrucoes));
    }

    /// <summary>Lista as manutenções da equipe do usuário logado (rota 33, RF-05 e RF-19).</summary>
    /// <param name="status">Opcional: <c>Pendente</c> ou <c>Concluida</c>.</param>
    [HttpGet("manutencoes")]
    [ProducesResponseType(typeof(List<ManutencaoBanco>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErroSaida), StatusCodes.Status400BadRequest)]
    public IActionResult ListarManutencoes(string? status)
    {
        try
        {
            // Sem equipe não há manutenção, mas o filtro inválido continua sendo recusado.
            return Ok(banco.ListarManutencoesEquipe(User.EquipeId() ?? 0, status));
        }
        catch (RegraVioladaException ex)
        {
            return Erro.Criar(ex.Status, ex.Code, ex.Message);
        }
    }

    // "Abrir rota": o app de mapas do celular abre a busca pelo endereço.
    static string LinkNavegacao(string endereco) =>
        "https://www.google.com/maps/search/?api=1&query=" + WebUtility.UrlEncode(endereco);

    public sealed record InstalacaoDetalheSaida(int ObraId, string ClienteNome, string Endereco, string LinkNavegacao,
        List<KitInstalacaoBanco> Kit, ProjetoInstalacaoBanco Projeto, string? Instrucoes);
}
