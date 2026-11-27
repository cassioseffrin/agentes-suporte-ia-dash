"use client";

import { useState } from "react";
import {
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  OpenInNew as OpenIcon,
} from "@mui/icons-material";
import { useI18n, type TranslationKey } from "../../i18n/I18nContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";

type Attr = { name: string; def: string; defKey?: TranslationKey; desc: TranslationKey; required?: boolean };

const attrGroups: { title: TranslationKey; attrs: Attr[] }[] = [
  {
    title: "widgetDocs.groups.agent",
    attrs: [
      { name: "agent-name", def: "—", desc: "widgetDocs.attrs.agentName", required: true },
      { name: "agent-title", def: "", defKey: "widgetDocs.defaults.agentTitle", desc: "widgetDocs.attrs.agentTitle" },
    ],
  },
  {
    title: "widgetDocs.groups.user",
    attrs: [
      { name: "user-email", def: "usuario.generico@…", desc: "widgetDocs.attrs.userEmail" },
      { name: "user-name", def: "", defKey: "widgetDocs.defaults.genericUser", desc: "widgetDocs.attrs.userName" },
      { name: "user-cnpj", def: "03.600.477/0001-04", desc: "widgetDocs.attrs.userCnpj" },
    ],
  },
  {
    title: "widgetDocs.groups.connection",
    attrs: [
      { name: "api-url", def: "https://assistant.arpasistemas.com.br", desc: "widgetDocs.attrs.apiUrl" },
      { name: "api-key", def: "—", desc: "widgetDocs.attrs.apiKey", required: true },
    ],
  },
  {
    title: "widgetDocs.groups.behavior",
    attrs: [
      { name: "position", def: "bottom-right", desc: "widgetDocs.attrs.position" },
      { name: "hide-fab", def: "", defKey: "widgetDocs.defaults.absent", desc: "widgetDocs.attrs.hideFab" },
      { name: "allow-minimize-and-close", def: "true", desc: "widgetDocs.attrs.allowMinimize" },
    ],
  },
  {
    title: "widgetDocs.groups.colors",
    attrs: [
      { name: "accent-color", def: "#bd4140", desc: "widgetDocs.attrs.accentColor" },
      { name: "bg-color", def: "#1a1d27", desc: "widgetDocs.attrs.bgColor" },
      { name: "body-bg-color", def: "#21253a", desc: "widgetDocs.attrs.bodyBgColor" },
      { name: "text-color", def: "#e2e8f0", desc: "widgetDocs.attrs.textColor" },
      { name: "bubble-bot-bg", def: "#2a2f47", desc: "widgetDocs.attrs.bubbleBotBg" },
      { name: "bubble-bot-color", def: "#e2e8f0", desc: "widgetDocs.attrs.bubbleBotColor" },
      { name: "bubble-user-bg", def: "accent-color", desc: "widgetDocs.attrs.bubbleUserBg" },
      { name: "bubble-user-color", def: "#fff", desc: "widgetDocs.attrs.bubbleUserColor" },
    ],
  },
];

const endpoints: [string, string, TranslationKey][] = [
  ["GET", "/history?email=&page=&limit=", "widgetDocs.endpoints.history"],
  ["GET", "/createNewThread?email=&name=&cnpj=&agentName=", "widgetDocs.endpoints.createThread"],
  ["POST", "/chat/stream", "widgetDocs.endpoints.chatStream"],
  ["POST", "/chat", "widgetDocs.endpoints.chat"],
  ["GET", "/thread/{id}/messages", "widgetDocs.endpoints.messages"],
  ["GET", "/thread/{id}/user-events", "widgetDocs.endpoints.userEvents"],
  ["POST", "/thread/{id}/receipts", "widgetDocs.endpoints.receipts"],
  ["PUT", "/chat/{id}/feedback", "widgetDocs.endpoints.chatFeedback"],
  ["PUT", "/thread/{id}/feedback", "widgetDocs.endpoints.threadFeedback"],
  ["DELETE", "/thread/{id}", "widgetDocs.endpoints.deleteThread"],
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        title={t("widgetDocs.copy")}
        style={{
          position: "absolute", top: 8, right: 8,
          background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 6,
          color: copied ? "var(--success)" : "var(--text-secondary)", cursor: "pointer",
          padding: 4, display: "flex",
        }}
      >
        {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <CopyIcon sx={{ fontSize: 16 }} />}
      </button>
      <pre
        style={{
          background: "var(--bg-base)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)",
          padding: "14px 16px", paddingRight: 44, overflowX: "auto", fontSize: 12.5, lineHeight: 1.6,
          color: "var(--text-secondary)", margin: 0,
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
        padding: 24, marginBottom: 20,
      }}
    >
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>{title}</h2>
      {children}
    </section>
  );
}

const p: React.CSSProperties = { fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 12px" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", borderBottom: "1px solid var(--border)" };
const td: React.CSSProperties = { padding: "8px 10px", fontSize: 13, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", verticalAlign: "top" };
const mono: React.CSSProperties = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5, color: "var(--text-primary)" };

