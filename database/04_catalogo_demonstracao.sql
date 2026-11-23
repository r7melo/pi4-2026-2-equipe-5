-- Apenas para a fixture de 02_seed.sql. Os preços abaixo são dados de demonstração.
WITH itens(nome, tipo, unidade, preco) AS (
    VALUES ('Painel Solar 550W', 'Painel', 'un', 350.00),
           ('Painel Solar 400W', 'Painel', 'un', 350.00),
           ('Inversor 3kW', 'Inversor', 'un', 1200.00),
           ('Inversor 5kW', 'Inversor', 'un', 1200.00),
           ('Inversor 8kW', 'Inversor', 'un', 1200.00),
           ('Inversor 10kW', 'Inversor', 'un', 1200.00),
           ('Cabo Solar 6mm', 'Cabo', 'm', 8.50)
), catalogo AS (
    INSERT INTO public.produto (nome, tipo, unidade, preco_unitario)
    SELECT nome, tipo, unidade, preco FROM itens
    RETURNING id, nome, preco_unitario
)
UPDATE public.material AS m
   SET id_produto = p.id
  FROM catalogo AS p
 WHERE m.id BETWEEN 501 AND 515
   AND m.tipo = p.nome
   AND m.custo_unitario = p.preco_unitario
   AND m.id_produto IS NULL;
