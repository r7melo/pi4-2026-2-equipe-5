using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Api;

// Canal de notificacoes apenas: gravacoes continuam nas rotas REST autorizadas.
[Authorize(Roles = Perfis.Todos)]
public sealed class ObrasHub : Hub
{
    public const string Caminho = "/hubs/obras";
}
