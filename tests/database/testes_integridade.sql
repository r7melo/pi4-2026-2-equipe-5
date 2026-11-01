\set ON_ERROR_STOP on
BEGIN;
SET CONSTRAINTS ALL IMMEDIATE;

-- Executar em banco descartável preparado com 01_schema.sql e 02_seed.sql.
-- O rollback preserva linhas/DDL, mas sequências podem avançar mesmo com rollback.
DO $$
BEGIN
    IF to_regclass('public.audit_log') IS NULL OR to_regclass('public.schema_migrations') IS NULL THEN
        RAISE EXCEPTION 'Integridade: schema incompleto (audit_log/schema_migrations)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.audit_log'::regclass
                   AND tgname = 'trg_audit_somente_insert' AND NOT tgisinternal) THEN
        RAISE EXCEPTION 'Integridade: trigger de auditoria append-only ausente';
    END IF;
    IF to_regclass('public.idx_audit_entidade') IS NULL THEN
        RAISE EXCEPTION 'Integridade: índice idx_audit_entidade ausente';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND NOT convalidated) THEN
        RAISE EXCEPTION 'Integridade: existem constraints não validadas';
    END IF;
END $$;

-- Inventário real: FKs, UNIQUEs, PKs e índices únicos que não pertencem a constraints.
-- Novos objetos sem caso de rejeição passam a causar falha, em vez de inflar a cobertura declarada.
CREATE TEMP TABLE inventario_integridade AS
SELECT r.relname::text AS tabela, c.conname::text AS nome,
       CASE c.contype WHEN 'f' THEN 'FK' WHEN 'u' THEN 'UNIQUE' ELSE 'PK' END AS tipo
FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
WHERE c.connamespace = 'public'::regnamespace AND c.contype IN ('f', 'u', 'p')
UNION ALL
SELECT r.relname::text, i.relname::text, 'INDICE_UNICO'
FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_class r ON r.oid = x.indrelid
WHERE r.relnamespace = 'public'::regnamespace AND x.indisunique
  AND NOT EXISTS (SELECT 1 FROM pg_constraint c WHERE c.conindid = x.indexrelid);
CREATE TEMP TABLE resultados_integridade (tabela text, nome text, PRIMARY KEY (tabela, nome));

