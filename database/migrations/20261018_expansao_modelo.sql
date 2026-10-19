CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE tipo_comentario_enum AS ENUM ('Cartao', 'Manutencao', 'Timeline');
CREATE TYPE tipo_acao_historico_enum AS ENUM ('Cadastro', 'MudancaStatus', 'Comentario', 'ManutencaoConcluida', 'AlteracaoFinanceira');
CREATE TYPE status_manutencao_enum AS ENUM ('Pendente', 'Concluida');

ALTER TABLE cliente ADD COLUMN cpf_cnpj VARCHAR(14);
ALTER TABLE cliente ADD COLUMN endereco VARCHAR(255);
ALTER TABLE cliente ADD COLUMN telefone VARCHAR(30);
ALTER TABLE cliente ADD COLUMN email VARCHAR(200);
UPDATE cliente SET cpf_cnpj = lpad(id::text, 14, '0');
ALTER TABLE cliente ALTER COLUMN cpf_cnpj SET NOT NULL;
ALTER TABLE cliente ADD CONSTRAINT cliente_cpf_cnpj_key UNIQUE (cpf_cnpj);
ALTER TABLE cliente ADD CONSTRAINT ck_cliente_cpf_cnpj CHECK (cpf_cnpj ~ '^[0-9]{11}([0-9]{3})?$');

ALTER TABLE usuario ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE usuario ADD COLUMN tentativas_login INT NOT NULL DEFAULT 0 CHECK (tentativas_login >= 0);
ALTER TABLE usuario ADD COLUMN bloqueado_ate TIMESTAMP;

ALTER TABLE obra ADD COLUMN quantidade_inversores INT CHECK (quantidade_inversores >= 0);
ALTER TABLE obra ADD COLUMN endereco VARCHAR(255);
ALTER TABLE obra ADD COLUMN descricao TEXT;
ALTER TABLE obra ADD COLUMN projeto_arquivo VARCHAR(500);
ALTER TABLE obra ADD COLUMN instrucoes TEXT;
ALTER TABLE obra ADD COLUMN excluida_em TIMESTAMP;
UPDATE obra SET endereco = 'Endereço pendente de cadastro' WHERE endereco IS NULL;
ALTER TABLE obra ALTER COLUMN endereco SET NOT NULL;
ALTER TABLE obra ADD CONSTRAINT ck_obra_endereco CHECK (btrim(endereco) <> '');

ALTER TABLE material ADD COLUMN quantidade_utilizada INT;
ALTER TABLE material ADD COLUMN custo_unitario NUMERIC(12,2);
UPDATE material SET quantidade_utilizada = CASE WHEN status_logistico = 'Utilizado' THEN quantidade ELSE 0 END;
ALTER TABLE material ADD CONSTRAINT ck_material_quantidade_utilizada
    CHECK (quantidade_utilizada IS NULL OR quantidade_utilizada BETWEEN 0 AND quantidade);
ALTER TABLE material ADD CONSTRAINT ck_material_custo_unitario CHECK (custo_unitario >= 0);

ALTER TABLE comentario ADD COLUMN tipo tipo_comentario_enum;
ALTER TABLE comentario ADD COLUMN id_manutencao INT;
UPDATE comentario SET tipo = CASE WHEN id = 709 THEN 'Manutencao'::tipo_comentario_enum
    WHEN id = 708 THEN 'Timeline'::tipo_comentario_enum ELSE 'Cartao'::tipo_comentario_enum END;
ALTER TABLE comentario ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE comentario ADD CONSTRAINT ck_comentario_descricao CHECK (btrim(descricao) <> '');

ALTER TABLE historico_obra ALTER COLUMN id TYPE BIGINT;
ALTER TABLE historico_obra ADD COLUMN tipo_acao tipo_acao_historico_enum;
UPDATE historico_obra SET tipo_acao = CASE WHEN status_anterior IS NULL THEN 'Cadastro'::tipo_acao_historico_enum
    ELSE 'MudancaStatus'::tipo_acao_historico_enum END;
ALTER TABLE historico_obra ALTER COLUMN tipo_acao SET NOT NULL;
ALTER TABLE historico_obra ALTER COLUMN status_novo DROP NOT NULL;
ALTER TABLE historico_obra DROP CONSTRAINT historico_obra_id_obra_fkey;
ALTER TABLE historico_obra ADD CONSTRAINT historico_obra_id_obra_fkey
    FOREIGN KEY (id_obra) REFERENCES obra(id) ON DELETE RESTRICT;

ALTER TABLE relatorio_custo ADD COLUMN valor_obra NUMERIC(12,2) CHECK (valor_obra >= 0);
UPDATE relatorio_custo SET valor_obra = 45000.00 WHERE id_obra = 307;

UPDATE pagamento p SET data_confirmacao = COALESCE(o.data_inicio_estimada, CURRENT_DATE)
FROM obra o WHERE o.id = p.id_obra AND p.data_confirmacao IS NULL;
ALTER TABLE pagamento ALTER COLUMN data_confirmacao SET NOT NULL;

