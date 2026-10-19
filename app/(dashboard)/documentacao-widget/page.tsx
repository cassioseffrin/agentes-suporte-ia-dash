"use client";

import { useState } from "react";
import {
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  OpenInNew as OpenIcon,
} from "@mui/icons-material";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://assistant.arpasistemas.com.br";

type Attr = { name: string; def: string; desc: string; required?: boolean };

const attrGroups: { title: string; attrs: Attr[] }[] = [
  {
    title: "Agente",
    attrs: [
      { name: "agent-name", def: "—", desc: "Nome interno do agente (ex.: VIMBO, CONTROL), único na tabela agent. O backend localiza o agente (notebook) sempre por este nome.", required: true },
      { name: "agent-title", def: "agent-name ou \"Assistente IA\"", desc: "Título exibido no cabeçalho do chat." },
    ],
  },
  {
    title: "Usuário",
    attrs: [
      { name: "user-email", def: "usuario.generico@…", desc: "E-mail do usuário. Usado para carregar o histórico de conversas. Sem ele, o histórico não aparece." },
      { name: "user-name", def: "Usuario Generico", desc: "Nome do usuário (exibido para o auditor)." },
      { name: "user-cnpj", def: "03.600.477/0001-04", desc: "CNPJ do cliente (usado nos relatórios do dashboard)." },
    ],
  },
  {
    title: "Conexão",
    attrs: [
      { name: "api-url", def: "https://assistant.arpasistemas.com.br", desc: "URL base do backend." },
      { name: "api-key", def: "—", desc: "BACKEND_API_KEY. Enviada como Authorization: Bearer. Necessária para /chat, /history, feedback etc.", required: true },
    ],
  },
  {
    title: "Comportamento",
    attrs: [
      { name: "position", def: "bottom-right", desc: "Posição do botão flutuante: bottom-right ou bottom-left." },
      { name: "hide-fab", def: "ausente", desc: "Atributo booleano. Se presente, esconde o botão flutuante; abra via openChat()." },
      { name: "allow-minimize-and-close", def: "true", desc: "\"false\" esconde os botões de minimizar/fechar (útil em embed)." },
    ],
  },
  {
    title: "Cores (hex, rgb() ou nome CSS)",
    attrs: [
      { name: "accent-color", def: "#bd4140", desc: "Cor de destaque (FAB, botões, cabeçalho)." },
      { name: "bg-color", def: "#1a1d27", desc: "Fundo do painel." },
      { name: "body-bg-color", def: "#21253a", desc: "Fundo da área de mensagens." },
      { name: "text-color", def: "#e2e8f0", desc: "Cor do texto geral." },
      { name: "bubble-bot-bg", def: "#2a2f47", desc: "Fundo do balão do assistente." },
      { name: "bubble-bot-color", def: "#e2e8f0", desc: "Texto do balão do assistente." },
      { name: "bubble-user-bg", def: "accent-color", desc: "Fundo do balão do usuário." },
      { name: "bubble-user-color", def: "#fff", desc: "Texto do balão do usuário." },
    ],
  },
];

