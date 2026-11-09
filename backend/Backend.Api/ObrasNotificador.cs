using Microsoft.AspNetCore.SignalR;

namespace Backend.Api;

// Sinais de invalidacao do cache: sem dados ou IDs, inclusive para instaladores de outras equipes.
public sealed class ObrasNotificador(IHubContext<ObrasHub> hub, ILogger<ObrasNotificador> logger)
{
    public Task ObraAtualizadaAsync() => PublicarAsync("ObraAtualizada");
    public Task ProgramacaoCriadaAsync() => PublicarAsync("ProgramacaoCriada");
    public Task ProgramacaoAtualizadaAsync() => PublicarAsync("ProgramacaoAtualizada");
    public Task MaterialAtualizadoAsync() => PublicarAsync("MaterialAtualizado");
    public Task ComentarioCriadoAsync() => PublicarAsync("ComentarioCriado");

    private async Task PublicarAsync(string evento)
    {
        try { await hub.Clients.All.SendCoreAsync(evento, []); }
        catch (Exception erro)
        {
            // A gravacao ja terminou. Falha de transporte nao transforma sucesso REST em erro.
            logger.LogWarning(erro, "Falha ao publicar {Evento} via SignalR.", evento);
        }
    }
}
