using System.Text.RegularExpressions;
using Npgsql;

namespace Backend.Api;

public sealed record ClienteCadastroBanco(int Id, string Nome, string CpfCnpj, string? Cidade,
    string? Endereco, string? Telefone, string? Email);
public sealed record ListaClientesBanco(int Page, int PageSize, long Total, List<ClienteCadastroBanco> Itens);

public sealed partial class BancoDados
{
    const string ColunasCliente = "id, nome, cpf_cnpj, cidade, endereco, telefone, email";

    public ClienteCadastroBanco? BuscarCliente(int id)
    {
        using var conexao = Abrir();
        using var comando = Comando(conexao, "SELECT " + ColunasCliente + " FROM cliente WHERE id = @id", ("id", id));
        using var leitor = comando.ExecuteReader();
        return leitor.Read() ? LerClienteCadastro(leitor) : null;
    }

    public ListaClientesBanco ListarClientes(string? nome = null, int page = 1, int pageSize = 20)
    {
        if (page < 1 || pageSize < 1)
            throw new RegraVioladaException(400, "INVALID_PARAMETER", "page e pageSize devem ser maiores ou iguais a 1.");
        if (nome?.Contains('\0') == true)
            throw ValidacaoCadastro("nome nao pode conter caractere nulo.");
        var termo = string.IsNullOrWhiteSpace(nome) ? null : $"%{EscaparLike(nome.Trim())}%";
        var filtro = termo is null ? "" : " WHERE nome ILIKE @nome ESCAPE '\\'";
        using var conexao = Abrir();
        using var contar = Comando(conexao, "SELECT count(*) FROM cliente" + filtro, ("nome", termo));
        var total = (long)contar.ExecuteScalar()!;
        using var comando = Comando(conexao, "SELECT " + ColunasCliente + " FROM cliente" + filtro
            + " ORDER BY id LIMIT @limite OFFSET @offset", ("nome", termo), ("limite", pageSize),
            ("offset", (long)(page - 1) * pageSize));
        using var leitor = comando.ExecuteReader();
        var itens = new List<ClienteCadastroBanco>();
        while (leitor.Read()) itens.Add(LerClienteCadastro(leitor));
        return new ListaClientesBanco(page, pageSize, total, itens);
    }

    public ClienteCadastroBanco CriarCliente(ClienteNovoBanco? entrada)
    {
        if (entrada is null) throw ValidacaoCadastro("Informe os dados do cliente.");
        var nome = TextoCadastro(entrada.Nome, 200, "nome", obrigatorio: true)!;
        var documento = Regex.Replace(entrada.CpfCnpj ?? "", "[.\\-/ ]", "");
        if (!Validacoes.CpfCnpjValido(documento))
            throw ValidacaoCadastro("CPF/CNPJ invalido: informe os digitos verificadores corretos.");
        var cidade = TextoCadastro(entrada.Cidade, 100, "cidade");
        var endereco = TextoCadastro(entrada.Endereco, 255, "endereco");
        var telefone = TextoCadastro(entrada.Telefone, 30, "telefone");
        var email = TextoCadastro(entrada.Email, 200, "email");
        if (email is not null && !Validacoes.EmailValido(email))
            throw ValidacaoCadastro("Informe um e-mail valido.");
        var contrato = TextoCadastro(entrada.DadosContrato, null, "dadosContrato");
        try
        {
            using var conexao = Abrir();
            using var comando = Comando(conexao, """
                INSERT INTO cliente (nome, cpf_cnpj, cidade, endereco, telefone, email, dados_contrato)
                VALUES (@nome, @documento, @cidade, @endereco, @telefone, @email, @contrato)
                RETURNING id, nome, cpf_cnpj, cidade, endereco, telefone, email
                """, ("nome", nome), ("documento", documento), ("cidade", cidade), ("endereco", endereco),
                ("telefone", telefone), ("email", email), ("contrato", contrato));
            using var leitor = comando.ExecuteReader();
            leitor.Read();
            return LerClienteCadastro(leitor);
        }
        catch (PostgresException erro) when (erro.SqlState == PostgresErrorCodes.UniqueViolation
            && erro.ConstraintName == "cliente_cpf_cnpj_key")
        {
            throw new RegraVioladaException(409, "CPF_CNPJ_ALREADY_EXISTS", "CPF/CNPJ ja cadastrado para outro cliente.");
        }
    }

    static ClienteCadastroBanco LerClienteCadastro(NpgsqlDataReader leitor) => new(
        leitor.GetInt32(0), leitor.GetString(1), leitor.GetString(2),
        leitor.IsDBNull(3) ? null : leitor.GetString(3), leitor.IsDBNull(4) ? null : leitor.GetString(4),
        leitor.IsDBNull(5) ? null : leitor.GetString(5), leitor.IsDBNull(6) ? null : leitor.GetString(6));

    static string? TextoCadastro(string? valor, int? limite, string campo, bool obrigatorio = false)
    {
        if (valor?.Contains('\0') == true) throw ValidacaoCadastro($"{campo} nao pode conter caractere nulo.");
        var texto = string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();
        if ((obrigatorio && texto is null) || (limite is int maximo && texto?.Length > maximo))
            throw ValidacaoCadastro($"{campo} obrigatorio quando indicado e limitado a {limite} caracteres.");
        return texto;
    }

    static RegraVioladaException ValidacaoCadastro(string mensagem) => new(400, "VALIDATION_ERROR", mensagem);
}
