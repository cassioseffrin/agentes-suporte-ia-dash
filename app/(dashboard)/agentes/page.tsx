"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import ReactMarkdown from "react-markdown";
import {
  TextField,
  Switch,
  FormControlLabel,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  Save as SaveIcon,
  SmartToy as AgentIcon,
  CheckCircle,
  ErrorOutline,
  EditNote as EditIcon,
  Circle as CircleIcon,
  Article as FaqIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

const API = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";

// Dark MUI theme matching dashboard palette
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#bd4140" },
    background: { default: "#0f1117", paper: "#21253a" },
    text: { primary: "#f1f5f9", secondary: "#94a3b8" },
  },
  typography: { fontFamily: "Inter, sans-serif" },
  components: {
    MuiTextField: {
      defaultProps: { variant: "outlined", size: "small", fullWidth: true },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#1a1d27",
            "& fieldset": { borderColor: "#2d3352" },
            "&:hover fieldset": { borderColor: "#374167" },
            "&.Mui-focused fieldset": { borderColor: "var(--accent, #bd4140)" },
          },
          "& .MuiInputLabel-root": { color: "#94a3b8" },
          "& input, & textarea": { color: "#f1f5f9", fontSize: 14 },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: "var(--accent, #bd4140)" }, "&.Mui-checked + .MuiSwitch-track": { backgroundColor: "var(--accent, #bd4140)" } },
      },
    },
  },
});

interface Agent {
  id: string;
  title: string;
  name: string;
  system_prompt: string | null;
  email: string | null;
  overview: string | null;
  sort_order: number;
  active: boolean;
  creation: string | null;
  modification: string | null;
  faq_content: string | null;
}

type FormValues = Omit<Agent, "id" | "creation" | "modification">;
type SaveStatus = "idle" | "saving" | "success" | "error";
type FaqStatus = "idle" | "loading" | "saving" | "success" | "error";

// ─── Markdown Toolbar ──────────────────────────────────────────────────────────
function MarkdownToolbar({ onInsert }: { onInsert: (prefix: string, suffix?: string, placeholder?: string) => void }) {
  const btn = (label: string, title: string, prefix: string, suffix = "", placeholder = "texto") => (
    <Tooltip title={title} key={label}>
      <button
        type="button"
        onClick={() => onInsert(prefix, suffix, placeholder)}
        style={{
          background: "none",
          border: "1px solid #2d3352",
          borderRadius: 4,
          color: "#94a3b8",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          padding: "3px 8px",
          fontFamily: "Inter, sans-serif",
          transition: "all 0.15s",
          lineHeight: 1.5,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "#2d3352";
          (e.currentTarget as HTMLElement).style.color = "#f1f5f9";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "none";
          (e.currentTarget as HTMLElement).style.color = "#94a3b8";
        }}
      >
        {label}
      </button>
    </Tooltip>
  );

  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: "6px 10px",
        background: "#12151e",
        borderBottom: "1px solid #2d3352",
        flexWrap: "wrap",
        alignItems: "center",
        borderRadius: "6px 6px 0 0",
      }}
    >
      {btn("B", "Negrito", "**", "**", "texto")}
      {btn("I", "Itálico", "_", "_", "texto")}
      {btn("H1", "Título H1", "# ", "", "Título")}
      {btn("H2", "Título H2", "## ", "", "Seção")}
      {btn("H3", "Título H3", "### ", "", "Subseção")}
      <div style={{ width: 1, height: 18, background: "#2d3352", margin: "0 4px" }} />
      {btn("• Lista", "Lista com marcadores", "- ", "", "item")}
      {btn("1. Lista", "Lista numerada", "1. ", "", "item")}
      {btn("[ ] Task", "Lista de tarefas", "- [ ] ", "", "tarefa")}
      <div style={{ width: 1, height: 18, background: "#2d3352", margin: "0 4px" }} />
      {btn("`code`", "Código inline", "`", "`", "código")}
      {btn("```bloco```", "Bloco de código", "```\n", "\n```", "código")}
      {btn("---", "Separador", "\n---\n", "", "")}
      {btn("> Cit.", "Citação", "> ", "", "texto")}
    </div>
  );
}

