namespace Backend.Api;

public sealed partial class BancoDados
{
    public EquipeBanco CriarEquipe(string? nome, string? especialidade, int responsavelId,
        IReadOnlyCollection<int>? instaladoresIds)
    {
        var nomeLimpo = TextoCadastro(nome, 100, "nome", obrigatorio: true)!;
        var especialidadeLimpa = TextoCadastro(especialidade, 100, "especialidade");
        if (instaladoresIds is null || instaladoresIds.Count == 0 || instaladoresIds.Any(id => id <= 0)
            || instaladoresIds.Distinct().Count() != instaladoresIds.Count)
            throw ValidacaoCadastro("Informe ao menos um instalador, com IDs positivos e sem repeticoes.");
        var ids = instaladoresIds.Order().ToArray();
        if (responsavelId <= 0 || !ids.Contains(responsavelId))
            throw ValidacaoCadastro("O responsavel deve estar entre os instaladores da equipe.");

        using var conexao = Abrir();
        using var transacao = conexao.BeginTransaction();
        var membros = new List<AutorBanco>();
        // Todos os cadastros concorrentes bloqueiam os mesmos usuarios em ordem de ID.
        using (var buscar = Comando(conexao, transacao, """
            SELECT u.id, u.nome, u.ativo, p.nome_perfil::text, u.id_equipe
            FROM usuario u JOIN perfil_acesso p ON p.id = u.id_perfil
            WHERE u.id = ANY(@ids) ORDER BY u.id FOR UPDATE OF u
            """, ("ids", ids)))
        using (var leitor = buscar.ExecuteReader())
        {
            while (leitor.Read())
            {
                if (!leitor.GetBoolean(2) || leitor.GetString(3) != Perfis.Instalador)
                    throw ValidacaoCadastro($"Usuario {leitor.GetInt32(0)} deve ser um instalador ativo.");
                if (!leitor.IsDBNull(4))
                    throw new RegraVioladaException(409, "INSTALADOR_ALREADY_ASSIGNED", "Instalador ja pertence a outra equipe.");
                membros.Add(new AutorBanco(leitor.GetInt32(0), leitor.GetString(1)));
            }
        }
        if (membros.Count != ids.Length)
            throw new RegraVioladaException(404, "USUARIO_NOT_FOUND", "Um dos instaladores informados nao existe.");
        using (var vinculos = Comando(conexao, transacao,
            "SELECT 1 FROM equipe_instalador WHERE id_usuario = ANY(@ids) LIMIT 1", ("ids", ids)))
            if (vinculos.ExecuteScalar() is not null)
                throw new RegraVioladaException(409, "INSTALADOR_ALREADY_ASSIGNED", "Instalador ja possui vinculo com outra equipe.");

        using var inserirEquipe = Comando(conexao, transacao, """
            INSERT INTO equipe (nome, especialidade, id_responsavel)
            VALUES (@nome, @especialidade, @responsavel) RETURNING id
            """, ("nome", nomeLimpo), ("especialidade", especialidadeLimpa), ("responsavel", responsavelId));
        var equipeId = (int)inserirEquipe.ExecuteScalar()!;
        using var vincular = Comando(conexao, transacao, """
            INSERT INTO equipe_instalador (id_equipe, id_usuario)
            SELECT @equipe, id FROM unnest(@usuarios::int[]) AS id
            """, ("equipe", equipeId), ("usuarios", ids));
        vincular.ExecuteNonQuery();
        using var atualizar = Comando(conexao, transacao,
            "UPDATE usuario SET id_equipe = @equipe WHERE id = ANY(@usuarios)", ("equipe", equipeId), ("usuarios", ids));
        atualizar.ExecuteNonQuery();
        transacao.Commit();
        return new EquipeBanco(equipeId, nomeLimpo, especialidadeLimpa,
            membros.Single(membro => membro.Id == responsavelId), membros, null);
    }
}
