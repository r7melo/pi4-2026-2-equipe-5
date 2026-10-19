BEGIN;
SET CONSTRAINTS ALL IMMEDIATE;

DO $$
BEGIN
    IF to_regclass('public.audit_log') IS NULL THEN
        RAISE EXCEPTION 'Integridade: public.audit_log não existe';
    END IF;
    IF to_regclass('public.schema_migrations') IS NULL THEN
        RAISE EXCEPTION 'Integridade: public.schema_migrations não existe';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_somente_insert' AND NOT tgisinternal) THEN
        RAISE EXCEPTION 'Integridade: trigger de auditoria append-only ausente';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_entidade') THEN
        RAISE EXCEPTION 'Integridade: índice idx_audit_entidade ausente';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND NOT convalidated) THEN
        RAISE EXCEPTION 'Integridade: existem constraints não validadas';
    END IF;
END $$;

CREATE FUNCTION pg_temp.deve_rejeitar(nome text, comando text, estado text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE estado_obtido text;
BEGIN
    BEGIN
        EXECUTE comando;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS estado_obtido = RETURNED_SQLSTATE;
        IF estado_obtido <> estado THEN
            RAISE EXCEPTION '%: esperado %, recebido %', nome, estado, estado_obtido;
        END IF;
        RETURN;
    END;
    RAISE EXCEPTION '%: dado inválido foi aceito', nome;
END $$;

-- FKs
SELECT pg_temp.deve_rejeitar('usuario.id_perfil',
    'UPDATE usuario SET id_perfil = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('usuario.id_equipe',
    'UPDATE usuario SET id_equipe = -1 WHERE id = 5', '23503');
SELECT pg_temp.deve_rejeitar('equipe.id_responsavel',
    'UPDATE equipe SET id_responsavel = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('equipe.responsavel_membro',
    'UPDATE equipe SET id_responsavel = 9 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('equipe_instalador.id_equipe',
    'INSERT INTO equipe_instalador VALUES (-1, 5)', '23503');
SELECT pg_temp.deve_rejeitar('equipe_instalador.id_usuario',
    'INSERT INTO equipe_instalador VALUES (1, -1)', '23503');
SELECT pg_temp.deve_rejeitar('obra.id_cliente',
    'UPDATE obra SET id_cliente = -1 WHERE id = 301', '23503');
SELECT pg_temp.deve_rejeitar('pagamento.id_obra',
    'UPDATE pagamento SET id_obra = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('material.id_obra',
    'UPDATE material SET id_obra = -1 WHERE id = 501', '23503');
SELECT pg_temp.deve_rejeitar('comentario.id_obra',
    'UPDATE comentario SET id_obra = -1 WHERE id = 701', '23503');
SELECT pg_temp.deve_rejeitar('comentario.id_usuario',
    'UPDATE comentario SET id_usuario = -1 WHERE id = 701', '23503');
SELECT pg_temp.deve_rejeitar('comentario.id_manutencao',
    'UPDATE comentario SET id_manutencao = -1 WHERE id = 709', '23503');
SELECT pg_temp.deve_rejeitar('historico_obra.id_obra',
    'INSERT INTO historico_obra (tipo_acao, id_obra, id_usuario) VALUES (''Comentario'', -1, 1)', '23503');
SELECT pg_temp.deve_rejeitar('historico_obra.id_usuario',
    'INSERT INTO historico_obra (tipo_acao, id_obra, id_usuario) VALUES (''Comentario'', 301, -1)', '23503');
SELECT pg_temp.deve_rejeitar('programacao_obra.id_obra',
    'UPDATE programacao_obra SET id_obra = -1 WHERE id = 601', '23503');
SELECT pg_temp.deve_rejeitar('programacao_obra.id_equipe',
    'UPDATE programacao_obra SET id_equipe = -1 WHERE id = 601', '23503');
SELECT pg_temp.deve_rejeitar('relatorio_custo.id_obra',
    'UPDATE relatorio_custo SET id_obra = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('manutencao.id_obra',
    'UPDATE manutencao SET id_obra = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('manutencao.id_equipe',
    'UPDATE manutencao SET id_equipe = -1 WHERE id = 1', '23503');
SELECT pg_temp.deve_rejeitar('audit_log.id_usuario',
    'INSERT INTO audit_log (id_usuario, acao, entidade) VALUES (-1, ''Teste'', ''obra'')', '23503');
SELECT pg_temp.deve_rejeitar('cronograma_compartilhado.id_usuario',
    'INSERT INTO cronograma_compartilhado (token, data_inicio, data_fim, expira_em, id_usuario) VALUES (''fk-invalida'', CURRENT_DATE, CURRENT_DATE, now(), -1)', '23503');

-- UNIQUE
SELECT pg_temp.deve_rejeitar('perfil_acesso.nome_perfil',
    'UPDATE perfil_acesso SET nome_perfil = ''Administrador'' WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('usuario.email',
    'UPDATE usuario SET email = ''admin@zl.com.br'' WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('cliente.cpf_cnpj',
    'UPDATE cliente SET cpf_cnpj = ''12345678000195'' WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('pagamento.id_obra',
    'UPDATE pagamento SET id_obra = 301 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('relatorio_custo.id_obra',
    'UPDATE relatorio_custo SET id_obra = 301 WHERE id = 2', '23505');
SELECT pg_temp.deve_rejeitar('cronograma_compartilhado.token',
    'INSERT INTO cronograma_compartilhado (token, data_inicio, data_fim, expira_em, id_usuario) VALUES (''seed-cronograma-2026-10'', CURRENT_DATE, CURRENT_DATE, now(), 1)', '23505');

ROLLBACK;
