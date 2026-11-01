using Npgsql;

namespace Backend.Api;

public sealed record InstalacaoListaBanco(int ObraId, string ClienteNome, string Endereco, string Status,
    DateOnly DataInicio, DateOnly DataFim);
public sealed record KitInstalacaoBanco(string Tipo, int Quantidade);
public sealed record ProjetoInstalacaoBanco(string? Arquivo);
public sealed record InstalacaoDetalheBanco(int ObraId, string ClienteNome, string Endereco,
    List<KitInstalacaoBanco> Kit, ProjetoInstalacaoBanco Projeto, string? Instrucoes);

public sealed partial class BancoDados
{
    // A equipe deve vir do usuario autenticado, nunca de um parametro HTTP livre.
    public List<InstalacaoListaBanco> ListarInstalacoesEquipe(int equipeId)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, """
            SELECT o.id, c.nome, o.endereco, o.status::text, p.data_inicio, p.data_fim
            FROM programacao_obra p JOIN obra o ON o.id = p.id_obra JOIN cliente c ON c.id = o.id_cliente
            WHERE p.id_equipe = @equipe AND o.excluida_em IS NULL
            ORDER BY p.data_inicio, p.id
            """, ("equipe", equipeId));
        using var leitor = comando.ExecuteReader();
        var itens = new List<InstalacaoListaBanco>();
        while (leitor.Read()) itens.Add(new(leitor.GetInt32(0), leitor.GetString(1), leitor.GetString(2),
            leitor.GetString(3), leitor.GetFieldValue<DateOnly>(4), leitor.GetFieldValue<DateOnly>(5)));
        return itens;
    }

    public InstalacaoDetalheBanco? BuscarInstalacaoEquipe(int obraId, int equipeId)
    {
        using var conexao = Abrir();
        string nome, endereco;
        string? projeto, instrucoes;
        using (var comando = Comando(conexao, """
            SELECT o.id, c.nome, o.endereco, o.projeto_arquivo, o.instrucoes
            FROM obra o JOIN cliente c ON c.id = o.id_cliente
            WHERE o.id = @obra AND o.excluida_em IS NULL AND EXISTS
                (SELECT 1 FROM programacao_obra p WHERE p.id_obra = o.id AND p.id_equipe = @equipe)
            """, ("obra", obraId), ("equipe", equipeId)))
        using (var leitor = comando.ExecuteReader())
        {
            if (!leitor.Read()) return null;
            nome = leitor.GetString(1);
            endereco = leitor.GetString(2);
            projeto = leitor.IsDBNull(3) ? null : leitor.GetString(3);
            instrucoes = leitor.IsDBNull(4) ? null : leitor.GetString(4);
        }
        var kit = new List<KitInstalacaoBanco>();
        using (var comando = Comando(conexao, "SELECT tipo, quantidade FROM material WHERE id_obra = @obra ORDER BY id", ("obra", obraId)))
        using (var leitor = comando.ExecuteReader())
            while (leitor.Read()) kit.Add(new(leitor.GetString(0), leitor.GetInt32(1)));
        return new(obraId, nome, endereco, kit, new(projeto), instrucoes);
    }
}
