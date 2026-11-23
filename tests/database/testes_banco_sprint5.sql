\set ON_ERROR_STOP on

BEGIN;

DO $testes$
DECLARE
    produto_teste INT;
    material_teste INT;
    programacao_a INT;
    programacao_b INT;
    equipe_a INT;
    equipe_b INT;
    versao_atual BIGINT;
    restricao TEXT;
    token_valido BYTEA := decode(repeat('11', 32), 'hex');
    token_expirado BYTEA := decode(repeat('22', 32), 'hex');
    token_revogado BYTEA := decode(repeat('33', 32), 'hex');
BEGIN
    IF (SELECT count(*) FROM public.produto) <> 7 OR
       (SELECT count(*) FROM public.material WHERE id_produto IS NOT NULL) <> 15 THEN
        RAISE EXCEPTION 'Conversão dos materiais incompleta';
    END IF;

    INSERT INTO public.produto (nome, tipo, unidade, preco_unitario)
    VALUES ('Material teste', 'Painel', 'un', 32.50) RETURNING id INTO produto_teste;
    INSERT INTO public.material (id_produto, quantidade, id_obra)
    VALUES (produto_teste, 2, 301) RETURNING id INTO material_teste;
    UPDATE public.produto SET preco_unitario = 99, ativo = FALSE WHERE id = produto_teste;
    IF NOT EXISTS (SELECT 1 FROM public.material WHERE id = material_teste AND tipo = 'Material teste'
                   AND custo_unitario = 32.50 AND status_logistico = 'EmSolicitacao') THEN
        RAISE EXCEPTION 'Status inicial, tipo de compatibilidade ou custo original divergente';
    END IF;

    BEGIN
        INSERT INTO public.material (id_produto, quantidade, id_obra) VALUES (produto_teste, 2, 301);
        RAISE EXCEPTION 'Inclusão com produto inativo foi aceita';
    EXCEPTION WHEN check_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'ck_material_produto_ativo' THEN RAISE; END IF;
    END;
    BEGIN
        INSERT INTO public.material (tipo, quantidade, id_obra) VALUES ('Sem produto', 2, 301);
        RAISE EXCEPTION 'Inclusão sem produto foi aceita';
    EXCEPTION WHEN not_null_violation THEN NULL;
    END;

    IF (SELECT count(*) FROM public.equipe_temporal) <> 10 OR
       (SELECT count(*) FROM public.equipe_integrante) <> 10 OR
       NOT EXISTS (SELECT 1 FROM public.manutencao WHERE id = 2 AND id_equipe = 10) THEN
        RAISE EXCEPTION 'Conversão de equipe ou preservação da manutenção incompleta';
    END IF;

    INSERT INTO public.programacao_obra (id_obra, data_inicio, data_fim)
    VALUES (301, DATE '2030-01-07', DATE '2030-01-10') RETURNING id INTO programacao_a;
    INSERT INTO public.equipe_temporal (id_programacao, pessoas_previstas)
    VALUES (programacao_a, 2) RETURNING id INTO equipe_a;
    INSERT INTO public.equipe_integrante (id_equipe, id_usuario) VALUES (equipe_a, 8);

    INSERT INTO public.programacao_obra (id_obra, data_inicio, data_fim)
    VALUES (302, DATE '2030-01-10', DATE '2030-01-11') RETURNING id INTO programacao_b;
    INSERT INTO public.equipe_temporal (id_programacao, pessoas_previstas)
    VALUES (programacao_b, 2) RETURNING id INTO equipe_b;
    BEGIN
        INSERT INTO public.equipe_integrante (id_equipe, id_usuario) VALUES (equipe_b, 8);
        RAISE EXCEPTION 'Sobreposição na fronteira inclusiva foi aceita';
    EXCEPTION WHEN exclusion_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.equipe_integrante (id_equipe, id_usuario) VALUES (equipe_b, 1);
        RAISE EXCEPTION 'Usuário que não é instalador foi aceito';
    EXCEPTION WHEN check_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'ck_integrante_instalador_ativo' THEN RAISE; END IF;
    END;
    BEGIN
        UPDATE public.equipe_integrante SET data_saida = DATE '2030-01-11' WHERE id_equipe = equipe_a;
        RAISE EXCEPTION 'Integrante fora da programação foi aceito';
    EXCEPTION WHEN check_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'ck_integrante_periodo' THEN RAISE; END IF;
    END;

    SET CONSTRAINTS ALL IMMEDIATE;
    BEGIN
        DELETE FROM public.equipe_temporal WHERE id = equipe_a;
        RAISE EXCEPTION 'Programação ficou sem equipe temporal';
    EXCEPTION WHEN check_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'ck_programacao_equipe_temporal' THEN RAISE; END IF;
    END;
    BEGIN
        UPDATE public.programacao_obra SET data_fim = DATE '2030-01-08' WHERE id = programacao_a;
        RAISE EXCEPTION 'Programação mudou sem atualizar o intervalo do integrante';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    SET CONSTRAINTS ALL DEFERRED;
    UPDATE public.programacao_obra SET data_fim = DATE '2030-01-09' WHERE id = programacao_a;
    UPDATE public.equipe_integrante SET data_saida = DATE '2030-01-09' WHERE id_equipe = equipe_a;
    INSERT INTO public.equipe_integrante (id_equipe, id_usuario) VALUES (equipe_b, 8);
    SET CONSTRAINTS ALL IMMEDIATE;

    UPDATE public.obra SET excluida_em = clock_timestamp() WHERE id = 301;
    IF NOT EXISTS (SELECT 1 FROM public.equipe_integrante WHERE id_equipe = equipe_a AND NOT reserva_agenda) THEN
        RAISE EXCEPTION 'Exclusão lógica não liberou a agenda preservando o vínculo';
    END IF;

    SELECT versao_credencial INTO STRICT versao_atual FROM public.usuario WHERE id = 8;
    INSERT INTO public.token_redefinicao_senha (token_hash, id_usuario, versao_credencial)
    VALUES (token_valido, 8, versao_atual), (token_revogado, 8, versao_atual);
    INSERT INTO public.token_redefinicao_senha (token_hash, id_usuario, versao_credencial, criado_em, expira_em)
    VALUES (token_expirado, 8, versao_atual, now() - INTERVAL '2 hours', now() - INTERVAL '1 hour');
    IF public.consumir_token_redefinicao(token_expirado) IS NOT NULL THEN
        RAISE EXCEPTION 'Token expirado aceito';
    END IF;
    IF public.consumir_token_redefinicao(token_valido) IS DISTINCT FROM 8 OR
       public.consumir_token_redefinicao(token_valido) IS NOT NULL THEN
        RAISE EXCEPTION 'Token não respeitou o uso único';
    END IF;
    UPDATE public.usuario SET senha = 'hash fictício para o teste' WHERE id = 8;
    IF (SELECT versao_credencial FROM public.usuario WHERE id = 8) <> versao_atual + 1 OR
       public.consumir_token_redefinicao(token_revogado) IS NOT NULL THEN
        RAISE EXCEPTION 'Troca de senha não invalidou o token anterior';
    END IF;
    UPDATE public.usuario SET ativo = FALSE WHERE id = 8;
    UPDATE public.usuario SET id_perfil = 1 WHERE id = 8;
    IF (SELECT versao_credencial FROM public.usuario WHERE id = 8) <> versao_atual + 3 THEN
        RAISE EXCEPTION 'Status ou perfil não atualizou a versão de credencial';
    END IF;
END;
$testes$;

ROLLBACK;