// ─── FAQ Markdown Editor ───────────────────────────────────────────────────────
type SyncStatus = "idle" | "syncing" | "success" | "error";

function FaqEditor({
  agentId,
  agentTitle,
  onClose,
  onSaved,
}: {
  agentId: string;
  agentTitle: string;
  onClose: () => void;
  onSaved: (newContent: string) => void;
}) {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [status, setStatus] = useState<FaqStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "split">("split");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Lazy-fetch faq_content from GET /agents/{id} when editor opens or agent changes
  useEffect(() => {
    setStatus("loading");
    setErrorMsg(null);
    setSyncStatus("idle");
    setSyncError(null);
    fetch(`${API}/agents/${agentId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const text = json.faq_content ?? "";
        setContent(text);
        setOriginal(text);
        setStatus("idle");
      })
      .catch((e) => {
        setContent("");
        setOriginal("");
        setStatus("idle");
        console.warn("[FaqEditor] fetch:", e.message);
      });
  }, [agentId]);

  const isDirty = content !== original;

  // Markdown toolbar insert helper
  const handleInsert = useCallback(
    (prefix: string, suffix = "", placeholder = "texto") => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = ta.value.slice(start, end) || placeholder;
      const before = ta.value.slice(0, start);
      const after = ta.value.slice(end);
      const newText = before + prefix + selected + suffix + after;
      setContent(newText);
      setTimeout(() => {
        ta.focus();
        const newPos = start + prefix.length + selected.length + suffix.length;
        ta.setSelectionRange(newPos, newPos);
      }, 0);
    },
    []
  );

  const handleSave = async () => {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faq_content: content }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.detail ?? `HTTP ${res.status}`);
      }
      setOriginal(content);
      onSaved(content);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Erro desconhecido");
      setStatus("error");
    }
  };

  const handleSync = async () => {
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      const res = await fetch(`${API}/agents/${agentId}/sync-faq`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.status === "error") {
        throw new Error(
          json.detail ?? json.notebook_result?.error ?? `HTTP ${res.status}`
        );
      }
      setSyncStatus("success");
      setTimeout(() => setSyncStatus("idle"), 4000);
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : "Erro desconhecido");
      setSyncStatus("error");
    }
  };

  const tabStyle = (active: boolean) => ({
    padding: "5px 14px",
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid",
    borderColor: active ? "var(--accent, #bd4140)" : "#2d3352",
    borderRadius: 4,
    background: active ? "rgba(189,65,64,0.12)" : "none",
    color: active ? "var(--accent, #bd4140)" : "#94a3b8",
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    transition: "all 0.15s",
  } as React.CSSProperties);

  return (
    <div
      style={{
        marginTop: 20,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
        animation: "fadeIn 0.25s ease",
      }}
    >
      {/* FAQ Editor Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "#12151e",
          borderBottom: "1px solid #2d3352",
        }}
      >
        <FaqIcon sx={{ fontSize: 18, color: "var(--accent, #bd4140)" }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>
          FAQ — {agentTitle}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>
          Markdown
        </span>

        {/* View mode tabs */}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {(["edit", "split", "preview"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setActiveTab(mode)}
              style={tabStyle(activeTab === mode)}
            >
              {mode === "edit" ? "✏️ Editar" : mode === "split" ? "⬛ Split" : "👁 Preview"}
            </button>
          ))}
        </div>

        <Tooltip title="Fechar editor de FAQ">
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              marginLeft: 8,
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </button>
        </Tooltip>
      </div>

      {/* Loading state */}
      {status === "loading" && (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <CircularProgress size={28} sx={{ color: "var(--accent, #bd4140)" }} />
        </div>
      )}

      {/* Editor body */}
      {status !== "loading" && (
        <>
          {/* Toolbar (shown in edit & split modes) */}
          {activeTab !== "preview" && (
            <MarkdownToolbar onInsert={handleInsert} />
          )}

          {/* Editor panes */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: activeTab === "split" ? "1fr 1fr" : "1fr",
              minHeight: 360,
              maxHeight: 520,
            }}
          >
            {/* Left: Edit pane */}
            {activeTab !== "preview" && (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`# FAQ — ${agentTitle}\n\n## Pergunta frequente 1\nResposta aqui...\n\n## Pergunta frequente 2\nResposta aqui...`}
                spellCheck={false}
                style={{
                  background: "#0f1117",
                  color: "#e2e8f0",
                  border: "none",
                  borderRight: activeTab === "split" ? "1px solid #2d3352" : "none",
                  padding: "16px",
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                  fontSize: 13,
                  lineHeight: 1.7,
                  resize: "none",
                  outline: "none",
                  overflowY: "auto",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            )}

            {/* Right: Preview pane */}
            {activeTab !== "edit" && (
              <div
                style={{
                  background: "#0d1020",
                  overflowY: "auto",
                  padding: "16px 20px",
                  color: "#e2e8f0",
                  fontSize: 13.5,
                  lineHeight: 1.75,
                  maxHeight: 520,
                }}
              >
                {content.trim() ? (
                  <div className="faq-preview">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "#3d4565",
                      gap: 8,
                      paddingTop: 60,
                    }}
                  >
                    <FaqIcon sx={{ fontSize: 40, opacity: 0.3 }} />
                    <span style={{ fontSize: 13 }}>Preview aparecerá aqui…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FAQ Save footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderTop: "1px solid #2d3352",
              background: "#12151e",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={status === "saving" || !isDirty}
              onClick={handleSave}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 20px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background:
                  status === "saving" || !isDirty
                    ? "#1e2233"
                    : "linear-gradient(135deg, var(--accent, #bd4140), #a03534)",
                color: status === "saving" || !isDirty ? "#4a5068" : "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: status === "saving" || !isDirty ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {status === "saving" ? (
                <>
                  <CircularProgress size={13} sx={{ color: "#fff" }} /> Salvando...
                </>
              ) : (
                <>
                  <SaveIcon sx={{ fontSize: 16 }} /> Salvar FAQ
                </>
              )}
            </button>

            {status === "success" && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--success)",
                  fontSize: 12,
                  animation: "fadeIn 0.2s ease",
                }}
              >
                <CheckCircle sx={{ fontSize: 14 }} /> FAQ salvo!
              </span>
            )}

            {status === "error" && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--danger)",
                  fontSize: 12,
                  animation: "fadeIn 0.2s ease",
                }}
              >
                <ErrorOutline sx={{ fontSize: 14 }} /> {errorMsg}
              </span>
            )}

            {isDirty && status === "idle" && (
              <span style={{ fontSize: 11, color: "var(--warning)" }}>
                ● Alterações não salvas
              </span>
            )}

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: "#2d3352", marginLeft: "auto", flexShrink: 0 }} />

            {/* NotebookLM Sync button */}
            <Tooltip title="Sincroniza o FAQ atual com a source do NotebookLM do agente. Operação pode levar alguns segundos.">
              <button
                type="button"
                disabled={syncStatus === "syncing" || !!isDirty || !content.trim()}
                onClick={handleSync}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid",
                  borderColor:
                    syncStatus === "success"
                      ? "var(--success, #22c55e)"
                      : syncStatus === "error"
                      ? "var(--danger, #ef4444)"
                      : "#3a4570",
                  background:
                    syncStatus === "syncing" || isDirty || !content.trim()
                      ? "#1e2233"
                      : syncStatus === "success"
                      ? "rgba(34,197,94,0.1)"
                      : syncStatus === "error"
                      ? "rgba(239,68,68,0.1)"
                      : "#1e2233",
                  color:
                    syncStatus === "syncing" || isDirty || !content.trim()
                      ? "#3a4570"
                      : syncStatus === "success"
                      ? "var(--success, #22c55e)"
                      : syncStatus === "error"
                      ? "var(--danger, #ef4444)"
                      : "#7c8db0",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor:
                    syncStatus === "syncing" || isDirty || !content.trim()
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.2s ease",
                  fontFamily: "Inter, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {syncStatus === "syncing" ? (
                  <><CircularProgress size={11} sx={{ color: "currentColor" }} /> Sincronizando...</>
                ) : syncStatus === "success" ? (
                  <><CheckCircle sx={{ fontSize: 13 }} /> NotebookLM atualizado!</>
                ) : syncStatus === "error" ? (
                  <><ErrorOutline sx={{ fontSize: 13 }} /> {syncError ?? "Erro"}</>
                ) : (
                  <>🔁 Sync NotebookLM</>
                )}
              </button>
            </Tooltip>

            <span style={{ fontSize: 11, color: "#3d4565" }}>
              {content.trim().split(/\s+/).filter(Boolean).length} palavras ·{" "}
              {content.length} chars
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Agent Card ────────────────────────────────────────────────────────────────
function AgentCard({
  agent,
  selected,
  onClick,
}: {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid",
        borderColor: selected ? "var(--accent)" : "var(--border)",
        background: selected ? "var(--accent-light)" : "var(--bg-card)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
      }}
      onMouseEnter={(e) => {
        if (!selected)
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-light)";
      }}
      onMouseLeave={(e) => {
        if (!selected)
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: selected
            ? "linear-gradient(135deg, var(--accent), var(--accent-hover, #a03534))"
            : "var(--bg-hover)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 16,
        }}
      >
        🤖
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: selected ? "var(--accent)" : "var(--text-primary)",
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {agent.title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {agent.name} · #{agent.sort_order}
        </div>
      </div>
      <Tooltip title={agent.active ? "Ativo" : "Inativo"}>
        <CircleIcon
          sx={{
            fontSize: 10,
            color: agent.active ? "var(--success)" : "var(--text-muted)",
            flexShrink: 0,
          }}
        />
      </Tooltip>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AgentesPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showFaq, setShowFaq] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>();

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/agents/all`);
      const json = await res.json();
      setAgents(json.agents ?? []);
    } catch {
      /* ignored */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const selectAgent = (agent: Agent) => {
    setSelected(agent);
    setSaveStatus("idle");
    setSaveError(null);
    setShowFaq(false);
    reset({
      title: agent.title,
      name: agent.name,
      system_prompt: agent.system_prompt ?? "",
      email: agent.email ?? "",
      overview: agent.overview ?? "",
      sort_order: agent.sort_order,
      active: agent.active,
    });
  };

  const onSubmit = async (data: FormValues) => {
    if (!selected) return;
    setSaveStatus("saving");
    setSaveError(null);
    try {
      const res = await fetch(`${API}/agents/${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, sort_order: Number(data.sort_order) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail ?? `HTTP ${res.status}`);
      setSaveStatus("success");
      setAgents((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? { ...a, ...data, modification: json.modification }
            : a
        )
      );
      setSelected((prev) =>
        prev ? { ...prev, ...data, modification: json.modification } : prev
      );
      reset(data);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Erro desconhecido");
      setSaveStatus("error");
    }
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <ThemeProvider theme={darkTheme}>
      {/* Scoped FAQ preview styles */}
      <style>{`
        .faq-preview h1 { font-size: 1.35em; font-weight: 700; color: #f1f5f9; margin: 0.8em 0 0.4em; border-bottom: 1px solid #2d3352; padding-bottom: 0.3em; }
        .faq-preview h2 { font-size: 1.1em; font-weight: 700; color: #bf7178; margin: 1em 0 0.35em; }
        .faq-preview h3 { font-size: 0.95em; font-weight: 600; color: #94a3b8; margin: 0.8em 0 0.3em; }
        .faq-preview p  { margin: 0 0 0.75em; color: #cbd5e1; }
        .faq-preview ul, .faq-preview ol { margin: 0 0 0.75em 1.4em; color: #cbd5e1; }
        .faq-preview li { margin-bottom: 0.3em; }
        .faq-preview code { background: #1e2233; color: #e2a8a2; padding: 1px 5px; border-radius: 3px; font-size: 0.87em; font-family: 'Fira Code', monospace; }
        .faq-preview pre { background: #1a1d27; border: 1px solid #2d3352; border-radius: 6px; padding: 12px 14px; overflow-x: auto; margin: 0 0 1em; }
        .faq-preview pre code { background: none; color: #a3d9b1; padding: 0; }
        .faq-preview blockquote { border-left: 3px solid #bd4140; margin: 0 0 0.75em; padding: 4px 0 4px 12px; color: #94a3b8; font-style: italic; }
        .faq-preview hr { border: none; border-top: 1px solid #2d3352; margin: 1em 0; }
        .faq-preview strong { color: #f1f5f9; }
        .faq-preview a { color: #bd4140; text-decoration: underline; }
        .faq-preview input[type="checkbox"] { margin-right: 6px; accent-color: #bd4140; }
      `}</style>

      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
             Agentes de Suporte IA
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Selecione um agente para editar suas configurações.
          </p>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* Left: agent list */}
          <div
            style={{
              width: 280,
              flexShrink: 0,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 16,
              maxHeight: "calc(100vh - 160px)",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 12,
                paddingLeft: 4,
              }}
            >
              {loading ? "Carregando..." : `${agents.length} agentes`}
            </div>

            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
                <CircularProgress size={24} sx={{ color: "var(--accent)" }} />
              </div>
            ) : agents.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 16px",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                Nenhum agente encontrado.
                <br />
                Execute "Atualizar Agentes" primeiro.
              </div>
            ) : (
              agents.map((a) => (
                <AgentCard
                  key={a.id}
                  agent={a}
                  selected={selected?.id === a.id}
                  onClick={() => selectAgent(a)}
                />
              ))
            )}
          </div>

          {/* Right: edit panel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 64,
                  color: "var(--text-muted)",
                  gap: 12,
                }}
              >
                <AgentIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                <span style={{ fontSize: 14 }}>
                  Selecione um agente na lista para editar
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Panel header */}
                <div
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "20px 24px",
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, var(--accent), var(--accent-hover, #a03534))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    🤖
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {selected.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      ID: {selected.id}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)" }}>
                    <div>Criado: {fmtDate(selected.creation)}</div>
                    <div>Modificado: {fmtDate(selected.modification)}</div>
                  </div>

                  {/* ── FAQ Button ── */}
                  <Tooltip title={showFaq ? "Fechar editor de FAQ" : "Editar FAQ do agente (Markdown)"}>
                    <button
                      type="button"
                      onClick={() => setShowFaq((v) => !v)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                        padding: "7px 14px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid",
                        borderColor: showFaq ? "var(--accent, #bd4140)" : "#2d3352",
                        background: showFaq
                          ? "rgba(189,65,64,0.15)"
                          : "var(--bg-hover)",
                        color: showFaq ? "var(--accent, #bd4140)" : "#94a3b8",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "Inter, sans-serif",
                        transition: "all 0.2s ease",
                        marginLeft: 8,
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        if (!showFaq) {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--accent, #bd4140)";
                          (e.currentTarget as HTMLElement).style.color = "var(--accent, #bd4140)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!showFaq) {
                          (e.currentTarget as HTMLElement).style.borderColor = "#2d3352";
                          (e.currentTarget as HTMLElement).style.color = "#94a3b8";
                        }
                      }}
                    >
                      <FaqIcon sx={{ fontSize: 17 }} />
                      {showFaq ? "Fechar FAQ" : "Editar FAQ"}
                    </button>
                  </Tooltip>

                  <EditIcon sx={{ color: "var(--accent)", fontSize: 20, marginLeft: 4 }} />
                </div>

                {/* Form fields */}
                <div
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                  }}
                >
                  {/* Row 1: title + name */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 16 }}>
                    <TextField
                      label="Título"
                      {...register("title", { required: true })}
                    />
                    <TextField
                      label="Nome (chave)"
                      {...register("name")}
                      inputProps={{ style: { fontFamily: "monospace", fontSize: 13 } }}
                    />
                  </div>

                  {/* Row 2: email + sort_order + active */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 120px auto", gap: 16, alignItems: "center" }}>
                    <TextField
                      label="Email"
                      type="email"
                      {...register("email")}
                    />
                    <TextField
                      label="Ordem"
                      type="number"
                      {...register("sort_order")}
                      inputProps={{ min: 0, style: { textAlign: "center" } }}
                    />
                    <Controller
                      name="active"
                      control={control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Switch
                              checked={field.value}
                              onChange={field.onChange}
                              color="primary"
                            />
                          }
                          label={
                            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                              Ativo
                            </span>
                          }
                        />
                      )}
                    />
                  </div>

                  {/* Overview */}
                  <TextField
                    label="Descrição (overview)"
                    multiline
                    rows={2}
                    {...register("overview")}
                  />

                  {/* System prompt */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        marginBottom: 8,
                      }}
                    >
                      System Prompt
                    </div>
                    <TextField
                      label="System Prompt"
                      multiline
                      rows={10}
                      {...register("system_prompt")}
                      inputProps={{
                        style: { fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 },
                      }}
                    />
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      paddingTop: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={saveStatus === "saving" || !isDirty}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 24px",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        background:
                          saveStatus === "saving" || !isDirty
                            ? "var(--bg-hover)"
                            : "linear-gradient(135deg, var(--accent), var(--accent-hover, #a03534))",
                        color:
                          saveStatus === "saving" || !isDirty
                            ? "var(--text-muted)"
                            : "#fff",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor:
                          saveStatus === "saving" || !isDirty
                            ? "not-allowed"
                            : "pointer",
                        transition: "all 0.2s ease",
                        fontFamily: "Inter, sans-serif",
                        boxShadow:
                          !isDirty || saveStatus === "saving"
                            ? "none"
                            : "0 4px 14px rgba(189, 65, 64, 0.35)",
                      }}
                    >
                      {saveStatus === "saving" ? (
                        <>
                          <span className="spinner" style={{ width: 16, height: 16 }} />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <SaveIcon sx={{ fontSize: 18 }} /> Salvar Alterações
                        </>
                      )}
                    </button>

                    {saveStatus === "success" && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--success)",
                          fontSize: 13,
                          fontWeight: 500,
                          animation: "fadeIn 0.2s ease",
                        }}
                      >
                        <CheckCircle sx={{ fontSize: 16 }} /> Salvo com sucesso!
                      </span>
                    )}

                    {saveStatus === "error" && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--danger)",
                          fontSize: 13,
                          animation: "fadeIn 0.2s ease",
                        }}
                      >
                        <ErrorOutline sx={{ fontSize: 16 }} /> {saveError}
                      </span>
                    )}

                    {isDirty && saveStatus === "idle" && (
                      <span style={{ fontSize: 12, color: "var(--warning)", marginLeft: "auto" }}>
                        ● Alterações não salvas
                      </span>
                    )}
                  </div>
                </div>

                {/* ── FAQ Markdown Editor (below system prompt) ── */}
                {showFaq && (
                  <FaqEditor
                    agentId={selected.id}
                    agentTitle={selected.title}
                    onClose={() => setShowFaq(false)}
                    onSaved={(newContent) =>
                      setSelected((prev) =>
                        prev ? { ...prev, faq_content: newContent } : prev
                      )
                    }
                  />
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
