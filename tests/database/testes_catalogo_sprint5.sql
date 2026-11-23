\set ON_ERROR_STOP on

BEGIN;

DO $teste$
DECLARE
    obra_teste INT;
    produto_teste INT;
    material_teste INT;
    restricao TEXT;
BEGIN
    IF (SELECT enum_range(NULL::public.status_logistico_enum)::text) <>
        '{EmSolicitacao,Comprado,EmTransito,Disponivel,Utilizado}' THEN
        RAISE EXCEPTION 'Ordem inesperada do enum de status logístico';
    END IF;

    SELECT id INTO STRICT obra_teste FROM public.obra ORDER BY id LIMIT 1;

    -- Escrita antiga continua válida após a expansão, inclusive com status nulo.
    INSERT INTO public.material (tipo, quantidade, id_obra)
    VALUES ('Material legado de teste', 1, obra_teste)
    RETURNING id INTO material_teste;

    IF NOT EXISTS (SELECT 1 FROM public.material WHERE id = material_teste
                   AND id_produto IS NULL AND status_logistico IS NULL) THEN
        RAISE EXCEPTION 'Escrita legada mudou após a expansão';
    END IF;

    INSERT INTO public.produto (nome, tipo, unidade, preco_unitario)
    VALUES ('Item fictício', 'Painel', 'un', 123.45)
    RETURNING id INTO produto_teste;

    IF NOT EXISTS (SELECT 1 FROM public.produto WHERE id = produto_teste AND ativo) THEN
        RAISE EXCEPTION 'Um produto novo deve nascer ativo';
    END IF;

    BEGIN
        INSERT INTO public.produto (id, nome, tipo, unidade, preco_unitario)
        VALUES (produto_teste, 'Duplicado', 'Painel', 'un', 15.00);
        RAISE EXCEPTION 'Foi possível duplicar o ID do produto';
    EXCEPTION WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'produto_pkey' THEN RAISE; END IF;
    END;

    BEGIN
        UPDATE public.produto SET unidade = '   ' WHERE id = produto_teste;
        RAISE EXCEPTION 'Unidade em branco foi aceita';
    EXCEPTION WHEN check_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'ck_produto_unidade' THEN RAISE; END IF;
    END;

    UPDATE public.material
       SET id_produto = produto_teste, custo_unitario = 123.45,
           status_logistico = 'EmSolicitacao'
     WHERE id = material_teste;

    UPDATE public.produto SET preco_unitario = 150.00, ativo = FALSE WHERE id = produto_teste;

    IF NOT EXISTS (SELECT 1 FROM public.material WHERE id = material_teste
                   AND id_produto = produto_teste AND custo_unitario = 123.45
                   AND status_logistico = 'EmSolicitacao') THEN
        RAISE EXCEPTION 'Alteração do catálogo modificou o vínculo, status ou custo do material';
    END IF;

    BEGIN
        DELETE FROM public.produto WHERE id = produto_teste;
        RAISE EXCEPTION 'Foi possível excluir um produto referenciado';
    EXCEPTION WHEN foreign_key_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'fk_material_produto' THEN RAISE; END IF;
    END;

    BEGIN
        UPDATE public.material SET id_produto = -1 WHERE id = material_teste;
        RAISE EXCEPTION 'Foi possível vincular um produto inexistente';
    EXCEPTION WHEN foreign_key_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'fk_material_produto' THEN RAISE; END IF;
    END;

    BEGIN
        UPDATE public.produto SET preco_unitario = -0.01 WHERE id = produto_teste;
        RAISE EXCEPTION 'Preço negativo foi aceito';
    EXCEPTION WHEN check_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'ck_produto_preco' THEN RAISE; END IF;
    END;

    BEGIN
        UPDATE public.produto SET preco_unitario = 'NaN'::numeric WHERE id = produto_teste;
        RAISE EXCEPTION 'Preço NaN foi aceito';
    EXCEPTION WHEN check_violation THEN
        GET STACKED DIAGNOSTICS restricao = CONSTRAINT_NAME;
        IF restricao <> 'ck_produto_preco' THEN RAISE; END IF;
    END;
END;
$teste$;

ROLLBACK;