const endpoints: [string, string, string][] = [
  ["GET", "/history?email=&page=&limit=", "Lista conversas anteriores do usuário"],
  ["GET", "/createNewThread?email=&name=&cnpj=&agentName=", "Cria uma nova conversa (threadId)"],
  ["POST", "/chat/stream", "Envia mensagem e recebe resposta via SSE (status, token, done)"],
  ["POST", "/chat", "Fallback sem streaming"],
  ["GET", "/thread/{id}/messages", "Mensagens de uma conversa do histórico"],
  ["GET", "/thread/{id}/user-events", "SSE: mensagens enviadas pelo auditor humano"],
  ["POST", "/thread/{id}/receipts", "Recibos de entrega/leitura"],
  ["PUT", "/chat/{id}/feedback", "Feedback (👍/👎) por mensagem"],
  ["PUT", "/thread/{id}/feedback", "Nota de 1 a 5 da conversa"],
  ["DELETE", "/thread/{id}", "Exclui conversa do histórico"],
];

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        title="Copiar"
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
  // O layout do dashboard só renderiza no cliente (após checar login), então window existe aqui
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "https://dashia.arpasistemas.com.br"
  );

  const snippet = `<script src="${origin}/chat-ia-widget.js"></script>
<chat-ia-widget
  agent-name="VIMBO"
  agent-title="Sistema Vimbo"
  user-email="usuario@cliente.com.br"
  user-name="Nome do Usuário"
  user-cnpj="00000000000000"
  api-url="${API_URL}"
  api-key="<BACKEND_API_KEY>"
></chat-ia-widget>`;

  const jsApi = `const w = document.querySelector('chat-ia-widget');

w.openChat();   // abre o painel
w.closeChat();  // fecha o painel

// Trocar usuário/agente em tempo de execução:
// a conversa atual é descartada e o histórico recarregado.
w.setAttribute('user-email', 'outro@cliente.com.br');
w.setAttribute('user-cnpj', '12345678000100');`;

  const embedUrl = `${origin}/chat-embed.html
  ?agent-name=CONTROL
  &agent-title=Sistema CONTROL
  &user-email=usuario@cliente.com.br
  &user-name=Nome do Usuário
  &user-cnpj=00000000000000
  &api-url=${API_URL}
  &api-key=<BACKEND_API_KEY>
  &allow-minimize-and-close=false`;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Widget de Chat IA</h1>
        <p style={{ ...p, marginTop: 6 }}>
          Web component <span style={mono}>&lt;chat-ia-widget&gt;</span> para incorporar o assistente em qualquer
          página (portal, ERP web, Delphi WebView). Sem dependências e isolado via Shadow DOM.
        </p>
        <a
          href={`${API_URL}/docs`}
          target="_blank"
          rel="noopener"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--accent)" }}
        >
          Documentação da API (Swagger) <OpenIcon sx={{ fontSize: 14 }} />
        </a>
      </div>

      <Section title="1. Instalação">
        <p style={p}>Inclua o script uma vez e adicione a tag. O botão flutuante aparece no canto da tela.</p>
        <CodeBlock code={snippet} />
        <p style={{ ...p, marginTop: 12, marginBottom: 0 }}>
          Na primeira abertura o usuário vê um aviso de privacidade; o aceite fica salvo em{" "}
          <span style={mono}>localStorage[&quot;ia_consent&quot;]</span>.
        </p>
      </Section>

      <Section title="2. Atributos">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Atributo</th>
                <th style={th}>Padrão</th>
                <th style={th}>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {attrGroups.map((g) => [
                <tr key={g.title}>
                  <td colSpan={3} style={{ ...td, paddingTop: 16, fontWeight: 700, color: "var(--text-primary)" }}>{g.title}</td>
                </tr>,
                ...g.attrs.map((a) => (
                  <tr key={a.name}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <span style={mono}>{a.name}</span>
                      {a.required && <span style={{ color: "var(--accent)", marginLeft: 4 }} title="Obrigatório">*</span>}
                    </td>
                    <td style={{ ...td, ...mono, color: "var(--text-muted)" }}>{a.def}</td>
                    <td style={td}>{a.desc}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
        <p style={{ ...p, marginTop: 12, marginBottom: 0 }}>
          <span style={{ color: "var(--accent)" }}>*</span> obrigatório. Todos os atributos são reativos: alterar{" "}
          <span style={mono}>user-email</span>, <span style={mono}>user-cnpj</span> ou{" "}
          <span style={mono}>agent-name</span> reinicia a conversa; os demais apenas redesenham.
        </p>
      </Section>

      <Section title="3. API JavaScript">
        <CodeBlock code={jsApi} />
      </Section>

      <Section title="4. Modo tela cheia (iframe / WebView)">
        <p style={p}>
          Para Delphi WebView ou iframe, use <span style={mono}>chat-embed.html</span>: o chat ocupa 100% da janela,
          sem botão flutuante, e abre automaticamente. Os mesmos atributos são passados via query string (valores
          URL-encoded).
        </p>
        <CodeBlock code={embedUrl} />
      </Section>

      <Section title="5. Endpoints do backend usados">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {endpoints.map(([method, path, desc]) => (
                <tr key={method + path}>
                  <td style={{ ...td, ...mono, width: 70, color: "var(--accent)" }}>{method}</td>
                  <td style={{ ...td, ...mono }}>{path}</td>
                  <td style={td}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ ...p, marginTop: 12, marginBottom: 0 }}>
          Exemplos <span style={mono}>curl</span> de cada endpoint estão no{" "}
          <a href={`${API_URL}/docs`} target="_blank" rel="noopener" style={{ color: "var(--accent)" }}>Swagger</a>.
        </p>
      </Section>
    </div>
  );
}
