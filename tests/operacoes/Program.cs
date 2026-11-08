using System.Text.Json;
using Backend.Api;
using Npgsql;

var admin = Environment.GetEnvironmentVariable("OPERACOES_TEST_ADMIN_CONNECTION")
    ?? throw new InvalidOperationException("Defina OPERACOES_TEST_ADMIN_CONNECTION para PostgreSQL de testes com CREATE DATABASE.");
var schema = await File.ReadAllTextAsync("database/01_schema.sql");
var seed = await File.ReadAllTextAsync("database/02_seed.sql");
int passou = 0, falhou = 0;

await Caso("Custos nulos, atualizacao parcial, zero explicito e total gerado", async (cs, db) =>
{
    await Sql(cs, "DELETE FROM relatorio_custo WHERE id_obra = 307");
    var vazio = db.BuscarCustosObra(307)!;
    Check(vazio.CustoMaoObra is null && vazio.CustoInsumos is null && !vazio.PrecificacaoCompleta, "Ausencia foi convertida em zero.");
    var parcial = db.AtualizarCustosObra(307, 10000, null, 30000, 3)!;
    Check(parcial.CustoMaoObra == 10000 && parcial.CustoInsumos is null && !parcial.PrecificacaoCompleta, "Patch inventou precificacao.");
    Regra(() => db.BuscarDreObra(307), 400, "VALIDATION_ERROR");
    var completo = db.AtualizarCustosObra(307, null, 4500, null, 3)!;
    Check(completo.ValorObra == 30000 && completo.CustoMaoObra == 10000 && completo.PrecificacaoCompleta, "Campos omitidos nao foram preservados.");
    var dre = db.BuscarDreObra(307)!;
    Check(dre.CustoTotal == 14500 && dre.Resultado == 15500, "DRE aritmetico incorreto.");
    var relatorio = db.BuscarRelatorioCusto(307)!;
    Check(relatorio.CustoTotal == 14500 && relatorio.BalancoMateriais.Count == 1, "Relatorio/balanco incompleto.");
    Check(await Scalar<decimal>(cs, "SELECT custo_total FROM relatorio_custo WHERE id_obra=307") == 14500, "Total nao gerado no banco.");
    Check(db.AtualizarCustosObra(307, 0, null, 0, 3)!.CustoMaoObra == 0, "Zero foi tratado como omissao.");
    Check(await Scalar<long>(cs, "SELECT count(*) FROM historico_obra WHERE tipo_acao='AlteracaoFinanceira' AND id_obra=307") == 3, "Historico financeiro incorreto.");
    Check(await Scalar<long>(cs, "SELECT count(*) FROM audit_log WHERE acao='AlteracaoFinanceira' AND entidade_id=307") == 3, "Auditoria financeira incorreta.");
});

await Caso("Apuracao recusa obra aberta, nulos e ausentes; valores decimais exatos", async (cs, db) =>
{
    Regra(() => db.BuscarDreObra(301), 400, "VALIDATION_ERROR");
    Regra(() => db.BuscarRelatorioCusto(301), 400, "VALIDATION_ERROR");
    foreach (var coluna in new[] { "custo_mao_obra", "custo_insumos", "valor_obra" })
    {
        await Sql(cs, "UPDATE relatorio_custo SET custo_mao_obra=10, custo_insumos=20, valor_obra=50 WHERE id_obra=307");
        await Sql(cs, $"UPDATE relatorio_custo SET {coluna}=NULL WHERE id_obra=307");
        Check(!db.BuscarCustosObra(307)!.PrecificacaoCompleta, "Nulo foi considerado precificado.");
        Regra(() => db.BuscarDreObra(307), 400, "VALIDATION_ERROR");
    }
    db.AtualizarCustosObra(307, 0.1m, 0.2m, 0.5m, 3);
    Check(db.BuscarDreObra(307)!.Resultado == 0.2m, "Calculo perdeu precisao decimal.");
    db.AtualizarCustosObra(307, 50, 50, 10, 3);
    Check(db.BuscarDreObra(307)!.Resultado == -90, "Prejuizo foi bloqueado/alterado.");
    Check(db.BuscarCustosObra(999999) is null && db.BuscarDreObra(999999) is null && db.BuscarRelatorioCusto(999999) is null, "Ausente nao retorna null.");
});

