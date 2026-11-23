namespace Backend.Api;

public sealed record OcupacaoInstaladorBanco(int ObraId, DateOnly DataInicio, DateOnly DataFim);
public sealed record DisponibilidadeBanco(int UsuarioId, string Nome, bool Ocupado, List<OcupacaoInstaladorBanco> Ocupacoes);
public sealed record OcupacaoDiaBanco(DateOnly Data, int InstaladoresAtivos, int Alocados, int Livres, int Faltantes);
public sealed record OcupacaoPorInstaladorBanco(int UsuarioId, string Nome, int DiasUteis, int DiasAlocados,
    int OcupacaoPercentual);
public sealed record OcupacaoGanttBanco(List<OcupacaoDiaBanco> PorDia, List<OcupacaoPorInstaladorBanco> PorInstalador);

// Agenda dos instaladores (RF-07, RN-10): só vínculos que reservam agenda (obra não excluída).
public sealed partial class BancoDados
{
    sealed record Vinculo(int UsuarioId, int ProgramacaoId, int ObraId, DateOnly Entrada, DateOnly Saida);

    List<AutorBanco> InstaladoresAtivos(Npgsql.NpgsqlConnection conexao)
    {
        using var comando = Comando(conexao, """
            SELECT u.id, u.nome FROM usuario u JOIN perfil_acesso p ON p.id = u.id_perfil
            WHERE u.ativo AND p.nome_perfil::text = @perfil ORDER BY u.nome, u.id
            """, ("perfil", Perfis.Instalador));
        using var leitor = comando.ExecuteReader();
        var itens = new List<AutorBanco>();
        while (leitor.Read()) itens.Add(new AutorBanco(leitor.GetInt32(0), leitor.GetString(1)));
        return itens;
    }

    List<Vinculo> Vinculos(Npgsql.NpgsqlConnection conexao, DateOnly inicio, DateOnly fim)
    {
        using var comando = Comando(conexao, """
            SELECT i.id_usuario, i.id_programacao, p.id_obra, i.data_entrada, i.data_saida
            FROM equipe_integrante i JOIN programacao_obra p ON p.id = i.id_programacao
            WHERE i.reserva_agenda AND i.data_entrada <= @fim AND i.data_saida >= @inicio
            ORDER BY i.data_entrada, p.id_obra
            """, ("inicio", inicio), ("fim", fim));
        using var leitor = comando.ExecuteReader();
        var itens = new List<Vinculo>();
        while (leitor.Read())
            itens.Add(new Vinculo(leitor.GetInt32(0), leitor.GetInt32(1), leitor.GetInt32(2),
                leitor.GetFieldValue<DateOnly>(3), leitor.GetFieldValue<DateOnly>(4)));
        return itens;
    }

    // Rota 26: sem período, todos aparecem livres.
    public List<DisponibilidadeBanco> ListarDisponibilidade(DateOnly? inicio, DateOnly? fim)
    {
        using var conexao = Abrir();
        var instaladores = InstaladoresAtivos(conexao);
        var vinculos = inicio is null || fim is null ? [] : Vinculos(conexao, inicio.Value, fim.Value);
        return instaladores.Select(u =>
        {
            var ocupacoes = vinculos.Where(v => v.UsuarioId == u.Id)
                .Select(v => new OcupacaoInstaladorBanco(v.ObraId, v.Entrada, v.Saida)).ToList();
            return new DisponibilidadeBanco(u.Id, u.Nome, ocupacoes.Count > 0, ocupacoes);
        }).ToList();
    }

    // Rota 28a: por dia útil (alocados, livres e vagas faltantes nas equipes) e por instalador
    // (ocupação = dias úteis em equipes ÷ dias úteis do período, RN-10).
    public OcupacaoGanttBanco Ocupacao(DateOnly inicio, DateOnly fim)
    {
        using var conexao = Abrir();
        var instaladores = InstaladoresAtivos(conexao);
        var ativos = instaladores.Select(u => u.Id).ToHashSet();
        var vinculos = Vinculos(conexao, inicio, fim).Where(v => ativos.Contains(v.UsuarioId)).ToList();
        var programacoes = new List<(int Id, DateOnly Inicio, DateOnly Fim, int Previstas)>();
        using (var comando = Comando(conexao, """
            SELECT p.id, p.data_inicio, p.data_fim, e.pessoas_previstas
            FROM programacao_obra p JOIN equipe_temporal e ON e.id_programacao = p.id
            WHERE p.reserva_agenda AND p.data_inicio <= @fim AND p.data_fim >= @inicio
            """, ("inicio", inicio), ("fim", fim)))
        using (var leitor = comando.ExecuteReader())
            while (leitor.Read())
                programacoes.Add((leitor.GetInt32(0), leitor.GetFieldValue<DateOnly>(1),
                    leitor.GetFieldValue<DateOnly>(2), leitor.GetInt32(3)));

        var dias = new List<DateOnly>();
        for (var d = inicio; d <= fim; d = d.AddDays(1))
            if (Gantt.DiaUtil(d)) dias.Add(d);

        var porDia = dias.Select(d =>
        {
            var noDia = vinculos.Where(v => v.Entrada <= d && d <= v.Saida).ToList();
            var alocados = noDia.Select(v => v.UsuarioId).Distinct().Count();
            var faltantes = programacoes.Where(p => p.Inicio <= d && d <= p.Fim)
                .Sum(p => Math.Max(0, p.Previstas - noDia.Count(v => v.ProgramacaoId == p.Id)));
            return new OcupacaoDiaBanco(d, instaladores.Count, alocados, instaladores.Count - alocados, faltantes);
        }).ToList();

        var porInstalador = instaladores.Select(u =>
        {
            var proprios = vinculos.Where(v => v.UsuarioId == u.Id).ToList();
            var alocados = dias.Count(d => proprios.Any(v => v.Entrada <= d && d <= v.Saida));
            return new OcupacaoPorInstaladorBanco(u.Id, u.Nome, dias.Count, alocados,
                dias.Count == 0 ? 0 : (int)Math.Round(alocados * 100.0 / dias.Count));
        }).ToList();
        return new OcupacaoGanttBanco(porDia, porInstalador);
    }
}
