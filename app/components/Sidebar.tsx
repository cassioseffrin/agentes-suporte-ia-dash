"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Dashboard as DashboardIcon,
  SmartToy as AgentIcon,
  Refresh as RefreshIcon,
  Sync as SyncIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Circle as CircleIcon,
  AccountTree as DiagramIcon,
  Logout as LogoutIcon,
  PowerSettingsNew as PowerOffIcon,
  RateReview as FeedbackIcon,
  Science as TestIcon,
} from "@mui/icons-material";
import { useState } from "react";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { useAuditor } from "../context/AuditorContext";
import { useNotification } from "../context/NotificationContext";
import { Tooltip, IconButton, keyframes } from "@mui/material";
import {
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
} from "@mui/icons-material";

const pulseWarning = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6); }
  70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
`;

interface NavItem {
  label: string;
  href: string;
  icon: any;
  customClass?: string;
  badge?: string;
  badgeClass?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Dashboard",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
      { label: "Arquitetura", href: "/arquitetura", icon: DiagramIcon },
    ],
  },
  {
    label: "Utilitários",
    items: [
      {
        label: "Testar Agentes",
        href: "/testar-agentes",
        icon: TestIcon,
        customClass: "test-agents",
        badge: "Lab",
        badgeClass: "badge-lab",
      },
      { label: "Feedbacks", href: "/feedbacks", icon: FeedbackIcon },
    ],
  },
  {
    label: "Configurações",
    items: [
      {
        label: "Agentes de Suporte IA",
        href: "/agentes",
        icon: SupportAgentIcon,
        customClass: "support-agents",
        badge: "IA",
        badgeClass: "badge-ia",
      },
      { label: "Renovar Autenticação", href: "/utilitarios/renovar-auth", icon: RefreshIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { auditor, logout } = useAuditor();
  const {
    ttsEnabled,
    setTtsEnabled,
    selectedVoice,
    setSelectedVoice,
    playbackSpeed,
    setPlaybackSpeed,
    ttsInteractionRequired,
    setTtsInteractionRequired,
  } = useNotification();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const SidebarContent = () => (  
    <aside
      style={{
        width: "var(--sidebar-width)",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: open ? 0 : "calc(-1 * var(--sidebar-width))",
        zIndex: 100,
        transition: "left 0.25s ease",
        boxShadow: "var(--shadow)",
      }}
      className="lg-sidebar"
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--accent), var(--accent-hover, #a03534))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            animation: "pulse-glow 3s infinite",
          }}
        >
          🤖
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
            Agentes IA
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Dashboard Admin</div>
          {auditor && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--accent, #bd4140)",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 110,
              }}
              title={auditor.name || auditor.login}
            >
              {auditor.nickname || auditor.name || auditor.login}
            </div>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "none",
          }}
          className="mobile-close-btn"
        >
          <CloseIcon fontSize="small" />
        </button>
      </div>

      {/* Status indicator & TTS Toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 16px 8px 16px", gap: 8 }}>
        <div
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--success)",
          }}
        >
          <CircleIcon sx={{ fontSize: 8 }} />
          Backend conectado
        </div>

        <Tooltip
          title={
            !ttsEnabled
              ? "Notificações por voz desativadas — clique para ativar"
              : ttsInteractionRequired
                ? "Clique na página para ativar o áudio (bloqueado pelo navegador)"
                : "Notificações por voz ativadas — clique para desativar"
          }
        >
          <IconButton
            onClick={() => {
              if (ttsInteractionRequired) {
                setTtsInteractionRequired(false);
              }
              setTtsEnabled(!ttsEnabled);
              if (!ttsEnabled) {
                const a = new Audio();
                a.play().catch(() => {});
              }
            }}
            size="small"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: !ttsEnabled
                ? "rgba(156,163,175,0.15)"
                : ttsInteractionRequired
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(16,185,129,0.15)",
              color: !ttsEnabled
                ? "#9ca3af"
                : ttsInteractionRequired
                  ? "#f59e0b"
                  : "#10b981",
              border: `1px solid ${
                !ttsEnabled
                  ? "rgba(156,163,175,0.3)"
                  : ttsInteractionRequired
                    ? "rgba(245, 158, 11, 0.5)"
                    : "rgba(16,185,129,0.3)"
              }`,
              animation: ttsInteractionRequired ? `${pulseWarning} 2s infinite` : "none",
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: !ttsEnabled
                  ? "rgba(156,163,175,0.25)"
                  : "rgba(16,185,129,0.25)",
              },
            }}
          >
            {!ttsEnabled ? (
              <VolumeOffIcon sx={{ fontSize: 18 }} />
            ) : (
              <VolumeUpIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      </div>

      {/* Voice & Speed Controls */}
      <div
        style={{
          margin: "0 16px 12px 16px",
          padding: "10px 12px",
          borderRadius: "var(--radius-sm, 8px)",
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Voz:</span>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as any)}
            style={{
              background: "var(--bg-card, #1e293b)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: 11,
              borderRadius: 6,
              padding: "2px 6px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="openai">OpenAI (Default)</option>
            <option value="dora">Dora (Feminina)</option>
            <option value="alex">Alex (Masculina)</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>Velocidade:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            style={{
              background: "var(--bg-card, #1e293b)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              fontSize: 11,
              borderRadius: 6,
              padding: "2px 6px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value={1.0}>1.0x (Normal)</option>
            <option value={1.25}>1.25x (Padrão)</option>
            <option value={1.5}>1.5x (Acelerado)</option>
            <option value={2.0}>2.0x (Rápido)</option>
          </select>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                padding: "0 8px",
                marginBottom: 6,
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`nav-item-link ${active ? "active" : ""}`}
                >
                  <div className={`nav-icon-box ${item.customClass || ""}`}>
                    <Icon sx={{ fontSize: 18 }} />
                  </div>
                  <span className="nav-item-text">{item.label}</span>
                  {item.badge && (
                    <span className={`nav-item-badge ${item.badgeClass || ""}`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — auditor identity */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
        }}
      >
        {auditor ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Avatar */}
            {auditor.icon_svg ? (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                dangerouslySetInnerHTML={{ __html: auditor.icon_svg }}
              />
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <SupportAgentIcon style={{ color: "#fff", fontSize: 18 }} />
              </div>
            )}
            {/* Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {auditor.nickname || auditor.name || auditor.login}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {auditor.email || auditor.login}
              </div>
            </div>
            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Sair"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 4,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <LogoutIcon style={{ fontSize: 16 }} />
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            API: {process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br"}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 200,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: 8,
          cursor: "pointer",
          color: "var(--text-primary)",
          display: "none",
        }}
        className="mobile-menu-btn"
      >
        <MenuIcon />
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 99,
            display: "none",
          }}
          className="mobile-overlay"
        />
      )}

      <SidebarContent />
      <style>{`
        /* Sidebar Nav Link & Layout */
        .nav-item-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: var(--radius-sm, 8px);
          font-size: 13.5px;
          color: var(--text-secondary, #cbd5e1);
          background: transparent;
          text-decoration: none;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 3px;
          border-left: 3px solid transparent;
          user-select: none;
        }

        .nav-item-link:hover {
          background: var(--bg-hover, rgba(255, 255, 255, 0.05));
          color: var(--text-primary, #ffffff);
          transform: translateX(2px);
        }

        .nav-item-link:active {
          transform: scale(0.985);
        }

        .nav-item-link.active {
          background: var(--accent-light, rgba(189, 65, 64, 0.15));
          color: var(--accent, #bd4140);
          font-weight: 600;
          border-left: 3px solid var(--accent, #bd4140);
        }

        .nav-item-text {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Generic Icon Box */
        .nav-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: inherit;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          flex-shrink: 0;
        }

        .nav-icon-box svg {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease;
        }

        .nav-item-link:hover .nav-icon-box {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.12);
          transform: scale(1.08);
        }

        .nav-item-link.active .nav-icon-box {
          background: linear-gradient(135deg, var(--accent, #bd4140), var(--accent-hover, #a03534));
          border-color: transparent;
          color: #ffffff;
          box-shadow: 0 2px 10px rgba(189, 65, 64, 0.35);
        }

        /* Interactive Icon: Testar Agentes (Lab / Experimentation) */
        .nav-icon-box.test-agents {
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.06);
          border-color: rgba(245, 158, 11, 0.18);
        }

        .nav-item-link:hover .nav-icon-box.test-agents {
          background: rgba(245, 158, 11, 0.18);
          border-color: rgba(245, 158, 11, 0.45);
          color: #f59e0b;
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.32);
          transform: scale(1.14);
        }

        .nav-item-link:hover .nav-icon-box.test-agents svg {
          transform: rotate(-14deg) scale(1.12);
          filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.4));
        }

        .nav-item-link.active .nav-icon-box.test-agents {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-color: transparent;
          color: #ffffff;
          box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4);
        }

        /* Interactive Icon: Agentes de Suporte IA (Support Agent) */
        .nav-icon-box.support-agents {
          color: #f87171;
          background: rgba(239, 68, 68, 0.06);
          border-color: rgba(239, 68, 68, 0.18);
        }

        .nav-item-link:hover .nav-icon-box.support-agents {
          background: rgba(189, 65, 64, 0.22);
          border-color: rgba(189, 65, 64, 0.45);
          color: #ff8585;
          box-shadow: 0 0 12px rgba(189, 65, 64, 0.35);
          transform: scale(1.14);
        }

        .nav-item-link:hover .nav-icon-box.support-agents svg {
          transform: translateY(-2px) scale(1.12);
          filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.45));
        }

        .nav-item-link.active .nav-icon-box.support-agents {
          background: linear-gradient(135deg, var(--accent, #bd4140), #991b1b);
          border-color: transparent;
          color: #ffffff;
          box-shadow: 0 2px 10px rgba(189, 65, 64, 0.4);
        }

        /* Interactive Badges */
        .nav-item-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 6px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .nav-item-badge.badge-lab {
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }

        .nav-item-badge.badge-ia {
          background: rgba(189, 65, 64, 0.14);
          color: #ff8585;
          border: 1px solid rgba(189, 65, 64, 0.28);
        }

        .nav-item-link:hover .nav-item-badge.badge-lab {
          background: rgba(245, 158, 11, 0.22);
          border-color: rgba(245, 158, 11, 0.5);
          box-shadow: 0 0 8px rgba(245, 158, 11, 0.25);
        }

        .nav-item-link:hover .nav-item-badge.badge-ia {
          background: rgba(189, 65, 64, 0.25);
          border-color: rgba(189, 65, 64, 0.5);
          box-shadow: 0 0 8px rgba(189, 65, 64, 0.25);
        }

        .nav-item-link.active .nav-item-badge.badge-lab {
          background: rgba(245, 158, 11, 0.25);
          color: #fef3c7;
          border-color: rgba(245, 158, 11, 0.5);
        }

        .nav-item-link.active .nav-item-badge.badge-ia {
          background: rgba(189, 65, 64, 0.3);
          color: #fee2e2;
          border-color: rgba(189, 65, 64, 0.6);
        }

        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .mobile-overlay { display: block !important; }
          .mobile-close-btn { display: flex !important; }
          .lg-sidebar { left: ${open ? "0" : "calc(-1 * var(--sidebar-width))"} !important; }
        }
        @media (min-width: 769px) {
          .lg-sidebar { left: 0 !important; }
        }
      `}</style>
    </>
  );
}
