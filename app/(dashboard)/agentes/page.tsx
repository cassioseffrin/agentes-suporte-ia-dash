"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
} from "@mui/icons-material";

const API = "http://192.168.50.21:8000";

// Dark MUI theme matching dashboard palette
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#6366f1" },
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
            "&.Mui-focused fieldset": { borderColor: "#6366f1" },
          },
          "& .MuiInputLabel-root": { color: "#94a3b8" },
          "& input, & textarea": { color: "#f1f5f9", fontSize: 14 },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked": { color: "#6366f1" }, "&.Mui-checked + .MuiSwitch-track": { backgroundColor: "#6366f1" } },
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
}

type FormValues = Omit<Agent, "id" | "creation" | "modification">;

type SaveStatus = "idle" | "saving" | "success" | "error";

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
            ? "linear-gradient(135deg, var(--accent), #8b5cf6)"
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

export default function AgentesPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

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
      // update local list
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
      reset(data); // clear isDirty
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Erro desconhecido");
      setSaveStatus("error");
    }
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return "—";
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
      <div style={{ animation: "fadeIn 0.3s ease" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
            Editar Agentes
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
                      background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
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
                  <EditIcon sx={{ color: "var(--accent)", fontSize: 20, marginLeft: 8 }} />
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
                            : "linear-gradient(135deg, var(--accent), #8b5cf6)",
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
                            : "0 4px 14px rgba(99, 102, 241, 0.4)",
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
              </form>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
