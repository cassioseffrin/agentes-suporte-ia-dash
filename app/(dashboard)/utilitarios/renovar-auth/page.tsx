"use client";

import { useState, useCallback, useRef } from "react";
import {
  CloudUpload as UploadIcon,
  CheckCircle,
  ErrorOutline,
  InfoOutlined,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

const API = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

type Status = "idle" | "dragging" | "ready" | "uploading" | "success" | "error";

interface UploadResult {
  valid: boolean;
  saved: boolean;
  bytes: number;
  cookies_count: number;
  message: string;
}

export default function RenovarAuthPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((f: File) => {
    if (!f.name.endsWith(".json")) {
      setError("Selecione um arquivo .json válido.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("ready");
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) acceptFile(f);
    },
    [acceptFile]
  );

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/uploadAuthState`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || `HTTP ${res.status}`);
      setResult(json);
      setStatus("success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setError(null);
  };

  const isDragging = status === "dragging";
  const isUploading = status === "uploading";

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 620 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Renovar Autenticação
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Faça upload do <code style={codeStyle}>storage_state.json</code> do Mac
          para renovar a sessão do NotebookLM no servidor.
        </p>
      </div>

      {/* Instructions */}
      <div style={infoCardStyle}>
        <InfoOutlined sx={{ color: "var(--accent)", fontSize: 20, flexShrink: 0, mt: "2px" }} />
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8 }}>
          <strong style={{ color: "var(--text-primary)" }}>Como obter o arquivo no Mac:</strong>
          <ol style={{ margin: "8px 0 0 16px", padding: 0 }}>
            {/* <li>
              Abra o Terminal e execute:{" "}
              <code style={codeStyle}>open ~/.notebooklm/</code>
            </li> */}
            <li>
              Copie o arquivo{" "}
              <code style={codeStyle}>storage_state.json</code> para sua área de trabalho
            </li>
            <li>Arraste o arquivo para a zona abaixo ou clique para selecionar</li>
          </ol>
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
            💡 Se o token expirou, execute primeiro{" "}
            <code style={codeStyle}>notebooklm login</code> no Mac para gerar um novo arquivo.
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setStatus("dragging"); }}
        onDragLeave={() => { if (status === "dragging") setStatus(file ? "ready" : "idle"); }}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--accent)" : file ? "rgba(16,185,129,0.5)" : "rgba(99,102,241,0.25)"}`,
          borderRadius: "var(--radius)",
          padding: "40px 24px",
          textAlign: "center",
          cursor: file ? "default" : "pointer",
          background: isDragging
            ? "rgba(99,102,241,0.08)"
            : file
            ? "rgba(16,185,129,0.05)"
            : "rgba(99,102,241,0.03)",
          transition: "all 0.2s ease",
          marginBottom: 20,
          position: "relative",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }}
        />

        {file ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <div
              style={{
                width: 44, height: 44, borderRadius: 10,
                background: "rgba(16,185,129,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <FileIcon sx={{ color: "#10b981", fontSize: 24 }} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                {file.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {(file.size / 1024).toFixed(1)} KB · pronto para upload
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              style={{
                marginLeft: 8, background: "none", border: "none",
                cursor: "pointer", color: "var(--text-muted)", display: "flex",
                padding: 4, borderRadius: 4,
              }}
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                width: 56, height: 56, borderRadius: 14,
                background: isDragging ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
                transition: "all 0.2s ease",
                transform: isDragging ? "scale(1.1)" : "scale(1)",
              }}
            >
              <UploadIcon sx={{ color: "var(--accent)", fontSize: 28 }} />
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 6 }}>
              {isDragging ? "Solte o arquivo aqui" : "Arraste o storage_state.json"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              ou{" "}
              <span style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "underline" }}>
                clique para selecionar
              </span>
            </div>
          </>
        )}
      </div>

      {/* Upload Button */}
      {file && status !== "success" && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "12px 32px", borderRadius: "var(--radius-sm)", border: "none",
            background: isUploading ? "var(--bg-hover)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: isUploading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease", fontFamily: "Inter, sans-serif",
            boxShadow: isUploading ? "none" : "0 4px 16px rgba(99,102,241,0.35)",
            width: "100%", justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            if (!isUploading) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "none";
          }}
        >
          {isUploading ? (
            <><span className="spinner" /> Enviando e validando...</>
          ) : (
            <><UploadIcon /> Enviar para o servidor</>
          )}
        </button>
      )}

      {/* Success */}
      {status === "success" && result && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ ...feedbackCardStyle, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <CheckCircle sx={{ color: "var(--success)", fontSize: 24, flexShrink: 0 }} />
            <div>
              <div style={{ color: "var(--success)", fontWeight: 600, marginBottom: 6, fontSize: 15 }}>
                {result.valid ? "Autenticação renovada!" : "Arquivo salvo (validação pendente)"}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {result.message}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
                <span>📦 {(result.bytes / 1024).toFixed(1)} KB</span>
                <span>🍪 {result.cookies_count} cookies</span>
              </div>
            </div>
          </div>
          <button onClick={reset} style={secondaryBtnStyle}>
            Enviar outro arquivo
          </button>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
          <div style={{ ...feedbackCardStyle, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <ErrorOutline sx={{ color: "var(--danger)", fontSize: 24, flexShrink: 0 }} />
            <div>
              <div style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 4 }}>
                Falha no upload
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {error}
              </div>
            </div>
          </div>
          <button onClick={reset} style={secondaryBtnStyle}>
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Styles ----

const codeStyle: React.CSSProperties = {
  background: "var(--bg-hover)",
  padding: "2px 6px",
  borderRadius: 4,
  fontSize: 12,
  color: "var(--accent)",
  fontFamily: "monospace",
};

const infoCardStyle: React.CSSProperties = {
  background: "rgba(99,102,241,0.07)",
  border: "1px solid rgba(99,102,241,0.2)",
  borderRadius: "var(--radius)",
  padding: 20,
  marginBottom: 24,
  display: "flex",
  gap: 12,
};

const feedbackCardStyle: React.CSSProperties = {
  borderRadius: "var(--radius)",
  padding: 20,
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  marginBottom: 16,
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 20px",
  color: "var(--text-secondary)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
  transition: "all 0.15s ease",
};