await Caso("Validacao monetaria e exclusao logica nao gravam efeitos", async (cs, db) =>
{
    var antes = await Snapshot(cs);
    foreach (var valor in new[] { -0.01m, 10000000000m, 0.001m })
        Regra(() => db.AtualizarCustosObra(307, valor, null, null, 3), 400, "VALIDATION_ERROR");
    Regra(() => db.AtualizarCustosObra(307, 9999999999.99m, 0.01m, null, 3), 400, "VALIDATION_ERROR");
    Check(antes == await Snapshot(cs), "Valor invalido deixou efeitos.");
    db.AtualizarCustosObra(307, 9999999999.99m, 0, 0, 3);
    Check(db.BuscarDreObra(307)!.CustoTotal == 9999999999.99m, "Limite valido foi rejeitado.");
    await Sql(cs, "UPDATE obra SET excluida_em=now() WHERE id=307");
    antes = await Snapshot(cs);
    Check(db.BuscarCustosObra(307) is null && db.BuscarDreObra(307) is null && db.BuscarRelatorioCusto(307) is null, "Obra excluida foi exposta.");
    Check(db.AtualizarCustosObra(307, 1, 2, 3, 3) is null, "Obra excluida foi alterada.");
    Check(antes == await Snapshot(cs), "Tentativa em obra excluida deixou efeitos.");
});

await Caso("Falha na auditoria reverte custos e historico", async (cs, db) =>
{
    var antes = await Snapshot(cs);
    await FalharAudit(cs);
    FalhaPg(() => db.AtualizarCustosObra(307, 10, 20, 50, 3));
    Check(antes == await Snapshot(cs), "Falha de auditoria deixou custos/historico parcial.");
});

await Caso("Instalacoes: equipe, kit sem custos, projeto/instrucoes e exclusao", async (cs, db) =>
{
    await Sql(cs, "UPDATE obra SET projeto_arquivo='projeto-301.pdf', instrucoes='Fixar estrutura antes dos paineis.' WHERE id=301");
    var lista = db.ListarInstalacoesEquipe(1);
    Check(lista.Count == 3 && lista.All(i => i.ObraId is 301 or 302 or 309), "Lista vazou outra equipe.");
    var item = db.BuscarInstalacaoEquipe(301, 1)!;
    Check(item.Projeto.Arquivo == "projeto-301.pdf" && item.Instrucoes!.StartsWith("Fixar") && item.Kit.Count == 3, "Detalhe incompleto.");
    var json = JsonSerializer.Serialize(item);
    Check(!json.Contains("Custo") && !json.Contains("Senha") && !json.Contains("Email") && !json.Contains("ValorObra"), "Detalhe de instalacao expoe dados sensiveis.");
    Check(typeof(KitInstalacaoBanco).GetProperties().Select(p => p.Name).Order().SequenceEqual(new[] { "Quantidade", "Tipo" }), "Kit inclui campos financeiros.");
    Check(db.BuscarInstalacaoEquipe(301, 2) is null && db.BuscarInstalacaoEquipe(999999, 1) is null, "Detalhe de outra equipe/ausente foi exposto.");
    Check(db.ListarInstalacoesEquipe(999999).Count == 0, "Equipe inexistente nao retorna lista vazia.");
    await Sql(cs, "UPDATE obra SET excluida_em=now() WHERE id=301");
    Check(db.BuscarInstalacaoEquipe(301, 1) is null && db.ListarInstalacoesEquipe(1).All(i => i.ObraId != 301), "Instalacao excluida foi exposta.");
});

