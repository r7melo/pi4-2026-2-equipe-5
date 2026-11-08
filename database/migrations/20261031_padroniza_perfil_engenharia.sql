-- Preserva o ID do perfil e todos os usuarios/vinculos existentes.
-- Em banco novo o schema ja utiliza Engenharia; nesse caso nao ha DDL a aplicar.
DO $migration$
DECLARE
    tem_legado BOOLEAN;
    tem_canonico BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'nome_perfil_enum'
          AND e.enumlabel = 'EngenhariaObras'
    ), EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typname = 'nome_perfil_enum'
          AND e.enumlabel = 'Engenharia'
    ) INTO tem_legado, tem_canonico;

    IF tem_legado AND tem_canonico THEN
        RAISE EXCEPTION 'Perfis ambiguos: Engenharia e EngenhariaObras coexistem. Revise os dados antes de migrar.';
    ELSIF tem_legado THEN
        ALTER TYPE public.nome_perfil_enum RENAME VALUE 'EngenhariaObras' TO 'Engenharia';
    ELSIF NOT tem_canonico THEN
        RAISE EXCEPTION 'O enum public.nome_perfil_enum nao possui o perfil de Engenharia esperado.';
    END IF;
END;
$migration$;
