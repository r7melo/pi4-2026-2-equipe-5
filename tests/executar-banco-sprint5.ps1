# PostgreSQL isolado, sem portas e sem acesso ao Compose da equipe.
$ErrorActionPreference = 'Stop'
$repoSprint5 = Split-Path -Parent $PSScriptRoot
$sufixoSprint5 = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$bancoSprint5 = "pi4-banco-s5-$sufixoSprint5"
$senhaSprint5 = [Guid]::NewGuid().ToString('N')
$criadoSprint5 = $false

function Invoke-DockerSprint5 {
    param([string[]]$Argumentos)
    & docker @Argumentos
    if ($LASTEXITCODE -ne 0) { throw "Docker falhou (codigo $LASTEXITCODE)." }
}

try {
    Invoke-DockerSprint5 -Argumentos @('run', '--detach', '--name', $bancoSprint5,
        '--network', 'none', '--env', "POSTGRES_PASSWORD=$senhaSprint5",
        '--mount', "type=bind,source=$repoSprint5,target=/source,readonly", 'postgres:16') | Out-Null
    $criadoSprint5 = $true
    $prontoSprint5 = $false
    for ($tentativaSprint5 = 0; $tentativaSprint5 -lt 30; $tentativaSprint5++) {
        & docker exec $bancoSprint5 pg_isready -h 127.0.0.1 -U postgres *> $null
        if ($LASTEXITCODE -eq 0) { $prontoSprint5 = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $prontoSprint5) { throw 'PostgreSQL de teste nao iniciou em 30 segundos.' }

    $comandosSprint5 = @'
psql_s5() { psql -X -q -U postgres -v ON_ERROR_STOP=1 "$@"; }
migracao_s5() { psql_s5 -1 -d "$1" -f "/source/database/migrations/$2"; }

createdb -U postgres legado
psql_s5 -d legado -f /source/database/01_schema.sql -f /source/database/02_seed.sql >/dev/null
PGOPTIONS='-c client_min_messages=warning' psql_s5 -d legado -f /source/tests/database/testes_integridade.sql >/dev/null
echo 'PASSOU: inventario de 44 chaves e indices unicos no banco legado.'

inicio_restore=$(date +%s)
pg_dump -U postgres -Fc legado -f /tmp/legado.dump
createdb -U postgres atualizado
pg_restore -U postgres --exit-on-error -d atualizado /tmp/legado.dump
for base in legado atualizado; do
    pg_dump -U postgres --no-owner --no-privileges "$base" -f "/tmp/$base.sql"
    sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' "/tmp/$base.sql" > "/tmp/$base.normalizado"
done
cmp -s /tmp/legado.normalizado /tmp/atualizado.normalizado
echo "PASSOU: dump, restore e comparacao dos dados e sequencias ($(( $(date +%s) - inicio_restore )) s)."

fase_enum=20261122_01_status_em_solicitacao.sql
fase_catalogo=20261122_02_catalogo_produtos.sql
migracao_s5 atualizado "$fase_enum"
# Outra conexão confirma que a primeira fase foi concluída separadamente.
test "$(psql_s5 -At -d atualizado -c "SELECT 'EmSolicitacao'::public.status_logistico_enum")" = EmSolicitacao
test "$(psql_s5 -At -d atualizado -c "SELECT to_regclass('public.produto') IS NULL")" = t
migracao_s5 atualizado "$fase_catalogo"

createdb -U postgres novo
psql_s5 -d novo -f /source/database/01_schema.sql
migracao_s5 novo "$fase_enum"
migracao_s5 novo "$fase_catalogo"
psql_s5 -d novo -f /source/database/02_seed.sql >/dev/null

for base in novo atualizado; do
    pg_dump -U postgres --schema-only --no-owner --no-privileges "$base" -f "/tmp/$base.schema.sql"
    sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' "/tmp/$base.schema.sql" > "/tmp/$base.schema"
    psql_s5 -d "$base" -f /source/tests/database/testes_catalogo_sprint5.sql
done
cmp -s /tmp/novo.schema /tmp/atualizado.schema
echo 'PASSOU: schema novo e atualizado equivalentes; testes do catalogo passaram nos dois caminhos.'

for base in legado atualizado; do
    psql_s5 -At -d "$base" -c 'COPY (SELECT id,tipo,quantidade,quantidade_utilizada,custo_unitario,status_logistico,id_obra FROM public.material ORDER BY id) TO STDOUT' > "/tmp/$base.materiais"
done
cmp -s /tmp/legado.materiais /tmp/atualizado.materiais
psql_s5 -d atualizado -P pager=off -c 'SELECT count(*) AS materiais_legados, count(*) FILTER (WHERE id_produto IS NULL) AS sem_produto, count(*) FILTER (WHERE status_logistico IS NULL) AS status_nulos FROM public.material'
echo 'PASSOU: dados dos materiais legados preservados.'

fase_corte=20261122_03_materiais_corte.sql
if migracao_s5 atualizado "$fase_corte" >/tmp/corte.log 2>&1; then
    echo 'ERRO: corte permitiu materiais sem mapeamento.' >&2
    exit 1
fi
grep -q 'Existem materiais sem produto ou status' /tmp/corte.log
test "$(psql_s5 -At -d atualizado -c "SELECT count(*) FROM public.material WHERE id_produto IS NULL")" = 15
for base in novo atualizado; do
    psql_s5 -1 -d "$base" -f /source/database/04_catalogo_demonstracao.sql
    migracao_s5 "$base" "$fase_corte"
    migracao_s5 "$base" 20261122_04_equipes_temporais.sql
    migracao_s5 "$base" 20261122_05_redefinicao_senha.sql
    pg_dump -U postgres --schema-only --no-owner --no-privileges "$base" -f "/tmp/$base.schema.sql"
    sed -e '/^\\restrict /d' -e '/^\\unrestrict /d' "/tmp/$base.schema.sql" > "/tmp/$base.schema"
    psql_s5 -d "$base" -f /source/tests/database/testes_banco_sprint5.sql
done
cmp -s /tmp/novo.schema /tmp/atualizado.schema
psql_s5 -At -d atualizado -c 'COPY (SELECT id,tipo,quantidade,quantidade_utilizada,custo_unitario,status_logistico,id_obra FROM public.material ORDER BY id) TO STDOUT' >/tmp/atualizado.materiais
cmp -s /tmp/legado.materiais /tmp/atualizado.materiais
echo 'PASSOU: corte protegido, materiais reconciliados, equipes, senha e schemas finais equivalentes.'

psql_s5 -d atualizado <<'SQL'
BEGIN;
INSERT INTO public.programacao_obra (id, data_inicio, data_fim, id_obra) VALUES
    (9001, '2030-04-01', '2030-04-04', 301), (9002, '2030-04-02', '2030-04-05', 302);
INSERT INTO public.equipe_temporal (id, id_programacao, pessoas_previstas) VALUES
    (9001, 9001, 1), (9002, 9002, 1);
INSERT INTO public.token_redefinicao_senha (token_hash, id_usuario, versao_credencial)
    VALUES (decode(repeat('44', 32), 'hex'), 8, 0);
COMMIT;
SQL

disputar_s5() {
    caso=$1 primeiro=$2 segundo=$3
    {
        printf '%s\n' 'BEGIN;' "$primeiro"
        printf '%s\n' "\\! touch /tmp/$caso.pronto" "\\! for i in \$(seq 1 100); do [ ! -f /tmp/$caso.liberar ] || break; sleep 0.1; done"
        printf '%s\n' 'COMMIT;'
    } >/tmp/primeiro.sql
    psql_s5 -At -d atualizado -f /tmp/primeiro.sql >/tmp/primeiro.log 2>&1 &
    pid_primeiro=$!
    for i in $(seq 1 50); do
        [ ! -f "/tmp/$caso.pronto" ] || break
        sleep 0.1
    done
    test -f "/tmp/$caso.pronto"

    PGAPPNAME="s5_$caso" psql_s5 -At -d atualizado -v VERBOSITY=verbose -c "$segundo" >/tmp/segundo.log 2>&1 &
    pid_segundo=$!
    aguardou=f
    for i in $(seq 1 50); do
        aguardou=$(psql_s5 -At -d atualizado -c "SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE application_name = 's5_$caso' AND wait_event_type = 'Lock')")
        [ "$aguardou" != t ] || break
        sleep 0.1
    done
    touch "/tmp/$caso.liberar"
    wait "$pid_primeiro"
    status_segundo=0
    wait "$pid_segundo" || status_segundo=$?
    test "$aguardou" = t
}

disputar_s5 equipe 'INSERT INTO public.equipe_integrante (id_equipe, id_usuario) VALUES (9001, 8);' \
    'INSERT INTO public.equipe_integrante (id_equipe, id_usuario) VALUES (9002, 8);'
test "$status_segundo" != 0
grep -q '23P01.*ex_instalador_periodo' /tmp/segundo.log
test "$(psql_s5 -At -d atualizado -c 'SELECT count(*) FROM public.equipe_integrante WHERE id_equipe IN (9001,9002)')" = 1
echo 'PASSOU: alocacoes concorrentes do mesmo instalador resultaram em uma unica reserva.'

consumo="SELECT COALESCE(public.consumir_token_redefinicao(decode(repeat('44', 32), 'hex'))::text, 'invalido');"
disputar_s5 token "$consumo" "$consumo"
test "$status_segundo" = 0
grep -qx '8' /tmp/primeiro.log
grep -qx 'invalido' /tmp/segundo.log
echo 'PASSOU: duas conexoes tentaram consumir o mesmo token; apenas a primeira conseguiu.'
'@
    Invoke-DockerSprint5 -Argumentos @('exec', $bancoSprint5, 'sh', '-ec', $comandosSprint5.Replace("`r", ''))
}
finally {
    if ($criadoSprint5) {
        Invoke-DockerSprint5 -Argumentos @('rm', '--force', '--volumes', $bancoSprint5) | Out-Null
    }
}
