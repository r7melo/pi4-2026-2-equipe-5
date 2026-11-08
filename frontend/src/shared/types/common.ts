// Tipos genéricos reutilizáveis entre domínios

/**
 * Envelope padrão de resposta paginada da API.
 * Pode ser usado no lugar de ListaObras quando houver outras entidades paginadas.
 */
export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  itens: T[];
}
