import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { SidebarContext } from "./SidebarContext";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  // 1. Persistência de Estado no localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      return saved !== null ? (JSON.parse(saved) as boolean) : false;
    } catch {
      return false;
    }
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(location.pathname);

  // Fecha o menu mobile durante a renderização se a rota mudou (sem efeito colateral em useEffect)
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname);
    setIsMobileOpen(false);
  }

  // Fecha o menu mobile ao pressionar ESC (Acessibilidade)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", JSON.stringify(next));
      } catch {
        // Falha silenciosa
      }
      return next;
    });
  }, []);

  const toggleMobile = useCallback(() => setIsMobileOpen((prev) => !prev), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  const contextValue = useMemo(() => ({
    isCollapsed,
    toggleCollapse,
    isMobileOpen,
    toggleMobile,
    closeMobile,
  }), [isCollapsed, toggleCollapse, isMobileOpen, toggleMobile, closeMobile]);

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  );
}
