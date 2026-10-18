SET client_encoding = 'UTF8';
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Tipos usados nas validações do banco.
CREATE TYPE status_obra_enum AS ENUM ('MaterialComprado', 'NoDeposito', 'Separado', 'EmAndamento', 'Concluido', 'Assistencia');
CREATE TYPE status_logistico_enum AS ENUM ('Comprado', 'EmTransito', 'Disponivel', 'Utilizado');
CREATE TYPE nome_perfil_enum AS ENUM ('Administrador', 'EngenhariaObras', 'Financeiro', 'VisualizadorLeitor', 'InstaladorCampo');
CREATE TYPE tipo_comentario_enum AS ENUM ('Cartao', 'Manutencao', 'Timeline');
CREATE TYPE tipo_acao_historico_enum AS ENUM ('Cadastro', 'MudancaStatus', 'Comentario', 'ManutencaoConcluida', 'AlteracaoFinanceira');
CREATE TYPE status_manutencao_enum AS ENUM ('Pendente', 'Concluida');

-- Perfis e equipes.
CREATE TABLE perfil_acesso (
    id SERIAL PRIMARY KEY,
    nome_perfil nome_perfil_enum NOT NULL UNIQUE,
    permissoes TEXT
);

CREATE TABLE equipe (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    especialidade VARCHAR(100),
    id_responsavel INT NOT NULL
);

-- Clientes e usuários.
CREATE TABLE cliente (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    cidade VARCHAR(100),
    dados_contrato TEXT,
    cpf_cnpj VARCHAR(14) NOT NULL UNIQUE,
    endereco VARCHAR(255),
    telefone VARCHAR(30),
    email VARCHAR(200),
    CONSTRAINT ck_cliente_cpf_cnpj CHECK (cpf_cnpj ~ '^[0-9]{11}([0-9]{3})?$')
);

CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    email VARCHAR(200) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    id_perfil INT NOT NULL REFERENCES perfil_acesso(id) ON DELETE RESTRICT,
    id_equipe INT REFERENCES equipe(id) ON DELETE SET NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    tentativas_login INT NOT NULL DEFAULT 0 CHECK (tentativas_login >= 0),
    bloqueado_ate TIMESTAMP
);

CREATE TABLE equipe_instalador (
    id_equipe INT NOT NULL REFERENCES equipe(id) ON DELETE RESTRICT,
    id_usuario INT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    CONSTRAINT pk_equipe_instalador PRIMARY KEY (id_equipe, id_usuario)
);

ALTER TABLE equipe ADD CONSTRAINT fk_equipe_responsavel_usuario
    FOREIGN KEY (id_responsavel) REFERENCES usuario(id) ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE equipe ADD CONSTRAINT fk_equipe_responsavel_membro
    FOREIGN KEY (id, id_responsavel) REFERENCES equipe_instalador(id_equipe, id_usuario)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;

-- Obras e pagamentos.
CREATE TABLE obra (
    id SERIAL PRIMARY KEY,
    status status_obra_enum NOT NULL DEFAULT 'MaterialComprado',
    categoria VARCHAR(50),
    quantidade_paineis INT NOT NULL CHECK (quantidade_paineis > 0),
    quantidade_inversores INT CHECK (quantidade_inversores >= 0),
    endereco VARCHAR(255) NOT NULL CHECK (btrim(endereco) <> ''),
    descricao TEXT,
    projeto_arquivo VARCHAR(500),
    instrucoes TEXT,
    excluida_em TIMESTAMP,
    data_inicio_estimada DATE,
    data_fim_estimada DATE,
    data_inicio_real DATE,
    data_fim_real DATE,
    id_cliente INT NOT NULL REFERENCES cliente(id) ON DELETE RESTRICT,
    CONSTRAINT ck_obra_datas_estimadas CHECK (data_fim_estimada IS NULL OR data_inicio_estimada IS NULL OR data_fim_estimada >= data_inicio_estimada),
    CONSTRAINT ck_obra_datas_reais CHECK (data_fim_real IS NULL OR data_inicio_real IS NULL OR data_fim_real >= data_inicio_real)
);

