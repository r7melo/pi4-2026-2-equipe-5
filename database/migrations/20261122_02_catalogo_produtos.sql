-- RF-25: expansão compatível com o cadastro legado de materiais.
CREATE TABLE public.produto (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    tipo VARCHAR(200) NOT NULL,
    unidade VARCHAR(30) NOT NULL,
    preco_unitario NUMERIC(12,2) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_produto_nome CHECK (btrim(nome) <> ''),
    CONSTRAINT ck_produto_tipo CHECK (btrim(tipo) <> ''),
    CONSTRAINT ck_produto_unidade CHECK (btrim(unidade) <> ''),
    CONSTRAINT ck_produto_preco CHECK (preco_unitario >= 0 AND preco_unitario <> 'NaN'::numeric)
);

-- A obrigatoriedade entra após o preenchimento dos registros antigos e a adaptação da API.
ALTER TABLE public.material
    ADD COLUMN id_produto INT,
    ADD CONSTRAINT fk_material_produto FOREIGN KEY (id_produto)
        REFERENCES public.produto(id) ON DELETE RESTRICT;

CREATE INDEX idx_material_produto ON public.material(id_produto);
