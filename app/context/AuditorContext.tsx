"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Auditor {
  id: number;
  login: string;
  name: string | null;
  nickname: string | null;
  icon_svg: string | null;
  email: string | null;
}

interface AuditorContextValue {
  auditor: Auditor | null;
  setAuditor: (a: Auditor | null) => void;
  logout: () => void;
}

const AuditorContext = createContext<AuditorContextValue>({
  auditor: null,
  setAuditor: () => {},
  logout: () => {},
});

export function AuditorProvider({ children }: { children: ReactNode }) {
  const [auditor, setAuditorState] = useState<Auditor | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("auditor");
      if (raw) {
        setAuditorState(JSON.parse(raw));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const setAuditor = (a: Auditor | null) => {
    setAuditorState(a);
    if (a) {
      localStorage.setItem("auditor", JSON.stringify(a));
    } else {
      localStorage.removeItem("auditor");
    }
  };

  const logout = () => {
    setAuditor(null);
    localStorage.removeItem("isAuthenticated");
  };

  return (
    <AuditorContext.Provider value={{ auditor, setAuditor, logout }}>
      {children}
    </AuditorContext.Provider>
  );
}

export function useAuditor() {
  return useContext(AuditorContext);
}