CREATE TABLE pagamento (
    id SERIAL PRIMARY KEY,
    data_confirmacao DATE NOT NULL,
    prazo_contratual_dias INT NOT NULL CHECK (prazo_contratual_dias > 0),
    id_obra INT NOT NULL UNIQUE REFERENCES obra(id) ON DELETE CASCADE
);

-- Materiais, comentários e histórico da obra.
CREATE TABLE material (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(200) NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade >= 0),
    quantidade_utilizada INT CHECK (quantidade_utilizada IS NULL OR quantidade_utilizada BETWEEN 0 AND quantidade),
    custo_unitario NUMERIC(12,2) CHECK (custo_unitario >= 0),
    status_logistico status_logistico_enum,
    id_obra INT NOT NULL REFERENCES obra(id) ON DELETE CASCADE
);

CREATE TABLE comentario (
    id SERIAL PRIMARY KEY,
    descricao TEXT NOT NULL CHECK (btrim(descricao) <> ''),
    tipo tipo_comentario_enum NOT NULL,
    id_manutencao INT,
    data_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    id_obra INT NOT NULL REFERENCES obra(id) ON DELETE CASCADE,
    id_usuario INT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT
);

CREATE TABLE historico_obra (
    id BIGSERIAL PRIMARY KEY,
    tipo_acao tipo_acao_historico_enum NOT NULL,
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50),
    data_alteracao TIMESTAMP NOT NULL DEFAULT NOW(),
    observacao TEXT,
    id_obra INT NOT NULL REFERENCES obra(id) ON DELETE RESTRICT,
    id_usuario INT NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT
);

CREATE TABLE programacao_obra (
    id SERIAL PRIMARY KEY,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    prioridade INT DEFAULT 1 CHECK (prioridade > 0),
    duracao_estimada_dias DECIMAL(5,1),
    id_obra INT NOT NULL REFERENCES obra(id) ON DELETE CASCADE,
    id_equipe INT NOT NULL REFERENCES equipe(id) ON DELETE RESTRICT,
    CONSTRAINT ck_programacao_datas CHECK (data_fim >= data_inicio),
    CONSTRAINT ex_programacao_equipe_periodo EXCLUDE USING gist
        (id_equipe WITH =, daterange(data_inicio, data_fim, '[]') WITH &&)
);

-- Custos e manutenção.
CREATE TABLE relatorio_custo (
    id SERIAL PRIMARY KEY,
    custo_mao_obra NUMERIC(12,2) DEFAULT 0.00 CHECK (custo_mao_obra >= 0),
    custo_insumos NUMERIC(12,2) DEFAULT 0.00 CHECK (custo_insumos >= 0),
    custo_total NUMERIC(12,2) GENERATED ALWAYS AS (custo_mao_obra + custo_insumos) STORED,
    valor_obra NUMERIC(12,2) CHECK (valor_obra >= 0),
    id_obra INT NOT NULL UNIQUE REFERENCES obra(id) ON DELETE CASCADE
);

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

-- Auditoria e compartilhamento de cronograma.
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

-- Histórico e auditoria só aceitam novos registros.
CREATE FUNCTION impedir_alteracao_log() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% aceita somente INSERT', TG_TABLE_NAME USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER trg_historico_somente_insert BEFORE UPDATE OR DELETE ON historico_obra
    FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_log();
CREATE TRIGGER trg_audit_somente_insert BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION impedir_alteracao_log();

-- Índices usados pelos filtros e relacionamentos consultados pelas rotas.
CREATE INDEX idx_obra_ativas_status ON obra(status) WHERE excluida_em IS NULL;
CREATE INDEX idx_obra_ativas_categoria_status ON obra(categoria, status) WHERE excluida_em IS NULL;
CREATE INDEX idx_obra_cliente ON obra(id_cliente);
CREATE INDEX idx_material_obra ON material(id_obra);
CREATE INDEX idx_comentario_obra ON comentario(id_obra);
CREATE INDEX idx_comentario_manutencao ON comentario(id_manutencao) WHERE id_manutencao IS NOT NULL;
CREATE INDEX idx_programacao_obra ON programacao_obra(id_obra);
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
