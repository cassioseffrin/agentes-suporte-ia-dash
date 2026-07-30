"use client";

import { useEffect } from "react";
import mermaid from "mermaid";

const diagram = `
sequenceDiagram
    autonumber

    actor U as Usuário
    actor A as Auditor
    participant Chat as Cliente Arpa<br/>(Portal Representante)
    participant Audit as Auditor Suporte<br/>(Dashboard)
    participant Backend as Backend API<br/>(Python)
    participant DB as PostgreSQL
    participant NLM as NotebookLM CLI<br/>(subprocess)
    participant OAI as OpenAI API<br/>(gpt-4o-mini)

    rect rgba(0, 50, 100, 0.4)
        Note over U,OAI: FASE 1 - Abertura do Chat e Configuração Inicial
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

    rect rgba(0, 100, 50, 0.4)
        Note over U,OAI: FASE 2 - Criação da Thread e Conexão de Eventos
        Chat->>Backend: GET /createNewThread?agentName=...
        Backend->>Backend: Gera UUID (threadId) e inicializa sessão
        Backend->>DB: UPSERT user
        Backend->>DB: INSERT INTO thread e chat
        Backend-->>Chat: { threadId: "uuid-xxxx" }
        
        Chat->>Backend: GET /thread/{threadId}/user-events (Conecta no SSE)
        Backend->>Backend: Atualiza status de presença para Online
        Backend-->>Chat: event: connected
        Chat-->>U: Exibe mensagem de boas-vindas
    end

    rect rgba(100, 70, 0, 0.4)
        Note over U,NLM: FASE 3 - Envio de Mensagem e Resposta (SSE Streaming Direto)
        U->>Chat: Digita mensagem
        Chat->>Chat: setIsTyping(true) / Start AbortController (timeout 240s)

        Chat->>Backend: POST /chat/stream { threadId, message, assistantName } (SSE)
        
        rect rgba(100, 50, 0, 0.3)
            Note over Backend,OAI: Etapa 3a - Reescrita da Pergunta (timeout 60s)
            Backend-->>Chat: event: status { stage: "rewriting" }
            Chat-->>U: Exibe "Preparando sua consulta..."
            Backend->>OAI: chat.completions.create (reescreve APENAS a pergunta)
            OAI-->>Backend: query reescrita (autocontida)
            Note over Backend: ⚠️ OpenAI NÃO reescreve a resposta
        end

        rect rgba(0, 50, 100, 0.3)
            Note over Backend,NLM: Etapa 3b - Busca + Resposta NotebookLM (timeout 240s)
            Backend-->>Chat: event: status { stage: "searching" }
            Chat-->>U: Exibe "Buscando nos manuais..."
            Backend->>NLM: notebooklm ask ...
            loop Chunks intermediários (thinking)
                NLM-->>Backend: chunk de pensamento
                Backend-->>Chat: event: status { stage: "thinking", detail: "..." }
                Chat-->>U: Exibe status do processamento
            end
            NLM-->>Backend: Resposta final dos manuais
            loop Parágrafos da resposta (streaming)
                Backend-->>Chat: event: token { text: "..." }
                Chat-->>U: Renderiza texto progressivamente
            end
        end

        rect rgba(70, 30, 100, 0.4)
            Note over Backend,DB: Etapa 3c - Persistência (assíncrona)
            Backend-->>Chat: event: status { stage: "saving" }
            Backend->>DB: Salva mensagens e cria Subject (assunto curto)
        end

        Backend-->>Chat: event: done { chat_id, content }
        Chat->>Chat: setIsTyping(false)
        Chat-->>U: Exibe resposta final com feedback
    end

    rect rgba(0, 80, 120, 0.4)
        Note over A,U: FASE 4 - Auditoria e Intervenção do Suporte (Injeção da Verdade)
        A->>Audit: Acessa conversa em andamento
        Audit->>Backend: GET /thread/{threadId}/presence (Conecta no SSE)
        Backend-->>Audit: event: presence { online: true }
        Audit-->>A: Mostra indicador verde "Online"
        
        A->>Audit: Digita e envia correção/mensagem para o usuário
        Audit->>Backend: POST /thread/{threadId}/auditor-message
        Backend->>DB: Persiste chat com origem='auditor'
        Backend-->>Chat: Pusheia mensagem por GET /user-events -- event: auditor_message
        Backend-->>Audit: Retorna status OK (e new_message pro SSE do Auditor)
        
        Chat-->>U: Renderiza a mensagem do auditor em dourado com ícone humano
        
        Backend->>Backend: Anexa à session em memória como {role: "system", "[CORREÇÃO DO SUPORTE HUMANO]: ..."}
        Note over Backend,OAI: Nas próximas perguntas do Usuário:
        Backend->>OAI: Query Rewrite é instruído a incorporar a correção humana
        Note over Backend: A resposta continua vindo direto do NotebookLM<br/>(sem reescrita OpenAI = sem alucinações)
    end

    rect rgba(100, 0, 0, 0.4)
        Note over U,Chat: TIMEOUT DO CLIENTE - AbortController (240s)
        Note over Chat: Se conexão falhar, tenta fallback POST /chat (não streaming).
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
