-- A equipe fixa continua atendendo as manutenções legadas. Novas programações usam equipe_temporal.
ALTER TABLE public.programacao_obra
    ALTER COLUMN id_equipe DROP NOT NULL,
    ADD COLUMN periodo_programacao DATERANGE GENERATED ALWAYS AS (daterange(data_inicio, data_fim, '[]')) STORED,
    ADD COLUMN reserva_agenda BOOLEAN NOT NULL DEFAULT TRUE,
    ADD CONSTRAINT uq_programacao_periodo UNIQUE (id, periodo_programacao),
    ADD CONSTRAINT uq_programacao_reserva UNIQUE (id, reserva_agenda);

UPDATE public.programacao_obra AS p SET reserva_agenda = FALSE
FROM public.obra AS o WHERE o.id = p.id_obra AND o.excluida_em IS NOT NULL;

CREATE TABLE public.equipe_temporal (
    id SERIAL PRIMARY KEY,
    id_programacao INT NOT NULL UNIQUE REFERENCES public.programacao_obra(id) ON DELETE CASCADE,
    pessoas_previstas INT NOT NULL CHECK (pessoas_previstas > 0),
    CONSTRAINT uq_equipe_temporal_programacao UNIQUE (id, id_programacao)
);

CREATE TABLE public.equipe_integrante (
    id SERIAL PRIMARY KEY,
    id_equipe INT NOT NULL,
    id_programacao INT NOT NULL,
    id_usuario INT NOT NULL REFERENCES public.usuario(id) ON DELETE RESTRICT,
    data_entrada DATE NOT NULL,
    data_saida DATE NOT NULL,
    periodo_programacao DATERANGE NOT NULL,
    reserva_agenda BOOLEAN NOT NULL,
    CONSTRAINT uq_equipe_integrante UNIQUE (id_equipe, id_usuario),
    CONSTRAINT fk_integrante_equipe FOREIGN KEY (id_equipe, id_programacao)
        REFERENCES public.equipe_temporal(id, id_programacao) ON DELETE CASCADE,
    -- O intervalo da programação e dos integrantes podem ser ajustados na mesma transação.
    CONSTRAINT fk_integrante_periodo FOREIGN KEY (id_programacao, periodo_programacao)
        REFERENCES public.programacao_obra(id, periodo_programacao) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_integrante_reserva FOREIGN KEY (id_programacao, reserva_agenda)
        REFERENCES public.programacao_obra(id, reserva_agenda) ON UPDATE CASCADE,
    CONSTRAINT ck_integrante_periodo CHECK (
        CASE WHEN data_saida >= data_entrada THEN
            daterange(data_entrada, data_saida, '[]') <@ periodo_programacao
        ELSE FALSE END),
    CONSTRAINT ex_instalador_periodo EXCLUDE USING gist (
        id_usuario WITH =, daterange(data_entrada, data_saida, '[]') WITH &&
    ) WHERE (reserva_agenda) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE INDEX idx_equipe_integrante_usuario ON public.equipe_integrante(id_usuario);
CREATE INDEX idx_equipe_integrante_programacao ON public.equipe_integrante(id_programacao);

-- Dados antigos só registram integrantes fixos e o intervalo da programação.
-- O headcount convertido é a quantidade conhecida (mínimo 1) e o intervalo é o programado,
-- sem inferir ponto ou presença real. Conflitos preexistentes impedem o corte.
INSERT INTO public.equipe_temporal (id_programacao, pessoas_previstas)
SELECT p.id, GREATEST(1, (SELECT count(*)::int FROM public.equipe_instalador AS e WHERE e.id_equipe = p.id_equipe))
FROM public.programacao_obra AS p ORDER BY p.id;

INSERT INTO public.equipe_integrante (id_equipe, id_programacao, id_usuario, data_entrada, data_saida,
                                      periodo_programacao, reserva_agenda)
SELECT et.id, p.id, ei.id_usuario, p.data_inicio, p.data_fim, p.periodo_programacao, p.reserva_agenda
FROM public.programacao_obra AS p
JOIN public.equipe_temporal AS et ON et.id_programacao = p.id
JOIN public.equipe_instalador AS ei ON ei.id_equipe = p.id_equipe
ORDER BY p.id, ei.id_usuario;

CREATE FUNCTION public.preparar_integrante_temporal() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog AS $func$
DECLARE
    programacao_atual public.programacao_obra%ROWTYPE;
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM 1 FROM public.usuario AS u
        JOIN public.perfil_acesso AS a ON a.id = u.id_perfil
        WHERE u.id = NEW.id_usuario AND u.ativo AND a.nome_perfil = 'InstaladorCampo'
        FOR SHARE OF u;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'O integrante precisa ser um instalador ativo'
                USING ERRCODE = '23514', CONSTRAINT = 'ck_integrante_instalador_ativo';
        END IF;
    ELSIF (NEW.id_equipe, NEW.id_usuario) IS DISTINCT FROM (OLD.id_equipe, OLD.id_usuario) THEN
        RAISE EXCEPTION 'Equipe e usuário identificam o vínculo original do integrante'
            USING ERRCODE = '23514', CONSTRAINT = 'ck_integrante_vinculo_original';
    END IF;

    SELECT p.* INTO programacao_atual
    FROM public.equipe_temporal AS e JOIN public.programacao_obra AS p ON p.id = e.id_programacao
    WHERE e.id = NEW.id_equipe;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Equipe temporal não encontrada'
            USING ERRCODE = '23503', CONSTRAINT = 'fk_integrante_equipe';
    END IF;
    NEW.id_programacao := programacao_atual.id;
    NEW.periodo_programacao := programacao_atual.periodo_programacao;
    NEW.reserva_agenda := programacao_atual.reserva_agenda;
    NEW.data_entrada := COALESCE(NEW.data_entrada, programacao_atual.data_inicio);
    NEW.data_saida := COALESCE(NEW.data_saida, programacao_atual.data_fim);
    RETURN NEW;
END;
$func$;

CREATE TRIGGER trg_integrante_temporal_preparar
    BEFORE INSERT OR UPDATE OF id_equipe, id_usuario, data_entrada, data_saida ON public.equipe_integrante
    FOR EACH ROW EXECUTE FUNCTION public.preparar_integrante_temporal();

CREATE FUNCTION public.exigir_equipe_temporal() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog AS $func$
DECLARE
    programacao_id INT;
BEGIN
    IF TG_TABLE_NAME = 'programacao_obra' THEN
        programacao_id := NEW.id;
    ELSE
        programacao_id := OLD.id_programacao;
    END IF;
    IF EXISTS (SELECT 1 FROM public.programacao_obra WHERE id = programacao_id)
       AND NOT EXISTS (SELECT 1 FROM public.equipe_temporal WHERE id_programacao = programacao_id) THEN
        RAISE EXCEPTION 'A programação deve ter uma equipe temporal'
            USING ERRCODE = '23514', CONSTRAINT = 'ck_programacao_equipe_temporal';
    END IF;
    RETURN NULL;
END;
$func$;

CREATE CONSTRAINT TRIGGER ck_programacao_equipe_temporal
    AFTER INSERT ON public.programacao_obra DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.exigir_equipe_temporal();

CREATE CONSTRAINT TRIGGER ck_equipe_temporal_programacao
    AFTER DELETE OR UPDATE OF id_programacao ON public.equipe_temporal DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION public.exigir_equipe_temporal();

CREATE FUNCTION public.liberar_agenda_obra_excluida() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog AS $func$
BEGIN
    UPDATE public.programacao_obra SET reserva_agenda = FALSE
    WHERE id_obra = NEW.id AND reserva_agenda;
    RETURN NULL;
END;
$func$;

CREATE TRIGGER trg_obra_liberar_agenda AFTER UPDATE OF excluida_em ON public.obra
    FOR EACH ROW WHEN (OLD.excluida_em IS NULL AND NEW.excluida_em IS NOT NULL)
    EXECUTE FUNCTION public.liberar_agenda_obra_excluida();