export default function DocumentacaoWidgetPage() {
  const { t, tr } = useI18n();
  // O layout do dashboard só renderiza no cliente (após checar login), então window existe aqui
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "https://dashia.arpasistemas.com.br"
  );

  const snippet = `<script src="${origin}/chat-ia-widget.js"></script>
<chat-ia-widget
  agent-name="VIMBO"
  agent-title="Sistema Vimbo"
  user-email="usuario@cliente.com.br"
  user-name="${t("widgetDocs.sampleUserName")}"
  user-cnpj="00000000000000"
  api-url="${API_URL}"
  api-key="<BACKEND_API_KEY>"
></chat-ia-widget>`;

  const jsApi = `const w = document.querySelector('chat-ia-widget');

w.openChat();   // ${t("widgetDocs.jsOpen")}
w.closeChat();  // ${t("widgetDocs.jsClose")}

// ${t("widgetDocs.jsSwitch1")}
// ${t("widgetDocs.jsSwitch2")}
w.setAttribute('user-email', 'outro@cliente.com.br');
w.setAttribute('user-cnpj', '12345678000100');`;

  const embedUrl = `${origin}/chat-embed.html
  ?agent-name=CONTROL
  &agent-title=Sistema CONTROL
  &user-email=usuario@cliente.com.br
  &user-name=${t("widgetDocs.sampleUserName")}
  &user-cnpj=00000000000000
  &api-url=${API_URL}
  &api-key=<BACKEND_API_KEY>
  &allow-minimize-and-close=false`;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{t("widgetDocs.title")}</h1>
        <p style={{ ...p, marginTop: 6 }}>
          {tr("widgetDocs.intro", { tag: <span style={mono}>&lt;chat-ia-widget&gt;</span> })}
        </p>
        <a
          href={`${API_URL}/docs`}
          target="_blank"
          rel="noopener"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--accent)" }}
        >
          {t("widgetDocs.apiDocs")} <OpenIcon sx={{ fontSize: 14 }} />
        </a>
      </div>

      <Section title={t("widgetDocs.installTitle")}>
        <p style={p}>{t("widgetDocs.installText")}</p>
        <CodeBlock code={snippet} />
        <p style={{ ...p, marginTop: 12, marginBottom: 0 }}>
          {tr("widgetDocs.consentNote", { key: <span style={mono}>localStorage[&quot;ia_consent&quot;]</span> })}
        </p>
      </Section>

      <Section title={t("widgetDocs.attrsTitle")}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>{t("widgetDocs.colAttribute")}</th>
                <th style={th}>{t("widgetDocs.colDefault")}</th>
                <th style={th}>{t("widgetDocs.colDescription")}</th>
              </tr>
            </thead>
            <tbody>
              {attrGroups.map((g) => [
                <tr key={g.title}>
                  <td colSpan={3} style={{ ...td, paddingTop: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t(g.title)}</td>
                </tr>,
                ...g.attrs.map((a) => (
                  <tr key={a.name}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <span style={mono}>{a.name}</span>
                      {a.required && <span style={{ color: "var(--accent)", marginLeft: 4 }} title={t("widgetDocs.required")}>*</span>}
                    </td>
                    <td style={{ ...td, ...mono, color: "var(--text-muted)" }}>{a.defKey ? t(a.defKey) : a.def}</td>
                    <td style={td}>{t(a.desc)}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
        <p style={{ ...p, marginTop: 12, marginBottom: 0 }}>
          {tr("widgetDocs.attrsNote", {
            star: <span style={{ color: "var(--accent)" }}>*</span>,
            email: <span style={mono}>user-email</span>,
            cnpj: <span style={mono}>user-cnpj</span>,
            agent: <span style={mono}>agent-name</span>,
          })}
        </p>
      </Section>

      <Section title={t("widgetDocs.jsApiTitle")}>
        <CodeBlock code={jsApi} />
      </Section>

      <Section title={t("widgetDocs.embedTitle")}>
        <p style={p}>
          {tr("widgetDocs.embedText", { file: <span style={mono}>chat-embed.html</span> })}
        </p>
        <CodeBlock code={embedUrl} />
      </Section>

      <Section title={t("widgetDocs.endpointsTitle")}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {endpoints.map(([method, path, desc]) => (
                <tr key={method + path}>
                  <td style={{ ...td, ...mono, width: 70, color: "var(--accent)" }}>{method}</td>
                  <td style={{ ...td, ...mono }}>{path}</td>
                  <td style={td}>{t(desc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...p, marginTop: 12, marginBottom: 0 }}>
          {tr("widgetDocs.endpointsNote", {
            curl: <span style={mono}>curl</span>,
            swagger: (
              <a href={`${API_URL}/docs`} target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>Swagger</a>
            ),
          })}
        </p>
      </Section>
    </div>
  );
}
