"use client";

import { useEffect } from "react";
import mermaid from "mermaid";

const diagram = `
sequenceDiagram
    autonumber

    actor U as Usuário
    participant Chat as ChatIA.tsx<br/>(Next.js Dashboard)
    participant Backend as Backend FastAPI<br/>(agentes-suporte-ia)
    participant DB as PostgreSQL
    participant NLM as NotebookLM CLI<br/>(subprocess)
    participant OAI as OpenAI API<br/>(gpt-4o-mini)

    rect rgb(230, 240, 255)
        Note over U,OAI: FASE 1 — Abertura do Chat e Configuração Inicial
        U->>Chat: Clica no FAB (Assistente IA)
        Chat->>Chat: Verifica localStorage "ia_consent"

        alt Consentimento ainda não dado
            Chat-->>U: Exibe tela de Aviso de Privacidade e IA
            U->>Chat: Clica "Aceito"
            Chat->>Chat: Salva "ia_consent=true"
        end

        Chat->>Backend: GET /agents
        Backend->>DB: SELECT id, name, title FROM agent WHERE active = TRUE
        DB-->>Backend: Lista de agentes
        Backend-->>Chat: { agents: [...] }
        Chat-->>U: Exibe tela de seleção de Agente
        U->>Chat: Seleciona um Agente
    end

    rect rgb(230, 255, 240)
        Note over U,OAI: FASE 2 — Criação da Thread (Sessão)
        Chat->>Backend: GET /createNewThread?agentName=...
        Backend->>Backend: Gera UUID (threadId) e inicializa sessão
        Backend->>DB: UPSERT user
        Backend->>DB: INSERT INTO thread e chat
        Backend-->>Chat: { threadId: "uuid-xxxx" }
        Chat-->>U: Exibe mensagem de boas-vindas
    end

    rect rgb(255, 245, 220)
        Note over U,OAI: FASE 3 — Envio de Mensagem e Resposta
        U->>Chat: Digita mensagem
        Chat->>Chat: setIsTyping(true) / Start AbortController (timeout 240s)

        Chat->>Backend: POST /chat { threadId, message, assistantName }
        
        rect rgb(255, 230, 200)
            Note over Backend,OAI: Etapa 3a — Query Rewriting (timeout 60s)
            Backend->>OAI: chat.completions.create (escreve query autocontida)
            OAI-->>Backend: query reescrita
        end

        rect rgb(200, 230, 255)
            Note over Backend,NLM: Etapa 3b — Busca RAG NotebookLM (timeout 240s)
            Backend->>NLM: notebooklm ask ...
            NLM-->>Backend: Contexto dos manuais
        end

        rect rgb(220, 255, 220)
            Note over Backend,OAI: Etapa 3c — Geração (timeout 120s)
            Backend->>OAI: chat.completions.create (gera resposta com contexto)
            OAI-->>Backend: resposta gerada
        end

        rect rgb(240, 220, 255)
            Note over Backend,DB: Etapa 3d — Persistência (assíncrona)
            Backend->>DB: Salva mensagens e cria Subject (assunto curt)
        end

        Backend-->>Chat: { content: [...] }
        Chat->>Chat: setIsTyping(false)
        Chat-->>U: Exibe resposta
    end

    rect rgb(255, 220, 220)
        Note over U,Chat: TIMEOUT DO CLIENTE — AbortController (240s)
        Note over Chat: Se fetch falhar (4 min), encerra digitando e exibe erro.
    end
`;

export default function ArquiteturaPage() {
  useEffect(() => {
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    mermaid.contentLoaded();
  }, []);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          Arquitetura do Chat
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Diagrama de sequência documentando o fluxo completo de comunicação (incluindo possíveis timeouts).
        </p>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "24px",
          marginBottom: 24,
          overflowX: "auto"
        }}
      >
        <div className="mermaid" style={{ display: "flex", justifyContent: "center" }}>
          {diagram}
        </div>
      </div>
    </div>
  );
}
