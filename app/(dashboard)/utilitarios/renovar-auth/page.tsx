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
  Apple as AppleIcon,
  Window as WindowsIcon,
  SmartToy as AgentIcon,
  ExpandMore as ExpandIcon,
  Edit as EditIcon,
} from "@mui/icons-material";

const API = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";
const API_KEY = process.env.NEXT_PUBLIC_BACKEND_API_KEY || "";

type Status = "idle" | "dragging" | "ready" | "uploading" | "success" | "error";

interface UploadResult {
  valid: boolean;
  saved: boolean;
  bytes: number;
  cookies_count: number;
  message: string;
  profile: string;
}

interface ProfileAgent {
  id: string;
  name: string;
  title: string;
}

interface ProfileStatus {
  profile: string;
  agents: ProfileAgent[];
  exists: boolean;
  valid: boolean;
  cookies_count: number;
  expires_at: string | null;
  file_age_hours: number | null;
  message: string;
}

export default function RenovarAuthPage() {
  const [profiles, setProfiles] = useState<ProfileStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [os, setOs] = useState<"mac" | "windows">("windows");

  // New Profile inline creation
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");

  // Renaming state
  const [isRenamingProfile, setIsRenamingProfile] = useState(false);
  const [renamingName, setRenamingName] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [showRenameWarning, setShowRenameWarning] = useState(false);

  // Upload state per profile
  const [uploadStatus, setUploadStatus] = useState<Status>("idle");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSaveNewProfile = () => {
    const name = newProfileName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!name) return;

    if (profiles.some((p) => p.profile === name)) {
      alert("Este profile já existe!");
      return;
    }

    const tempProfile: ProfileStatus = {
      profile: name,
      agents: [],
      exists: false,
      valid: false,
      cookies_count: 0,
      expires_at: null,
      file_age_hours: null,
      message: "Aguardando primeiro upload de autenticação.",
    };

    setProfiles((prev) => [...prev, tempProfile]);
    setSelectedProfile(name);
    setIsAddingProfile(false);
    setNewProfileName("");
  };

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/authStatus/all`);
      if (res.ok) {
        const json = await res.json();
        const list: ProfileStatus[] = json.profiles ?? [];
        setProfiles(list);
        if (!selectedProfile && list.length > 0) {
          setSelectedProfile(list[0].profile);
        }
      }
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProfile]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleRenameProfile = async () => {
    if (!selectedProfile) return;
    const oldP = selectedProfile;
    const newP = renamingName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
    if (!newP) return;

    if (newP === oldP) {
      setIsRenamingProfile(false);
      return;
    }

    if (profiles.some((p) => p.profile === newP)) {
      alert("Este profile já existe!");
      return;
    }

    setRenameLoading(true);
    try {
      const res = await fetch(`${API}/renameProfile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          old_profile: oldP,
          new_profile: newP,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erro ao renomear o profile.");
      }

      alert(data.message || "Profile renomeado com sucesso!");
      setIsRenamingProfile(false);
      setSelectedProfile(newP);
      await fetchProfiles();
    } catch (err: any) {
      alert(err.message || "Erro de conexão ao renomear.");
    } finally {
      setRenameLoading(false);
    }
  };

  const currentProfile = profiles.find((p) => p.profile === selectedProfile) || null;

  const acceptFile = useCallback((f: File) => {
    if (!f.name.endsWith(".json")) {
      setUploadError("Selecione um arquivo .json válido.");
      setUploadStatus("error");
      return;
    }
    setUploadFile(f);
    setUploadStatus("ready");
    setUploadResult(null);
    setUploadError(null);
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
    if (!uploadFile || !selectedProfile) return;
    setUploadStatus("uploading");
    setUploadResult(null);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("profile", selectedProfile);

    try {
      const res = await fetch(`${API}/uploadAuthState?profile=${encodeURIComponent(selectedProfile)}`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || `HTTP ${res.status}`);
      setUploadResult(json);
      setUploadStatus("success");
      setTimeout(() => fetchProfiles(), 1500);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Erro desconhecido");
      setUploadStatus("error");
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadStatus("idle");
    setUploadResult(null);
    setUploadError(null);
  };

  const selectProfile = (profileName: string) => {
    setSelectedProfile(profileName);
    resetUpload();
    setIsRenamingProfile(false);
  };

  const isDragging = uploadStatus === "dragging";
  const isUploading = uploadStatus === "uploading";

  const getExpiresLabel = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const d = new Date(expiresAt);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (diffMs < 0) return "Expirado";
    if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
    if (diffHours > 0) return `${diffHours}h`;
    return "Em breve";
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Renovar Autenticação
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Gerencie a autenticação do NotebookLM para cada profile.
          Cada profile corresponde a uma conta Google diferente.
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Left: Profile list */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 16,
            maxHeight: "calc(100vh - 200px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              {profiles.length} Profile{profiles.length !== 1 ? "s" : ""}
            </div>
            <button
              onClick={fetchProfiles}
              disabled={loading}
              title="Atualizar"
              style={{
                background: "none",
                border: "none",
                cursor: loading ? "default" : "pointer",
                color: "var(--text-muted)",
                padding: 4,
                borderRadius: 6,
                opacity: loading ? 0.4 : 1,
                display: "flex",
              }}
            >
              <RefreshStatusIcon
                fontSize="small"
                style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
              />
            </button>
          </div>

          {loading && profiles.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
              Carregando profiles...
            </div>
          ) : profiles.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>
              Nenhum profile encontrado.
              Configure o campo &quot;Profile NotebookLM&quot; nos agentes.
            </div>
          ) : (
            profiles.map((p) => {
              const isSelected = selectedProfile === p.profile;
              return (
                <div
                  key={p.profile}
                  onClick={() => selectProfile(p.profile)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid",
                    borderColor: isSelected ? "var(--accent)" : "var(--border)",
                    background: isSelected ? "var(--accent-light)" : "var(--bg-card)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    marginBottom: 8,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border-light)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: p.valid ? "#10b981" : p.exists ? "#f59e0b" : "#ef4444",
                        boxShadow: p.valid
                          ? "0 0 4px rgba(16,185,129,0.6)"
                          : "none",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isSelected ? "var(--accent)" : "var(--text-primary)",
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.profile}
                    </span>
                  </div>
                  {/* Agent count */}
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 16 }}>
                    {p.agents.length} agente{p.agents.length !== 1 ? "s" : ""}
                    {p.exists && p.expires_at && (
                      <span
                        style={{
                          marginLeft: 8,
                          color: p.valid ? "var(--text-muted)" : "var(--danger)",
                          fontWeight: p.valid ? 400 : 600,
                        }}
                      >
                        ⏰ {getExpiresLabel(p.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Add profile section */}
          {!isAddingProfile ? (
            <button
              onClick={() => setIsAddingProfile(true)}
              style={{
                width: "100%",
                padding: "10px 12px",
                marginTop: 12,
                borderRadius: "var(--radius-sm)",
                border: "1px dashed var(--border)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.borderColor = "var(--accent)";
                target.style.color = "var(--accent)";
                target.style.background = "var(--accent-light)";
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLElement;
                target.style.borderColor = "var(--border)";
                target.style.color = "var(--text-secondary)";
                target.style.background = "transparent";
              }}
            >
              + Adicionar Novo Profile
            </button>
          ) : (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>
                Nome do Novo Profile:
              </div>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                placeholder="ex: empresa-b"
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontFamily: "monospace",
                  outline: "none",
                  marginBottom: 8,
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNewProfile();
                  if (e.key === "Escape") {
                    setIsAddingProfile(false);
                    setNewProfileName("");
                  }
                }}
              />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setIsAddingProfile(false);
                    setNewProfileName("");
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: 11,
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNewProfile}
                  disabled={!newProfileName.trim()}
                  style={{
                    padding: "4px 10px",
                    fontSize: 11,
                    borderRadius: 4,
                    background: "var(--accent)",
                    border: "none",
                    color: "white",
                    fontWeight: 600,
                    cursor: newProfileName.trim() ? "pointer" : "not-allowed",
                    opacity: newProfileName.trim() ? 1 : 0.5,
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Profile detail & upload */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!currentProfile ? (
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
              <RefreshStatusIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              <span style={{ fontSize: 14 }}>
                Selecione um profile na lista
              </span>
            </div>
          ) : (
            <div style={{ animation: "fadeIn 0.2s ease" }}>
              {/* Profile header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
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
                  🔑
                </div>
                <div style={{ flex: 1 }}>
                  {isRenamingProfile ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="text"
                        value={renamingName}
                        onChange={(e) => setRenamingName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          border: "1px solid var(--border)",
                          background: "var(--bg-surface)",
                          color: "var(--text-primary)",
                          fontSize: 14,
                          fontFamily: "monospace",
                          outline: "none",
                          width: "150px",
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameProfile();
                          if (e.key === "Escape") setIsRenamingProfile(false);
                        }}
                        disabled={renameLoading}
                      />
                      <button
                        onClick={handleRenameProfile}
                        disabled={renameLoading || !renamingName.trim()}
                        style={{
                          background: "var(--accent)",
                          border: "none",
                          color: "white",
                          borderRadius: 4,
                          padding: "4px 8px",
                          fontSize: 12,
                          cursor: (renameLoading || !renamingName.trim()) ? "not-allowed" : "pointer",
                          fontWeight: 600,
                          opacity: (renameLoading || !renamingName.trim()) ? 0.5 : 1,
                        }}
                      >
                        {renameLoading ? "Salvando..." : "Salvar"}
                      </button>
                      <button
                        onClick={() => setIsRenamingProfile(false)}
                        disabled={renameLoading}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: renameLoading ? "not-allowed" : "pointer",
                          fontSize: 12,
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 18, fontFamily: "monospace" }}>
                        {currentProfile.profile}
                      </span>
                      <button
                        onClick={() => {
                          setShowRenameWarning(true);
                        }}
                        title="Renomear Profile"
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          padding: 4,
                          borderRadius: 4,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "var(--accent)";
                          e.currentTarget.style.background = "var(--bg-hover)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "var(--text-muted)";
                          e.currentTarget.style.background = "none";
                        }}
                      >
                        <EditIcon sx={{ fontSize: 14 }} />
                      </button>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                    {currentProfile.agents.length} agente{currentProfile.agents.length !== 1 ? "s" : ""} associado{currentProfile.agents.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Agents using this profile */}
              {currentProfile.agents.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  {currentProfile.agents.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: "var(--bg-hover)",
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <AgentIcon sx={{ fontSize: 14, color: "var(--accent)" }} />
                      {a.title}
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)" }}>
                        {a.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Auth Status Card */}
              <div
                style={{
                  background: currentProfile.valid
                    ? "rgba(16,185,129,0.07)"
                    : currentProfile.exists
                      ? "rgba(245,158,11,0.07)"
                      : "rgba(239,68,68,0.07)",
                  border: `1px solid ${currentProfile.valid
                    ? "rgba(16,185,129,0.25)"
                    : currentProfile.exists
                      ? "rgba(245,158,11,0.25)"
                      : "rgba(239,68,68,0.25)"
                    }`,
                  borderRadius: "var(--radius)",
                  padding: "16px 20px",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: currentProfile.valid
                      ? "#10b981"
                      : currentProfile.exists
                        ? "#f59e0b"
                        : "#ef4444",
                    boxShadow: currentProfile.valid
                      ? "0 0 6px rgba(16,185,129,0.6)"
                      : "none",
                    animation: currentProfile.valid ? "pulse-glow 2s infinite" : "none",
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: currentProfile.valid
                        ? "var(--success)"
                        : currentProfile.exists
                          ? "var(--warning, #f59e0b)"
                          : "var(--danger)",
                      marginBottom: 4,
                    }}
                  >
                    {currentProfile.message}
                  </div>
                  {currentProfile.exists && (
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        fontSize: 12,
                        color: "var(--text-muted)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>🍪 {currentProfile.cookies_count} cookies</span>
                      {currentProfile.file_age_hours !== null && (
                        <span>📁 Atualizado há {currentProfile.file_age_hours}h</span>
                      )}
                      {currentProfile.expires_at && (
                        <span
                          style={{
                            color: currentProfile.valid ? "var(--text-muted)" : "var(--danger)",
                            fontWeight: 500,
                          }}
                        >
                          ⏰ Expira em {getExpiresLabel(currentProfile.expires_at)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setUploadStatus("dragging");
                }}
                onDragLeave={() => {
                  if (uploadStatus === "dragging")
                    setUploadStatus(uploadFile ? "ready" : "idle");
                }}
                onDrop={handleDrop}
                onClick={() => !uploadFile && inputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging
                    ? "var(--accent)"
                    : uploadFile
                      ? "rgba(16,185,129,0.5)"
                      : "rgba(189, 65, 64, 0.5)"
                    }`,
                  borderRadius: "var(--radius)",
                  padding: "36px 24px",
                  textAlign: "center",
                  cursor: uploadFile ? "default" : "pointer",
                  background: isDragging
                    ? "rgba(189, 65, 64, 0.08)"
                    : uploadFile
                      ? "rgba(16,185,129,0.05)"
                      : "rgba(189, 65, 64, 0.03)",
                  transition: "all 0.2s ease",
                  marginBottom: 16,
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) acceptFile(f);
                  }}
                />

                {uploadFile ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "rgba(16,185,129,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FileIcon sx={{ color: "#10b981", fontSize: 24 }} />
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
                        {uploadFile.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {(uploadFile.size / 1024).toFixed(1)} KB · profile: <strong>{selectedProfile}</strong>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetUpload();
                      }}
                      style={{
                        marginLeft: 8,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        display: "flex",
                        padding: 4,
                        borderRadius: 4,
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: isDragging
                          ? "rgba(189, 65, 64, 0.15)"
                          : "rgba(189, 65, 64, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 14px",
                        transition: "all 0.2s ease",
                        transform: isDragging ? "scale(1.1)" : "scale(1)",
                      }}
                    >
                      <UploadIcon sx={{ color: "var(--accent)", fontSize: 26 }} />
                    </div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "var(--text-primary)",
                        marginBottom: 4,
                      }}
                    >
                      {isDragging
                        ? "Solte o arquivo aqui"
                        : `Arraste o storage_state.json para o profile "${selectedProfile}"`}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      ou{" "}
                      <span
                        style={{
                          color: "var(--accent)",
                          fontWeight: 500,
                          textDecoration: "underline",
                        }}
                      >
                        clique para selecionar
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Upload Button */}
              {uploadFile && uploadStatus !== "success" && (
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 32px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    background: isUploading
                      ? "var(--bg-hover)"
                      : "linear-gradient(135deg, var(--accent, #bd4140), var(--accent-hover, #a03534))",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: isUploading ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    fontFamily: "Inter, sans-serif",
                    boxShadow: isUploading
                      ? "none"
                      : "0 4px 16px rgba(189, 65, 64, 0.35)",
                    width: "100%",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  {isUploading ? (
                    <>
                      <span className="spinner" /> Enviando para profile &quot;{selectedProfile}&quot;...
                    </>
                  ) : (
                    <>
                      <UploadIcon /> Enviar para profile &quot;{selectedProfile}&quot;
                    </>
                  )}
                </button>
              )}

              {/* Success */}
              {uploadStatus === "success" && uploadResult && (
                <div style={{ animation: "fadeIn 0.3s ease" }}>
                  <div
                    style={{
                      ...feedbackCardStyle,
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.25)",
                    }}
                  >
                    <CheckCircle sx={{ color: "var(--success)", fontSize: 24, flexShrink: 0 }} />
                    <div>
                      <div
                        style={{
                          color: "var(--success)",
                          fontWeight: 600,
                          marginBottom: 6,
                          fontSize: 15,
                        }}
                      >
                        {uploadResult.valid
                          ? "Autenticação renovada!"
                          : "Arquivo salvo (validação pendente)"}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          lineHeight: 1.6,
                        }}
                      >
                        {uploadResult.message}
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 16,
                          fontSize: 12,
                          color: "var(--text-muted)",
                        }}
                      >
                        <span>📦 {(uploadResult.bytes / 1024).toFixed(1)} KB</span>
                        <span>🍪 {uploadResult.cookies_count} cookies</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={resetUpload} style={secondaryBtnStyle}>
                    Enviar outro arquivo
                  </button>
                </div>
              )}

              {/* Error */}
              {uploadStatus === "error" && (
                <div style={{ animation: "fadeIn 0.3s ease" }}>
                  <div
                    style={{
                      ...feedbackCardStyle,
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.25)",
                    }}
                  >
                    <ErrorOutline sx={{ color: "var(--danger)", fontSize: 24, flexShrink: 0 }} />
                    <div>
                      <div style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 4 }}>
                        Falha no upload
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          lineHeight: 1.6,
                        }}
                      >
                        {uploadError}
                      </div>
                    </div>
                  </div>
                  <button onClick={resetUpload} style={secondaryBtnStyle}>
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* Instructions */}
              <div style={infoCardStyle}>
                <InfoOutlined sx={{ color: "var(--accent)", fontSize: 22, flexShrink: 0, mt: "2px" }} />
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.8,
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 16,
                    }}
                  >
                    <strong style={{ color: "var(--text-primary)", fontSize: 15 }}>
                      Como renovar a autenticação:
                    </strong>
                    <div
                      style={{
                        display: "flex",
                        background: "var(--bg-hover)",
                        padding: 3,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <button
                        onClick={() => setOs("windows")}
                        style={{
                          ...osToggleBtnStyle,
                          background: os === "windows" ? "var(--bg-surface)" : "transparent",
                          color: os === "windows" ? "var(--text-primary)" : "var(--text-muted)",
                          boxShadow: os === "windows" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                        }}
                      >
                        <WindowsIcon sx={{ fontSize: 16 }} /> Windows
                      </button>
                      <button
                        onClick={() => setOs("mac")}
                        style={{
                          ...osToggleBtnStyle,
                          background: os === "mac" ? "var(--bg-surface)" : "transparent",
                          color: os === "mac" ? "var(--text-primary)" : "var(--text-muted)",
                          boxShadow: os === "mac" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
                        }}
                      >
                        <AppleIcon sx={{ fontSize: 16 }} /> Mac
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Step 1 */}
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={stepNumberStyle}>1</span> Preparar Ambiente (Venv)
                      </div>
                      <p style={{ margin: "4px 0 8px 30px", opacity: 0.8 }}>
                        Se for a primeira vez ou se não tiver o ambiente configurado:
                      </p>
                      <div style={{ marginLeft: 30 }}>
                        {os === "mac" ? (
                          <code style={terminalStyle}>
                            cd dev/agentes-suporte-ia
                            <br />
                            opcional: python3 -m venv venv
                            <br />
                            source venv/bin/activate
                            <br />
                            opcional (1 vez): pip install &quot;notebooklm-py[browser]&quot;
                            <br />
                            opcional (1 vez): playwright install chromium
                            <br />
                            notebooklm login
                          </code>
                        ) : (
                          <code style={terminalStyle}>
                            cd dev\agentes-suporte-ia
                            <br />
                            python -m venv venv
                            <br />
                            venv\Scripts\activate
                            <br />
                            opcional (1 vez): pip install &quot;notebooklm-py[browser]&quot;
                            <br />
                            opcional (1 vez): playwright install chromium
                            <br />
                            notebooklm login
                          </code>
                        )}
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={stepNumberStyle}>2</span> Iniciar Autenticação (com profile)
                      </div>
                      <p style={{ margin: "4px 0 8px 30px", opacity: 0.8 }}>
                        Com o terminal aberto e o <strong>venv ativo</strong>, execute para o
                        profile <code style={codeStyle}>{selectedProfile}</code>:
                      </p>

                      {/* Sub-instrução para múltiplos perfis */}
                      <div style={{ marginLeft: 30, marginBottom: 12, padding: "8px 12px", background: "rgba(234, 179, 8, 0.05)", borderLeft: "3px solid var(--accent)", borderRadius: "0 6px 6px 0" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: 4, fontSize: 12 }}>
                          ⚠️ IMPORTANTE (Se for alternar de conta Google):
                        </span>
                        <span style={{ display: "block", fontSize: 12, opacity: 0.8, marginBottom: 8, lineHeight: 1.5 }}>
                          Para evitar que o Google invalide as sessões ativas em produção (o que derruba outros agentes ao clicar em &quot;Sair&quot; no navegador), limpe a pasta temporária do navegador antes de logar:
                        </span>
                        <code style={{ ...terminalStyle, padding: "8px 12px", display: "inline-block", width: "100%", boxSizing: "border-box" }}>
                          {os === "mac"
                            ? "rm -rf ~/.notebooklm/browser_profile"
                            : "rmdir /s /q %USERPROFILE%\\.notebooklm\\browser_profile"}
                        </code>
                      </div>

                      <div style={{ marginLeft: 30 }}>
                        <code style={terminalStyle}>
                          # Certifique-se de estar com o venv ativo (
                          {os === "mac"
                            ? "source venv/bin/activate"
                            : "venv\\Scripts\\activate"}
                          )
                          <br />
                          {os === "mac"
                            ? `notebooklm --storage ~/.notebooklm/profiles/${selectedProfile}/storage_state.json login`
                            : `notebooklm --storage %USERPROFILE%\\.notebooklm\\profiles\\${selectedProfile}\\storage_state.json login`}
                        </code>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={stepNumberStyle}>3</span> Fluxo no Navegador
                      </div>
                      <ul
                        style={{
                          margin: "4px 0 0 30px",
                          padding: 0,
                          listStyle: "none",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <li>
                          • Complete o login do Google no navegador que será aberto
                          automaticamente.
                        </li>
                        <li>
                          • Aguarde carregar a página inicial do NotebookLM (onde aparecem
                          seus notebooks).
                        </li>
                        <li>
                          • Volte ao Terminal e pressione{" "}
                          <kbd style={kbdStyle}>ENTER</kbd> para salvar a sessão.
                        </li>
                      </ul>
                    </div>

                    {/* Step 4 */}
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={stepNumberStyle}>4</span> Coletar e Upload
                      </div>
                      <p style={{ margin: "4px 0 8px 30px", opacity: 0.8 }}>
                        O arquivo será gerado em{" "}
                        <code style={codeStyle}>
                          {os === "mac"
                            ? `~/.notebooklm/profiles/${selectedProfile}/storage_state.json`
                            : `C:\\Users\\SeuUsuario\\.notebooklm\\profiles\\${selectedProfile}\\storage_state.json`}
                        </code>
                        .
                      </p>
                      <div style={{ marginLeft: 30 }}>
                        <code style={terminalStyle}>
                          {os === "mac"
                            ? `cp ~/.notebooklm/profiles/${selectedProfile}/storage_state.json ~/Desktop`
                            : `copy %USERPROFILE%\\.notebooklm\\profiles\\${selectedProfile}\\storage_state.json %USERPROFILE%\\Desktop`}
                        </code>
                      </div>
                      <p
                        style={{
                          margin: "8px 0 0 30px",
                          fontSize: 12,
                          fontStyle: "italic",
                        }}
                      >
                        Arraste o arquivo da sua Área de Trabalho para a zona de upload acima.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showRenameWarning && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "24px 28px",
              maxWidth: 480,
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--danger)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              ⚠️ Alerta!
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: "1.6", marginBottom: 20 }}>
              Esta operação vai modificar os token de autenticação e pastas do que armazenam cokies, bem como relacionamentos no banco de dados que apontam para este profile. Esta operação requer uma revisão completa e possivelmente manutenção no serviço que roda os agentes deste profile.
            </p>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 24 }}>
              Confirmar?
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                onClick={() => setShowRenameWarning(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowRenameWarning(false);
                  if (currentProfile) {
                    setRenamingName(currentProfile.profile);
                    setIsRenamingProfile(true);
                  }
                }}
                style={{
                  padding: "8px 20px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--accent)",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--accent)";
                }}
              >
                Sim
              </button>
            </div>
          </div>
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

const osToggleBtnStyle: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 6,
  border: "none",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.2s ease",
};