CREATE TABLE equipe_instalador (
    id_equipe INT NOT NULL REFERENCES equipe(id) ON DELETE RESTRICT,
    id_usuario INT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    CONSTRAINT pk_equipe_instalador PRIMARY KEY (id_equipe, id_usuario)
);
INSERT INTO equipe_instalador (id_equipe, id_usuario)
SELECT u.id_equipe, u.id
FROM usuario u JOIN perfil_acesso p ON p.id = u.id_perfil
WHERE p.nome_perfil = 'InstaladorCampo' AND u.id_equipe IS NOT NULL;
INSERT INTO usuario (nome, email, senha, id_perfil, id_equipe)
SELECT 'Instalador equipe ' || e.id,
       'instalador-migracao-' || e.id || '@local',
       '$2b$12$hkTtA7rMA1J8/gfBHvzHme.rGJzrqOg6RVBhDOxK5tUOjhPcQPxaO',
       (SELECT id FROM perfil_acesso WHERE nome_perfil = 'InstaladorCampo'),
       e.id
FROM equipe e
WHERE NOT EXISTS (SELECT 1 FROM equipe_instalador ei WHERE ei.id_equipe = e.id);
INSERT INTO equipe_instalador (id_equipe, id_usuario)
SELECT id_equipe, id FROM usuario WHERE email LIKE 'instalador-migracao-%@local';

ALTER TABLE equipe ADD COLUMN id_responsavel INT;
UPDATE equipe e SET id_responsavel =
    (SELECT MIN(id_usuario) FROM equipe_instalador ei WHERE ei.id_equipe = e.id);
ALTER TABLE equipe ALTER COLUMN id_responsavel SET NOT NULL;
ALTER TABLE equipe ADD CONSTRAINT fk_equipe_responsavel_usuario
    FOREIGN KEY (id_responsavel) REFERENCES usuario(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE equipe ADD CONSTRAINT fk_equipe_responsavel_membro
    FOREIGN KEY (id, id_responsavel) REFERENCES equipe_instalador(id_equipe, id_usuario)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE manutencao (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL CHECK (btrim(descricao) <> ''),
    status status_manutencao_enum NOT NULL DEFAULT 'Pendente',
    data_conclusao TIMESTAMP,
    id_obra INT NOT NULL REFERENCES obra(id) ON DELETE RESTRICT,
    id_equipe INT NOT NULL REFERENCES equipe(id) ON DELETE RESTRICT,
    CONSTRAINT ck_manutencao_conclusao CHECK
        ((status = 'Pendente' AND data_conclusao IS NULL) OR (status = 'Concluida' AND data_conclusao IS NOT NULL))
);
ALTER TABLE comentario ADD CONSTRAINT fk_comentario_manutencao
    FOREIGN KEY (id_manutencao) REFERENCES manutencao(id) ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    id_usuario INT REFERENCES usuario(id) ON DELETE RESTRICT,
    acao VARCHAR(100) NOT NULL,
    entidade VARCHAR(100) NOT NULL,
    entidade_id INT,
    detalhes JSONB,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE cronograma_compartilhado (
    id SERIAL PRIMARY KEY,
    token VARCHAR(128) NOT NULL UNIQUE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    expira_em TIMESTAMPTZ NOT NULL,
    id_usuario INT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_cronograma_datas CHECK (data_fim >= data_inicio)
);

ALTER TABLE programacao_obra ADD CONSTRAINT ex_programacao_equipe_periodo EXCLUDE USING gist
    (id_equipe WITH =, daterange(data_inicio, data_fim, '[]') WITH &&);

CREATE FUNCTION impedir_alteracao_log() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% aceita somente INSERT', TG_TABLE_NAME USING ERRCODE = 'P0001';
END;
$$;
CREATE TRIGGER trg_historico_somente_insert BEFORE UPDATE OR DELETE ON historico_obra
    FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_log();
CREATE TRIGGER trg_audit_somente_insert BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_log();

-- Objetos legados são preservados; removê-los não é necessário para a expansão
-- e poderia apagar dados de instalações existentes.
DROP INDEX idx_obra_status;
DROP INDEX idx_historico_obra;
DROP INDEX idx_programacao_equipe;
DROP INDEX idx_usuario_email;
CREATE INDEX idx_obra_ativas_status ON obra(status) WHERE excluida_em IS NULL;
CREATE INDEX idx_obra_ativas_categoria_status ON obra(categoria, status) WHERE excluida_em IS NULL;
CREATE INDEX idx_programacao_equipe_inicio ON programacao_obra(id_equipe, data_inicio);
CREATE INDEX idx_programacao_datas ON programacao_obra(data_inicio, data_fim);
CREATE INDEX idx_historico_obra_data ON historico_obra(id_obra, data_alteracao DESC, id DESC);
CREATE INDEX idx_cliente_nome_busca ON cliente USING GIN (nome gin_trgm_ops);
CREATE UNIQUE INDEX idx_usuario_email_busca ON usuario(lower(email));
CREATE INDEX idx_equipe_instalador_usuario ON equipe_instalador(id_usuario);
CREATE INDEX idx_manutencao_obra_status ON manutencao(id_obra, status);
CREATE INDEX idx_manutencao_equipe_status ON manutencao(id_equipe, status);
CREATE INDEX idx_audit_entidade ON audit_log(entidade, entidade_id);
CREATE INDEX idx_cronograma_expira_em ON cronograma_compartilhado(expira_em);