await Caso("Manutencoes: filtro, equipe e dados invalidos sem efeitos", async (cs, db) =>
{
    Check(db.ListarManutencoesEquipe(7).Single().Id == 1 && db.ListarManutencoesEquipe(7, "Concluida").Count == 0, "Filtro de manutencao incorreto.");
    Check(db.BuscarManutencaoEquipe(1, 10) is null && db.BuscarManutencaoEquipe(999999, 7) is null, "Consulta vazou manutencao.");
    Regra(() => db.ListarManutencoesEquipe(7, "Pendente' OR '1'='1"), 400, "INVALID_PARAMETER");
    var antes = await Snapshot(cs);
    foreach (var texto in new string?[] { null, "", "  ", "texto\0oculto" })
    {
        Regra(() => db.ConcluirManutencao(1, texto, 7, 14), 400, "VALIDATION_ERROR");
        Regra(() => db.CriarComentarioManutencao(1, texto, 7, 14), 400, "VALIDATION_ERROR");
    }
    Regra(() => db.ConcluirManutencao(1, "Feito", 1, 8), 403, "ACCESS_DENIED");
    Regra(() => db.ConcluirManutencao(1, "Feito", 7, 8), 403, "ACCESS_DENIED");
    Regra(() => db.ConcluirManutencao(1, "Feito", 7, 1), 403, "ACCESS_DENIED");
    Regra(() => db.ConcluirManutencao(999999, "Feito", 7, 14), 404, "MANUTENCAO_NOT_FOUND");
    Regra(() => db.CriarComentarioManutencao(1, "Feito", 10, 17), 403, "ACCESS_DENIED");
    Check(antes == await Snapshot(cs), "Tentativa invalida deixou efeitos.");
    await Sql(cs, "UPDATE usuario SET ativo=FALSE WHERE id=14");
    Regra(() => db.ConcluirManutencao(1, "Feito", 7, 14), 403, "ACCESS_DENIED");
    await Sql(cs, "BEGIN; UPDATE usuario SET ativo=TRUE WHERE id=14; INSERT INTO equipe_instalador VALUES(7,17); UPDATE equipe SET id_responsavel=17 WHERE id=7; DELETE FROM equipe_instalador WHERE id_usuario=14 AND id_equipe=7; COMMIT");
    Regra(() => db.ConcluirManutencao(1, "Feito", 7, 14), 403, "ACCESS_DENIED");
});

await Caso("Conclusao sem comentario, servico persistido e repeticao sem duplicidade", async (cs, db) =>
{
    var comentarios = await Scalar<long>(cs, "SELECT count(*) FROM comentario");
    var feito = db.ConcluirManutencao(1, "  Disjuntor substituido.  ", 7, 14);
    Check(feito.Status == "Concluida" && feito.DataConclusao.Kind == DateTimeKind.Utc, "Conclusao sem timestamp UTC.");
    Check(await Scalar<string>(cs, "SELECT observacao FROM historico_obra WHERE tipo_acao='ManutencaoConcluida' AND id_obra=308") == "Disjuntor substituido.", "Servico executado nao persistido.");
    Check(comentarios == await Scalar<long>(cs, "SELECT count(*) FROM comentario"), "Conclusao exigiu/criou comentario automaticamente.");
    var antes = await Snapshot(cs);
    Regra(() => db.ConcluirManutencao(1, "Novamente", 7, 14), 400, "VALIDATION_ERROR");
    Check(antes == await Snapshot(cs), "Repeticao duplicou efeitos.");
    var comentario = db.CriarComentarioManutencao(1, "D'Avila; SELECT 1; --", 7, 14);
    Check(comentario.Tipo == "Manutencao" && comentario.Usuario.Id == 14 && comentario.Descricao == "D'Avila; SELECT 1; --", "Comentario incorreto.");
    Check(await Scalar<int>(cs, $"SELECT id_manutencao FROM comentario WHERE id={comentario.Id}") == 1, "Comentario nao vinculado a manutencao.");
    Check(await Scalar<long>(cs, "SELECT count(*) FROM audit_log WHERE acao IN('ConcluirManutencao','ComentarManutencao')") == 2, "Auditoria ausente.");
});

await Caso("Falhas na auditoria revertem conclusao e comentario de manutencao", async (cs, db) =>
{
    var antes = await Snapshot(cs);
    await FalharAudit(cs);
    FalhaPg(() => db.ConcluirManutencao(1, "Servico executado", 7, 14));
    Check(antes == await Snapshot(cs), "Conclusao parcial permaneceu.");
    FalhaPg(() => db.CriarComentarioManutencao(1, "Comentario de teste", 7, 14));
    Check(antes == await Snapshot(cs), "Comentario/historico parcial permaneceu.");
});

