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
} from "@mui/icons-material";
import { useState } from "react";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import { useAuditor } from "../context/AuditorContext";

const navGroups = [
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
      { label: "Atualizar Agentes", href: "/utilitarios/atualizar-agentes", icon: SyncIcon },
      { label: "Renovar Autenticação", href: "/utilitarios/renovar-auth", icon: RefreshIcon },
      { label: "Testar Agentes", href: "/testar-agentes", icon: AgentIcon },
      { label: "Feedbacks", href: "/feedbacks", icon: FeedbackIcon },
    ],
  },
  {
    label: "Configurações",
    items: [
      { label: "Agentes de Suporte IA", href: "/agentes", icon: AgentIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { auditor, logout } = useAuditor();

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
            <>
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
              <button
                onClick={handleLogout}
                title="Sair do sistema"
                style={{
                  marginTop: 4,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  color: "var(--text-muted)",
                  fontSize: 10,
                  lineHeight: 1,
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent, #bd4140)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <PowerOffIcon style={{ fontSize: 13 }} />
                <span>Sair</span>
              </button>
            </>
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

      {/* Status indicator */}
      <div
        style={{
          margin: "12px 16px",
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    background: active ? "var(--accent-light)" : "transparent",
                    textDecoration: "none",
                    transition: "all 0.15s ease",
                    marginBottom: 2,
                    borderLeft: active ? "3px solid var(--accent)" : "3px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                    }
                  }}
                >
                  <Icon sx={{ fontSize: 18 }} />
                  {item.label}
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
