"use client";

import { useState } from "react";
import { Refresh as RefreshIcon, CheckCircle, ErrorOutline, InfoOutlined } from "@mui/icons-material";

const API = "http://localhost:8000";

type Status = "idle" | "loading" | "success" | "error";

export default function RenovarAuthPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<{ renewed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setStatus("loading");
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API}/refreshAuth`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || `HTTP ${res.status}`);
      setResult(json);
      setStatus("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
      setStatus("error");
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Renovar Autenticação
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Verifica e renova a sessão do NotebookLM via SCP do Mac de desenvolvimento.
        </p>
      </div>

      {/* Info card */}
      <div
        style={{
          background: "rgba(99, 102, 241, 0.07)",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          borderRadius: "var(--radius)",
          padding: 20,
          marginBottom: 24,
          display: "flex",
          gap: 12,
        }}
      >
        <InfoOutlined sx={{ color: "var(--accent)", fontSize: 20, flexShrink: 0, marginTop: "2px" }} />
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Este processo executa o{" "}
          <code
            style={{
              background: "var(--bg-hover)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 12,
              color: "var(--accent)",
            }}
          >
            auth_manager.py
          </code>{" "}
          no servidor. Se a sessão estiver expirada, ele tentará transferir o arquivo{" "}
          <code
            style={{
              background: "var(--bg-hover)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 12,
              color: "var(--text-primary)",
            }}
          >
            ~/.notebooklm/storage_state.json
          </code>{" "}
          do Mac via SCP (requer variáveis <strong style={{ color: "var(--text-primary)" }}>MAC_HOST</strong> e{" "}
          <strong style={{ color: "var(--text-primary)" }}>MAC_USER</strong> configuradas no{" "}
          <code
            style={{
              background: "var(--bg-hover)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 12,
              color: "var(--text-primary)",
            }}
          >
            .env
          </code>{" "}
          do servidor).
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleRefresh}
        disabled={status === "loading"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 28px",
          borderRadius: "var(--radius-sm)",
          border: "none",
          background: status === "loading" ? "var(--bg-hover)" : "linear-gradient(135deg, #10b981, #0d9488)",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          cursor: status === "loading" ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          fontFamily: "Inter, sans-serif",
          boxShadow: status === "loading" ? "none" : "0 4px 16px rgba(16, 185, 129, 0.35)",
        }}
        onMouseEnter={(e) => {
          if (status !== "loading")
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = "none";
        }}
      >
        {status === "loading" ? (
          <>
            <span className="spinner" /> Verificando sessão...
          </>
        ) : (
          <>
            <RefreshIcon /> Renovar Token de Autenticação
          </>
        )}
      </button>

      {/* Success */}
      {status === "success" && result && (
        <div
          style={{
            marginTop: 24,
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <CheckCircle sx={{ color: "var(--success)", fontSize: 22 }} />
          <div>
            <div style={{ color: "var(--success)", fontWeight: 600, marginBottom: 4 }}>
              {result.renewed ? "Sessão renovada com sucesso!" : "Sessão já estava válida."}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {result.renewed
                ? "A autenticação do NotebookLM foi transferida e validada."
                : "Nenhuma ação necessária — o token atual ainda é válido."}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div
          style={{
            marginTop: 24,
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <ErrorOutline sx={{ color: "var(--danger)", fontSize: 22, flexShrink: 0 }} />
          <div>
            <div style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 4 }}>
              Falha na renovação
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {error}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
              Verifique se as variáveis MAC_HOST e MAC_USER estão configuradas no .env do servidor,
              e se o Mac está acessível via SCP.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