await Caso("Conclusoes concorrentes geram um unico efeito e obra excluida fica oculta", async (cs, db) =>
{
    using var barrier = new Barrier(2);
    var resultados = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => Task.Run(() =>
    {
        if (!barrier.SignalAndWait(TimeSpan.FromSeconds(15))) throw new InvalidOperationException("Barreira expirou.");
        try { db.ConcluirManutencao(1, "Servico", 7, 14); return "concluiu"; }
        catch (RegraVioladaException e) when (e.Status == 400 && e.Code == "VALIDATION_ERROR") { return "repetiu"; }
    })));
    Check(resultados.Order().SequenceEqual(new[] { "concluiu", "repetiu" }), "Concorrencia duplicou conclusao.");
    Check(await Scalar<long>(cs, "SELECT count(*) FROM historico_obra WHERE tipo_acao='ManutencaoConcluida' AND id_obra=308") == 1, "Historico duplicado.");
    await Sql(cs, "UPDATE obra SET excluida_em=now() WHERE id=308");
    Check(db.ListarManutencoesEquipe(7).Count == 0 && db.BuscarManutencaoEquipe(1, 7) is null, "Manutencao de obra excluida foi exposta.");
    Regra(() => db.CriarComentarioManutencao(1, "Teste", 7, 14), 404, "MANUTENCAO_NOT_FOUND");
});

Console.WriteLine($"Resultado: {passou} casos aprovados; {falhou} reprovados.");
Environment.ExitCode = falhou == 0 ? 0 : 1;

async Task Caso(string nome, Func<string, BancoDados, Task> teste)
{
    try
    {
        var banco = "pi4_operacoes_" + Guid.NewGuid().ToString("N");
        var cs = new NpgsqlConnectionStringBuilder(admin) { Database = banco }.ConnectionString;
        await Sql(admin, $"CREATE DATABASE \"{banco}\"");
        try { await Sql(cs, schema); await Sql(cs, seed); await teste(cs, new(cs)); }
        finally { NpgsqlConnection.ClearAllPools(); await Sql(admin, $"DROP DATABASE \"{banco}\" WITH (FORCE)"); }
        passou++; Console.WriteLine("PASSOU: " + nome);
    }
    catch (Exception e) { falhou++; Console.WriteLine($"FALHOU: {nome}: {e}"); }
}
static async Task Sql(string cs, string sql) { await using var c = new NpgsqlConnection(cs); await c.OpenAsync(); await using var cmd = new NpgsqlCommand(sql, c); await cmd.ExecuteNonQueryAsync(); }
static async Task<T> Scalar<T>(string cs, string sql) { await using var c = new NpgsqlConnection(cs); await c.OpenAsync(); await using var cmd = new NpgsqlCommand(sql, c); return (T)(await cmd.ExecuteScalarAsync())!; }
static Task<string> Snapshot(string cs) => Scalar<string>(cs, "SELECT jsonb_build_object('custos',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM relatorio_custo t),'historico',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM historico_obra t),'audit',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM audit_log t),'manutencao',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM manutencao t),'comentario',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM comentario t))::text");
static Task FalharAudit(string cs) => Sql(cs, "CREATE FUNCTION rejeitar_audit_teste() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Falha injetada'; END; $$; CREATE TRIGGER rejeitar_audit_teste BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION rejeitar_audit_teste()");
static void Check(bool ok, string msg) { if (!ok) throw new InvalidOperationException(msg); }
static void Regra(Action acao, int status, string codigo) { try { acao(); } catch (RegraVioladaException e) when (e.Status == status && e.Code == codigo) { return; } throw new InvalidOperationException($"Esperado {status} {codigo}."); }
static void FalhaPg(Action acao) { try { acao(); } catch (PostgresException e) when (e.SqlState == "P0001") { return; } throw new InvalidOperationException("Falha PostgreSQL esperada."); }
