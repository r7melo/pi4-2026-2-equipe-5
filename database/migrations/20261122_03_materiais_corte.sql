-- Aplicar depois que cada material legado tiver produto e status reconciliados.
DO $migration$
BEGIN
    IF EXISTS (SELECT 1 FROM public.material WHERE id_produto IS NULL OR status_logistico IS NULL) THEN
        RAISE EXCEPTION 'Existem materiais sem produto ou status. Reconcilie os dados antes do corte.';
    END IF;
END;
$migration$;

ALTER TABLE public.material
    ALTER COLUMN id_produto SET NOT NULL,
    ALTER COLUMN status_logistico SET NOT NULL,
    ALTER COLUMN status_logistico SET DEFAULT 'EmSolicitacao';

CREATE FUNCTION public.preparar_inclusao_material() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog AS $func$
DECLARE
    produto_atual public.produto%ROWTYPE;
BEGIN
    -- Serializa a inclusão com mudanças de preço e desativação.
    SELECT * INTO produto_atual FROM public.produto WHERE id = NEW.id_produto FOR SHARE;
    IF FOUND THEN
        IF NOT produto_atual.ativo THEN
            RAISE EXCEPTION 'Produto inativo' USING ERRCODE = '23514', CONSTRAINT = 'ck_material_produto_ativo';
        END IF;
        -- Mantém compatibilidade de leitura com consumidores do antigo campo texto.
        NEW.tipo := produto_atual.nome;
        NEW.custo_unitario := produto_atual.preco_unitario;
    END IF;
    IF NEW.status_logistico IS DISTINCT FROM 'EmSolicitacao'::public.status_logistico_enum THEN
        RAISE EXCEPTION 'Novo material deve iniciar em EmSolicitacao'
            USING ERRCODE = '23514', CONSTRAINT = 'ck_material_status_inicial';
    END IF;
    RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_material_preparar_inclusao BEFORE INSERT ON public.material
    FOR EACH ROW EXECUTE FUNCTION public.preparar_inclusao_material();

CREATE FUNCTION public.impedir_troca_produto_material() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog AS $func$
BEGIN
    IF NEW.id_produto IS DISTINCT FROM OLD.id_produto THEN
        RAISE EXCEPTION 'O produto de um material lançado não pode ser trocado'
            USING ERRCODE = '23514', CONSTRAINT = 'ck_material_produto_original';
    END IF;
    RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_material_preservar_produto BEFORE UPDATE OF id_produto ON public.material
    FOR EACH ROW EXECUTE FUNCTION public.impedir_troca_produto_material();
