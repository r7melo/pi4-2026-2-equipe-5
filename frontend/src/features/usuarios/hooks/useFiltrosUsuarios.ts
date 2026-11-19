import { useEffect, useState } from "react";
import { useListaUsuarios } from "./useGestaoUsuarios";
import type { FiltrosUsuarios } from "../types/gestaoUsuarios";

const filtrosIniciais = (): FiltrosUsuarios => ({ page: 1, pageSize: 20, busca: "", ativo: "true" });

export function useFiltrosUsuarios() {
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const lista = useListaUsuarios(filtros);
  useEffect(() => {
    const timer = setTimeout(() => setFiltros(atual => atual.busca === busca.trim() ? atual : { ...atual, busca: busca.trim(), page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [busca]);
  useEffect(() => {
    if (!lista.data || lista.data.itens.length || filtros.page === 1) return;
    const page = Math.max(1, Math.ceil(lista.data.total / filtros.pageSize));
    if (page < filtros.page) {
      const frame = requestAnimationFrame(() => setFiltros(atual => ({ ...atual, page })));
      return () => cancelAnimationFrame(frame);
    }
  }, [lista.data, filtros.page, filtros.pageSize]);
  function limpar() { setBusca(""); setFiltros(filtrosIniciais()); }
  function mudarPerfil(perfil: FiltrosUsuarios["perfil"]) { setFiltros(atual => ({ ...atual, page: 1, perfil })); }
  function mudarStatus(ativo: FiltrosUsuarios["ativo"]) { setFiltros(atual => ({ ...atual, page: 1, ativo })); }
  function mudarPagina(page: number) { setFiltros(atual => ({ ...atual, page })); }
  return { busca, setBusca, filtros, lista, limpar, mudarPerfil, mudarStatus, mudarPagina,
    filtrado: !!(busca || filtros.perfil || filtros.ativo !== "true") };
}
