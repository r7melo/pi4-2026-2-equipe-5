-- RF-21/RF-22: a API inclui a versão no JWT e a compara com a versão atual do usuário.
ALTER TABLE public.usuario ADD COLUMN versao_credencial BIGINT NOT NULL DEFAULT 0
    CHECK (versao_credencial >= 0);

CREATE FUNCTION public.atualizar_versao_credencial() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog AS $func$
BEGIN
    IF (NEW.senha, NEW.id_perfil, NEW.ativo) IS DISTINCT FROM (OLD.senha, OLD.id_perfil, OLD.ativo) THEN
        NEW.versao_credencial := OLD.versao_credencial + 1;
    ELSIF NEW.versao_credencial < OLD.versao_credencial THEN
        RAISE EXCEPTION 'A versão da credencial não pode retroceder' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_usuario_versao_credencial BEFORE UPDATE OF senha, id_perfil, ativo, versao_credencial
    ON public.usuario FOR EACH ROW EXECUTE FUNCTION public.atualizar_versao_credencial();

CREATE TABLE public.token_redefinicao_senha (
    token_hash BYTEA PRIMARY KEY CHECK (octet_length(token_hash) = 32),
    id_usuario INT NOT NULL REFERENCES public.usuario(id) ON DELETE CASCADE,
    versao_credencial BIGINT NOT NULL CHECK (versao_credencial >= 0),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT statement_timestamp(),
    expira_em TIMESTAMPTZ NOT NULL DEFAULT (statement_timestamp() + INTERVAL '1 hour'),
    consumido_em TIMESTAMPTZ,
    CONSTRAINT ck_token_redefinicao_expiracao CHECK (
        expira_em > criado_em AND expira_em <= criado_em + INTERVAL '1 hour'),
    CONSTRAINT ck_token_redefinicao_consumo CHECK (
        consumido_em IS NULL OR (consumido_em >= criado_em AND consumido_em < expira_em))
);

CREATE INDEX idx_token_redefinicao_usuario ON public.token_redefinicao_senha(id_usuario);
CREATE INDEX idx_token_redefinicao_expiracao ON public.token_redefinicao_senha(expira_em);

-- A chamada e a troca do hash da senha devem confirmar na mesma transação.
CREATE FUNCTION public.consumir_token_redefinicao(p_hash BYTEA) RETURNS INT
LANGUAGE plpgsql SET search_path = pg_catalog AS $func$
DECLARE
    usuario_id INT;
    versao_atual BIGINT;
    consumido TIMESTAMPTZ;
BEGIN
    -- Bloqueia o usuário primeiro para serializar tokens distintos da mesma conta.
    SELECT u.id, u.versao_credencial INTO usuario_id, versao_atual
    FROM public.token_redefinicao_senha AS t
    JOIN public.usuario AS u ON u.id = t.id_usuario
    WHERE t.token_hash = p_hash AND u.ativo
    FOR UPDATE OF u;
    IF NOT FOUND THEN RETURN NULL; END IF;

    consumido := clock_timestamp();
    UPDATE public.token_redefinicao_senha AS t
       SET consumido_em = consumido
     WHERE t.token_hash = p_hash AND t.consumido_em IS NULL
       AND t.versao_credencial = versao_atual
       AND consumido >= t.criado_em AND consumido < t.expira_em
    RETURNING t.id_usuario INTO usuario_id;
    RETURN usuario_id;
END;
$func$;
