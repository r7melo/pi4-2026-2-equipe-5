namespace Backend.Api;

public sealed record EquipeBanco(int Id, string Nome, string? Especialidade, AutorBanco Responsavel,
    List<AutorBanco> Instaladores, bool? Ocupada);

public sealed partial class BancoDados
{
    // Com período informado, "ocupada" indica se a equipe já tem alocação que o cruza (RF-07).
    public List<EquipeBanco> ListarEquipes(DateOnly? inicio, DateOnly? fim)
    {
        using var conexao = Abrir();
        var periodo = inicio is not null && fim is not null;
        var instaladores = new Dictionary<int, List<AutorBanco>>();
        using (var comando = Comando(conexao, """
            SELECT ei.id_equipe, u.id, u.nome
            FROM equipe_instalador ei JOIN usuario u ON u.id = ei.id_usuario
            ORDER BY ei.id_equipe, u.id
            """))
        using (var leitor = comando.ExecuteReader())
            while (leitor.Read())
            {
                if (!instaladores.TryGetValue(leitor.GetInt32(0), out var lista))
                    instaladores[leitor.GetInt32(0)] = lista = [];
                lista.Add(new AutorBanco(leitor.GetInt32(1), leitor.GetString(2)));
            }

        using var equipes = Comando(conexao, """
            SELECT e.id, e.nome, e.especialidade, r.id, r.nome,
                   EXISTS (SELECT 1 FROM programacao_obra p
                           WHERE p.id_equipe = e.id AND p.data_inicio <= @fim AND p.data_fim >= @inicio)
            FROM equipe e JOIN usuario r ON r.id = e.id_responsavel
            ORDER BY e.id
            """, ("inicio", inicio ?? DateOnly.MinValue), ("fim", fim ?? DateOnly.MinValue));
        using var leitorEquipes = equipes.ExecuteReader();
        var itens = new List<EquipeBanco>();
        while (leitorEquipes.Read())
            itens.Add(new EquipeBanco(leitorEquipes.GetInt32(0), leitorEquipes.GetString(1),
                leitorEquipes.IsDBNull(2) ? null : leitorEquipes.GetString(2),
                new AutorBanco(leitorEquipes.GetInt32(3), leitorEquipes.GetString(4)),
                instaladores.GetValueOrDefault(leitorEquipes.GetInt32(0)) ?? [],
                periodo ? leitorEquipes.GetBoolean(5) : null));
        return itens;
    }
}
