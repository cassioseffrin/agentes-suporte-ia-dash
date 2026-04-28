"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  CloudUpload as UploadIcon,
  CheckCircle,
  ErrorOutline,
  InfoOutlined,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  WifiProtectedSetup as RefreshStatusIcon,
  Circle as DotIcon,
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

interface AuthStatus {
  exists: boolean;
  valid: boolean;
  cookies_count: number;
  expires_at: string | null;
  file_age_hours: number | null;
  message: string;
}

export default function RenovarAuthPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const fetchAuthStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch(`${API}/authStatus`);
      if (res.ok) setAuthStatus(await res.json());
    } catch {
      setAuthStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthStatus();
  }, [fetchAuthStatus]);

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
      // Refresh status card after a short delay so backend finishes validating
      setTimeout(() => fetchAuthStatus(), 1500);
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

  const expiresLabel = (() => {
    if (!authStatus?.expires_at) return null;
    const d = new Date(authStatus.expires_at);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffMs < 0) return "Expirado";
    if (diffDays > 0) return `Expira em ${diffDays}d ${diffHours}h`;
    if (diffHours > 0) return `Expira em ${diffHours}h`;
    return "Expira em breve";
  })();

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

      {/* Auth Status Card */}
      <div style={{
        background: loadingStatus
          ? "var(--bg-surface)"
          : authStatus?.valid
          ? "rgba(16,185,129,0.07)"
          : "rgba(239,68,68,0.07)",
        border: `1px solid ${
          loadingStatus
            ? "var(--border)"
            : authStatus?.valid
            ? "rgba(16,185,129,0.25)"
            : "rgba(239,68,68,0.25)"
        }`,
        borderRadius: "var(--radius)",
        padding: "16px 20px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        gap: 14,
        transition: "all 0.3s ease",
      }}>
        {/* Dot indicator */}
        <div style={{
          width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
          background: loadingStatus
            ? "var(--text-muted)"
            : authStatus?.valid
            ? "#10b981"
            : "#ef4444",
          boxShadow: loadingStatus
            ? "none"
            : authStatus?.valid
            ? "0 0 6px rgba(16,185,129,0.6)"
            : "0 0 6px rgba(239,68,68,0.6)",
          animation: !loadingStatus && authStatus?.valid ? "pulse-glow 2s infinite" : "none",
        }} />

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 13, fontWeight: 600,
            color: loadingStatus
              ? "var(--text-secondary)"
              : authStatus?.valid
              ? "var(--success)"
              : "var(--danger)",
            marginBottom: 4,
          }}>
            {loadingStatus
              ? "Verificando sessão…"
              : authStatus
              ? authStatus.message
              : "Não foi possível verificar o status."}
          </div>
          {!loadingStatus && authStatus?.exists && (
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)", flexWrap: "wrap" }}>
              <span>🍪 {authStatus.cookies_count} cookies</span>
              {authStatus.file_age_hours !== null && (
                <span>📁 Arquivo atualizado há {authStatus.file_age_hours}h</span>
              )}
              {expiresLabel && (
                <span style={{ color: authStatus.valid ? "var(--text-muted)" : "var(--danger)", fontWeight: 500 }}>
                  ⏰ {expiresLabel}
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={fetchAuthStatus}
          disabled={loadingStatus}
          title="Verificar novamente"
          style={{
            background: "none", border: "none", cursor: loadingStatus ? "default" : "pointer",
            color: "var(--text-muted)", padding: 6, borderRadius: 6,
            opacity: loadingStatus ? 0.4 : 1, transition: "opacity 0.2s",
            display: "flex",
          }}
        >
          <RefreshStatusIcon fontSize="small" style={{ animation: loadingStatus ? "spin 1s linear infinite" : "none" }} />
        </button>
      </div>

      {/* Instructions */}
      <div style={infoCardStyle}>
        <InfoOutlined sx={{ color: "var(--accent)", fontSize: 22, flexShrink: 0, mt: "2px" }} />
        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.8, width: "100%" }}>
          <strong style={{ color: "var(--text-primary)", fontSize: 15, display: "block", marginBottom: 12 }}>
            Como renovar a autenticação:
          </strong>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Step 1 */}
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={stepNumberStyle}>1</span> Preparar Ambiente (Venv)
              </div>
              <p style={{ margin: "4px 0 8px 30px", opacity: 0.8 }}>
                Se for a primeira vez ou se não tiver o ambiente configurado no Mac:
              </p>
              <div style={{ marginLeft: 30 }}>
                <code style={terminalStyle}>
                  cd dev/agentes-suporte-ia<br />
                  python3 -m venv venv<br />
                  source venv/bin/activate<br />
                  pip install "notebooklm-py[browser]"<br />
                  playwright install chromium
                </code>
              </div>
            </div>

            {/* Step 2 */}
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={stepNumberStyle}>2</span> Iniciar Autenticação
              </div>
              <p style={{ margin: "4px 0 8px 30px", opacity: 0.8 }}>
                Com o terminal aberto e o <strong>venv ativo</strong>, execute:
              </p>
              <div style={{ marginLeft: 30 }}>
                <code style={terminalStyle}>
                  # Certifique-se de estar com o venv ativo (source venv/bin/activate)<br />
                  notebooklm login
                </code>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={stepNumberStyle}>3</span> Fluxo no Navegador
              </div>
              <ul style={{ margin: "4px 0 0 30px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                <li>• Complete o login do Google no navegador que será aberto automaticamente.</li>
                <li>• Aguarde carregar a página inicial do NotebookLM (onde aparecem seus notebooks).</li>
                <li>• Volte ao Terminal e pressione <kbd style={kbdStyle}>ENTER</kbd> para salvar a sessão.</li>
              </ul>
            </div>

            {/* Step 4 */}
            <div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={stepNumberStyle}>4</span> Coletar e Upload
              </div>
              <p style={{ margin: "4px 0 8px 30px", opacity: 0.8 }}>
                O arquivo será gerado em <code>~/.notebooklm/storage_state.json</code>.
              </p>
              <div style={{ marginLeft: 30 }}>
                <code style={terminalStyle}>
                  cp ~/.notebooklm/storage_state.json ~/Desktop
                </code>
              </div>
              <p style={{ margin: "8px 0 0 30px", fontSize: 12, fontStyle: "italic" }}>
                Arraste o arquivo da sua Área de Trabalho para a zona de upload abaixo.
              </p>
            </div>
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
          border: `2px dashed ${isDragging ? "var(--accent)" : file ? "rgba(16,185,129,0.5)" : "rgba(189, 65, 64, 0.5)"}`,
          borderRadius: "var(--radius)",
          padding: "40px 24px",
          textAlign: "center",
          cursor: file ? "default" : "pointer",
          background: isDragging
            ? "rgba(189, 65, 64, 0.08)"
            : file
            ? "rgba(16,185,129,0.05)"
            : "rgba(189, 65, 64, 0.03)",
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
                background: isDragging ? "rgba(189, 65, 64, 0.15)" : "rgba(189, 65, 64, 0.08)",
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
            background: isUploading ? "var(--bg-hover)" : "linear-gradient(135deg, var(--accent, #bd4140), var(--accent-hover, #a03534))",
            color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: isUploading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease", fontFamily: "Inter, sans-serif",
            boxShadow: isUploading ? "none" : "0 4px 16px rgba(189, 65, 64, 0.35)",
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

const terminalStyle: React.CSSProperties = {
  background: "#0f172a",
  padding: "12px 16px",
  borderRadius: 8,
  fontSize: 12,
  color: "#38bdf8",
  fontFamily: "'Fira Code', monospace",
  display: "block",
  border: "1px solid rgba(56, 189, 248, 0.2)",
  lineHeight: 1.6,
  position: "relative",
  overflowX: "auto",
};

const stepNumberStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: "50%",
  background: "var(--accent)",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
};

const kbdStyle: React.CSSProperties = {
  background: "var(--bg-hover)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  padding: "1px 6px",
  fontSize: 11,
  fontFamily: "sans-serif",
  boxShadow: "0 2px 0 var(--border)",
  color: "var(--text-primary)",
};

const codeStyle: React.CSSProperties = {
  background: "var(--bg-hover)",
  padding: "2px 6px",
  borderRadius: 4,
  fontSize: 12,
  color: "#fca5a5",
  fontFamily: "monospace",
};

const infoCardStyle: React.CSSProperties = {
  background: "rgba(189, 65, 64, 0.04)",
  border: "1px solid rgba(189, 65, 64, 0.15)",
  borderRadius: "var(--radius)",
  padding: "24px 20px",
  marginBottom: 24,
  display: "flex",
  gap: 16,
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
