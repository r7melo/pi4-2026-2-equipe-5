using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Api;

// Hub autenticado; não expõe métodos de escrita ao cliente.
[Authorize(Roles = Perfis.Todos)]
public sealed class ObrasHub : Hub { }

public sealed class ObrasNotificador(IHubContext<ObrasHub> hub, ILogger<ObrasNotificador> logger)
{
    public async Task NotificarAtualizacaoAsync(int obraId)
    {
        try
        {
            await hub.Clients.All.SendAsync("ObraAtualizada", new { obraId });
        }
        catch (Exception ex)
        {
            // O registro já foi persistido. Uma indisponibilidade do transporte em tempo real
            // não deve transformar uma operação concluída em erro HTTP para o cliente.
            logger.LogWarning(ex, "Falha ao notificar atualização da obra {ObraId} via SignalR.", obraId);
        }
    }

    public async Task NotificarAgendaAtualizadaAsync()
    {
        try
        {
            await hub.Clients.All.SendAsync("ObraAtualizada", new { obraId = (int?)null });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Falha ao notificar atualização do cronograma via SignalR.");
        }
    }
}