CREATE FUNCTION pg_temp.deve_rejeitar(tabela_esperada text, restricao_esperada text, comando text, estado text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE estado_obtido text; restricao_obtida text; tabela_obtida text;
BEGIN
    BEGIN
        EXECUTE comando;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS estado_obtido = RETURNED_SQLSTATE,
            restricao_obtida = CONSTRAINT_NAME, tabela_obtida = TABLE_NAME;
        IF estado_obtido IS DISTINCT FROM estado OR restricao_obtida IS DISTINCT FROM restricao_esperada
           OR tabela_obtida IS DISTINCT FROM tabela_esperada THEN
            RAISE EXCEPTION '%.%: esperado % nessa restrição, recebido % em %.%',
                tabela_esperada, restricao_esperada, estado, estado_obtido, tabela_obtida, restricao_obtida;
        END IF;
        INSERT INTO resultados_integridade VALUES (tabela_esperada, restricao_esperada);
        RAISE NOTICE 'PASSOU: %.% rejeitou dado inválido (%)', tabela_esperada, restricao_esperada, estado;
        RETURN;
    END;
    RAISE EXCEPTION '%.%: dado inválido foi aceito (ou fixture sem linha-alvo)', tabela_esperada, restricao_esperada;
END $$;

-- 21 FKs. Conferir nome e tabela evita atribuir a rejeição a outra FK sobreposta.
SELECT pg_temp.deve_rejeitar('usuario', 'usuario_id_perfil_fkey',
    'UPDATE usuario SET id_perfil = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('usuario', 'usuario_id_equipe_fkey',
    'UPDATE usuario SET id_equipe = -1 WHERE id = 5', '23503');
-- A FK composta é adiada apenas dentro do subbloco revertido, isolando a FK direta.
SELECT pg_temp.deve_rejeitar('equipe', 'fk_equipe_responsavel_usuario',
    'SET CONSTRAINTS fk_equipe_responsavel_membro DEFERRED; UPDATE equipe SET id_responsavel = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('equipe', 'fk_equipe_responsavel_membro',
    'UPDATE equipe SET id_responsavel = 9 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('equipe_instalador', 'equipe_instalador_id_equipe_fkey',
    'INSERT INTO equipe_instalador VALUES (-1, 5)', '23503');
SELECT pg_temp.deve_rejeitar('equipe_instalador', 'equipe_instalador_id_usuario_fkey',
    'INSERT INTO equipe_instalador VALUES (1, -1)', '23503');
SELECT pg_temp.deve_rejeitar('obra', 'obra_id_cliente_fkey',
    'UPDATE obra SET id_cliente = -1 WHERE id = 301', '23503');
SELECT pg_temp.deve_rejeitar('pagamento', 'pagamento_id_obra_fkey',
    'UPDATE pagamento SET id_obra = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('material', 'material_id_obra_fkey',
    'UPDATE material SET id_obra = -1 WHERE id = 501', '23503');
SELECT pg_temp.deve_rejeitar('comentario', 'comentario_id_obra_fkey',
    'UPDATE comentario SET id_obra = -1 WHERE id = 701', '23503');
SELECT pg_temp.deve_rejeitar('comentario', 'comentario_id_usuario_fkey',
    'UPDATE comentario SET id_usuario = -1 WHERE id = 701', '23503');
SELECT pg_temp.deve_rejeitar('comentario', 'fk_comentario_manutencao',
    'UPDATE comentario SET id_manutencao = -1 WHERE id = 709', '23503');
SELECT pg_temp.deve_rejeitar('historico_obra', 'historico_obra_id_obra_fkey',
    'INSERT INTO historico_obra (tipo_acao, id_obra, id_usuario) VALUES (''Comentario'', -1, 1)', '23503');
SELECT pg_temp.deve_rejeitar('historico_obra', 'historico_obra_id_usuario_fkey',
    'INSERT INTO historico_obra (tipo_acao, id_obra, id_usuario) VALUES (''Comentario'', 301, -1)', '23503');
SELECT pg_temp.deve_rejeitar('programacao_obra', 'programacao_obra_id_obra_fkey',
    'UPDATE programacao_obra SET id_obra = -1 WHERE id = 601', '23503');
SELECT pg_temp.deve_rejeitar('programacao_obra', 'programacao_obra_id_equipe_fkey',
    'UPDATE programacao_obra SET id_equipe = -1 WHERE id = 601', '23503');
SELECT pg_temp.deve_rejeitar('relatorio_custo', 'relatorio_custo_id_obra_fkey',
    'UPDATE relatorio_custo SET id_obra = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('manutencao', 'manutencao_id_obra_fkey',
    'UPDATE manutencao SET id_obra = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('manutencao', 'manutencao_id_equipe_fkey',
    'UPDATE manutencao SET id_equipe = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('audit_log', 'audit_log_id_usuario_fkey',
    'INSERT INTO audit_log (id_usuario, acao, entidade) VALUES (-1, ''Teste'', ''obra'')', '23503');
SELECT pg_temp.deve_rejeitar('cronograma_compartilhado', 'cronograma_compartilhado_id_usuario_fkey',
    'INSERT INTO cronograma_compartilhado (token, data_inicio, data_fim, expira_em, id_usuario) VALUES (''fk-invalida'', CURRENT_DATE, CURRENT_DATE, now(), -1)', '23503');

-- Seis UNIQUEs e o índice funcional independente.
SELECT pg_temp.deve_rejeitar('perfil_acesso', 'perfil_acesso_nome_perfil_key',
    'UPDATE perfil_acesso SET nome_perfil = ''Administrador'' WHERE id = 2', '23505');
-- Isolar a UNIQUE original: o DROP é revertido pelo subbloco que captura a violação.
SELECT pg_temp.deve_rejeitar('usuario', 'usuario_email_key',
    'DROP INDEX idx_usuario_email_busca; UPDATE usuario SET email = ''admin@zl.com.br'' WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('usuario', 'idx_usuario_email_busca',
    'UPDATE usuario SET email = ''ADMIN@ZL.COM.BR'' WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('cliente', 'cliente_cpf_cnpj_key',
    'UPDATE cliente SET cpf_cnpj = ''12345678000195'' WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('pagamento', 'pagamento_id_obra_key',
    'UPDATE pagamento SET id_obra = 301 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('relatorio_custo', 'relatorio_custo_id_obra_key',
    'UPDATE relatorio_custo SET id_obra = 301 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('cronograma_compartilhado', 'cronograma_compartilhado_token_key',
    'INSERT INTO cronograma_compartilhado (token, data_inicio, data_fim, expira_em, id_usuario) VALUES (''seed-cronograma-2026-10'', CURRENT_DATE, CURRENT_DATE, now(), 1)', '23505');

-- Todas as 16 PKs, incluindo a chave composta de associação.
SELECT pg_temp.deve_rejeitar('schema_migrations', 'schema_migrations_pkey',
    'INSERT INTO schema_migrations (version, checksum) SELECT version, checksum FROM schema_migrations LIMIT 1', '23505');
SELECT pg_temp.deve_rejeitar('perfil_acesso', 'perfil_acesso_pkey',
    'UPDATE perfil_acesso SET id = 1 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('equipe', 'equipe_pkey',
    'UPDATE equipe SET id = 1 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('cliente', 'cliente_pkey',
    'UPDATE cliente SET id = 1 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('usuario', 'usuario_pkey',
    'UPDATE usuario SET id = 1 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('equipe_instalador', 'pk_equipe_instalador',
    'INSERT INTO equipe_instalador VALUES (1, 8)', '23505');
SELECT pg_temp.deve_rejeitar('obra', 'obra_pkey',
    'UPDATE obra SET id = 301 WHERE id = 302', '23505');
SELECT pg_temp.deve_rejeitar('pagamento', 'pagamento_pkey',
    'UPDATE pagamento SET id = 1 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('material', 'material_pkey',
    'UPDATE material SET id = 501 WHERE id = 502', '23505');
SELECT pg_temp.deve_rejeitar('comentario', 'comentario_pkey',
    'UPDATE comentario SET id = 701 WHERE id = 702', '23505');
SELECT pg_temp.deve_rejeitar('historico_obra', 'historico_obra_pkey',
    'INSERT INTO historico_obra (id, tipo_acao, id_obra, id_usuario) VALUES (9001, ''Comentario'', 301, 1)', '23505');
SELECT pg_temp.deve_rejeitar('programacao_obra', 'programacao_obra_pkey',
    'UPDATE programacao_obra SET id = 601 WHERE id = 602', '23505');
SELECT pg_temp.deve_rejeitar('relatorio_custo', 'relatorio_custo_pkey',
    'UPDATE relatorio_custo SET id = 1 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('manutencao', 'manutencao_pkey',
    'UPDATE manutencao SET id = 1 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('audit_log', 'audit_log_pkey',
    'INSERT INTO audit_log (id, acao, entidade) SELECT id, ''Teste'', ''obra'' FROM audit_log LIMIT 1', '23505');
SELECT pg_temp.deve_rejeitar('cronograma_compartilhado', 'cronograma_compartilhado_pkey',
    'INSERT INTO cronograma_compartilhado (id, token, data_inicio, data_fim, expira_em, id_usuario) SELECT id, ''pk-invalida'', CURRENT_DATE, CURRENT_DATE, now(), 1 FROM cronograma_compartilhado LIMIT 1', '23505');

DO $$
DECLARE faltantes text; inesperados text;
BEGIN
    SELECT string_agg(i.tabela || '.' || i.nome, ', ' ORDER BY i.tabela, i.nome) INTO faltantes
    FROM inventario_integridade i LEFT JOIN resultados_integridade r USING (tabela, nome)
    WHERE r.nome IS NULL;
    IF faltantes IS NOT NULL THEN RAISE EXCEPTION 'Restrições sem teste: %', faltantes; END IF;
    SELECT string_agg(r.tabela || '.' || r.nome, ', ') INTO inesperados
    FROM resultados_integridade r LEFT JOIN inventario_integridade i USING (tabela, nome)
    WHERE i.nome IS NULL;
    IF inesperados IS NOT NULL THEN RAISE EXCEPTION 'Testes fora do inventário: %', inesperados; END IF;
END $$;

SELECT i.tipo, count(*) AS objetos, count(r.nome) AS rejeicoes_confirmadas
FROM inventario_integridade i LEFT JOIN resultados_integridade r USING (tabela, nome)
GROUP BY i.tipo ORDER BY i.tipo;
SELECT 'PASSOU: inventário completo de FKs, UNIQUEs, PKs e índices únicos' AS resultado;
ROLLBACK;
