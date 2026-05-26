"use client";

import { useState, useEffect } from "react";
import { Sync as SyncIcon, CheckCircle, ErrorOutline } from "@mui/icons-material";
const API = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";

type Status = "idle" | "loading" | "success" | "error";

export default function AtualizarAgentesPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile-based sync state
  const [profiles, setProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("all");

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch(`${API}/authStatus/all`);
        if (res.ok) {
          const json = await res.json();
          const list = (json.profiles ?? []).map((p: any) => p.profile);
          if (list.length === 0) list.push("default");
          setProfiles(list);
        }
      } catch {
        setProfiles(["default"]);
      }
    };
    fetchProfiles();
  }, []);

  const handleUpdate = async () => {
    setStatus("loading");
    setResult(null);
    setError(null);
    try {
      const targets = selectedProfile === "all" ? profiles : [selectedProfile];
      
      let total = 0;
      let inseridos = 0;
      let atualizados = 0;
      let desativados = 0;
      let erros: any[] = [];

      for (const prof of targets) {
        const res = await fetch(`${API}/updateNotebooks?profile=${encodeURIComponent(prof)}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.detail || `Falha ao atualizar o profile '${prof}': HTTP ${res.status}`);
        }
        total += json.total ?? 0;
        inseridos += json.inseridos ?? 0;
        atualizados += json.atualizados ?? 0;
        desativados += json.desativados ?? 0;
        if (json.erros) {
          erros = [...erros, ...json.erros];
        }
      }

      setResult({
        total,
        inseridos,
        atualizados,
        desativados,
        erros,
      });
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
          Atualizar Agentes
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Sincroniza os notebooks do NotebookLM com a tabela de agentes no banco de dados.
        </p>
      </div>

      {/* Info card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 24,
          marginBottom: 24,
        }}
      >
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Será executada uma chamada para{" "}
          <code
            style={{
              background: "var(--bg-hover)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 12,
              color: "var(--accent)",
            }}
          >
            GET /updateNotebooks
          </code>{" "}
          para cada conta / profile selecionado. Isso listará os notebooks disponíveis naquela conta do NotebookLM
          e os sincronizará com o banco de dados (inserindo novos, atualizando existentes e <strong>desativando</strong> os que não pertencem mais àquele profile específico, garantindo isolamento total).
        </p>
      </div>

      {/* Profile Selector */}
      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: 8,
          }}
        >
          Selecione a Conta / Profile para Sincronizar:
        </label>
        <select
          value={selectedProfile}
          onChange={(e) => setSelectedProfile(e.target.value)}
          disabled={status === "loading"}
          style={{
            width: "100%",
            maxWidth: 320,
            padding: "10px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            fontSize: 14,
            outline: "none",
            cursor: status === "loading" ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          <option value="all">🌐 Todos os Profiles ({profiles.length})</option>
          {profiles.map((prof) => (
            <option key={prof} value={prof}>
              🔑 {prof}
            </option>
          ))}
        </select>
      </div>

      {/* Action button */}
      <button
        onClick={handleUpdate}
        disabled={status === "loading"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 28px",
          borderRadius: "var(--radius-sm)",
          border: "none",
          background: status === "loading" ? "var(--bg-hover)" : "linear-gradient(135deg, var(--accent), var(--accent-hover, #a03534))",
          color: "#fff",
          fontSize: 15,
          fontWeight: 600,
          cursor: status === "loading" ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          fontFamily: "Inter, sans-serif",
          boxShadow: status === "loading" ? "none" : "0 4px 16px rgba(99, 102, 241, 0.4)",
          marginBottom: 24,
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
            <span className="spinner" /> Sincronizando...
          </>
        ) : (
          <>
            <SyncIcon /> Sincronizar Agentes
          </>
        )}
      </button>

      {/* Result */}
      {status === "success" && result && (
        <div
          style={{
            marginTop: 12,
            background: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            borderRadius: "var(--radius)",
            padding: 20,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <CheckCircle sx={{ color: "var(--success)", fontSize: 20 }} />
            <span style={{ color: "var(--success)", fontWeight: 600 }}>
              Sincronização concluída!
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Total Encontrados", result.total],
              ["Novos Inseridos", result.inseridos],
              ["Existentes Atualizados", result.atualizados],
              ["Removidos Desativados", result.desativados],
            ].map(([label, val]) => (
              <div
                key={label as string}
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 16px",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                  {label as string}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
                  {String(val)}
                </div>
              </div>
            ))}
          </div>
          {(result.erros as unknown[])?.length > 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--warning)" }}>
              ⚠️ {(result.erros as unknown[]).length} erro(s) encontrado(s)
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div
          style={{
            marginTop: 12,
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius)",
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <ErrorOutline sx={{ color: "var(--danger)", fontSize: 22 }} />
          <div>
            <div style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 4 }}>
              Erro na sincronização
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{error}</div>
          </div>
        </div>
      )}
    </div>
  );
}
