-- RF-06: confirmar esta versão antes de usar o novo valor em defaults ou escritas.
ALTER TYPE public.status_logistico_enum
    ADD VALUE 'EmSolicitacao' BEFORE 'Comprado';
