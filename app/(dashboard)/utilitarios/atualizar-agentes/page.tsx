"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircularProgress } from "@mui/material";

export default function AtualizarAgentesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/agentes");
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 320,
        gap: 16,
        animation: "fadeIn 0.3s ease",
      }}
    >
      <CircularProgress size={32} sx={{ color: "var(--accent, #bd4140)" }} />
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
        A função de sincronizar agentes foi integrada diretamente na tela de{" "}
        <strong style={{ color: "var(--text-primary)" }}>Agentes</strong>.
      </p>
      <Link
        href="/agentes"
        style={{
          color: "var(--accent, #bd4140)",
          fontSize: 13,
          textDecoration: "underline",
        }}
      >
        Ir para Agentes
      </Link>
    </div>
  );
}
