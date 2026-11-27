import type { Locale } from "../../i18n/I18nContext";

/* Diagrama de sequência da arquitetura do chat, em cada idioma. */

const ptBR = `
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

const enUS = `
sequenceDiagram
    autonumber

    actor U as User
    actor A as Auditor
    participant Chat as Arpa Client<br/>(Sales Rep Portal)
    participant Audit as Support Auditor<br/>(Dashboard)
    participant Backend as Backend API<br/>(Python)
    participant DB as PostgreSQL
    participant NLM as NotebookLM CLI<br/>(subprocess)
    participant OAI as OpenAI API<br/>(gpt-4o-mini)

    rect rgba(0, 50, 100, 0.4)
        Note over U,OAI: PHASE 1 - Chat Opening and Initial Setup
        U->>Chat: Clicks the FAB (AI Assistant)
        Chat->>Chat: Checks localStorage "ia_consent"

        alt Consent not yet given
            Chat-->>U: Shows Privacy and AI Notice screen
            U->>Chat: Clicks "I agree"
            Chat->>Chat: Saves "ia_consent=true"
        end

        Chat->>Backend: GET /agents
        Backend->>DB: SELECT id, name, title FROM agent WHERE active = TRUE
        DB-->>Backend: Agent list
        Backend-->>Chat: { agents: [...] }
        Chat-->>U: Shows Agent selection screen
        U->>Chat: Selects an Agent
    end

    rect rgba(0, 100, 50, 0.4)
        Note over U,OAI: PHASE 2 - Thread Creation and Event Connection
        Chat->>Backend: GET /createNewThread?agentName=...
        Backend->>Backend: Generates UUID (threadId) and initializes session
        Backend->>DB: UPSERT user
        Backend->>DB: INSERT INTO thread and chat
        Backend-->>Chat: { threadId: "uuid-xxxx" }

        Chat->>Backend: GET /thread/{threadId}/user-events (Connects to SSE)
        Backend->>Backend: Updates presence status to Online
        Backend-->>Chat: event: connected
        Chat-->>U: Shows welcome message
    end

    rect rgba(100, 70, 0, 0.4)
        Note over U,NLM: PHASE 3 - Message Sending and Response (Direct SSE Streaming)
        U->>Chat: Types message
        Chat->>Chat: setIsTyping(true) / Start AbortController (timeout 240s)

        Chat->>Backend: POST /chat/stream { threadId, message, assistantName } (SSE)

        rect rgba(100, 50, 0, 0.3)
            Note over Backend,OAI: Step 3a - Question Rewrite (timeout 60s)
            Backend-->>Chat: event: status { stage: "rewriting" }
            Chat-->>U: Shows "Preparing your query..."
            Backend->>OAI: chat.completions.create (rewrites ONLY the question)
            OAI-->>Backend: rewritten query (self-contained)
            Note over Backend: ⚠️ OpenAI does NOT rewrite the answer
        end

        rect rgba(0, 50, 100, 0.3)
            Note over Backend,NLM: Step 3b - NotebookLM Search + Answer (timeout 240s)
            Backend-->>Chat: event: status { stage: "searching" }
            Chat-->>U: Shows "Searching the manuals..."
            Backend->>NLM: notebooklm ask ...
            loop Intermediate chunks (thinking)
                NLM-->>Backend: thinking chunk
                Backend-->>Chat: event: status { stage: "thinking", detail: "..." }
                Chat-->>U: Shows processing status
            end
            NLM-->>Backend: Final answer from the manuals
            loop Answer paragraphs (streaming)
                Backend-->>Chat: event: token { text: "..." }
                Chat-->>U: Renders text progressively
            end
        end

        rect rgba(70, 30, 100, 0.4)
            Note over Backend,DB: Step 3c - Persistence (asynchronous)
            Backend-->>Chat: event: status { stage: "saving" }
            Backend->>DB: Saves messages and creates Subject (short topic)
        end

        Backend-->>Chat: event: done { chat_id, content }
        Chat->>Chat: setIsTyping(false)
        Chat-->>U: Shows final answer with feedback
    end

    rect rgba(0, 80, 120, 0.4)
        Note over A,U: PHASE 4 - Support Audit and Intervention (Truth Injection)
        A->>Audit: Opens ongoing conversation
        Audit->>Backend: GET /thread/{threadId}/presence (Connects to SSE)
        Backend-->>Audit: event: presence { online: true }
        Audit-->>A: Shows green "Online" indicator

        A->>Audit: Types and sends correction/message to the user
        Audit->>Backend: POST /thread/{threadId}/auditor-message
        Backend->>DB: Persists chat with origin='auditor'
        Backend-->>Chat: Pushes message via GET /user-events -- event: auditor_message
        Backend-->>Audit: Returns status OK (and new_message to the Auditor SSE)

        Chat-->>U: Renders the auditor message in gold with a human icon

        Backend->>Backend: Appends to in-memory session as {role: "system", "[HUMAN SUPPORT CORRECTION]: ..."}
        Note over Backend,OAI: On the User's next questions:
        Backend->>OAI: Query Rewrite is instructed to incorporate the human correction
        Note over Backend: The answer still comes straight from NotebookLM<br/>(no OpenAI rewrite = no hallucinations)
    end

    rect rgba(100, 0, 0, 0.4)
        Note over U,Chat: CLIENT TIMEOUT - AbortController (240s)
        Note over Chat: If the connection fails, falls back to POST /chat (non-streaming).
    end
`;

const es = `
sequenceDiagram
    autonumber

    actor U as Usuario
    actor A as Auditor
    participant Chat as Cliente Arpa<br/>(Portal Representante)
    participant Audit as Auditor Soporte<br/>(Dashboard)
    participant Backend as Backend API<br/>(Python)
    participant DB as PostgreSQL
    participant NLM as NotebookLM CLI<br/>(subprocess)
    participant OAI as OpenAI API<br/>(gpt-4o-mini)

    rect rgba(0, 50, 100, 0.4)
        Note over U,OAI: FASE 1 - Apertura del Chat y Configuración Inicial
        U->>Chat: Hace clic en el FAB (Asistente IA)
        Chat->>Chat: Verifica localStorage "ia_consent"

        alt Consentimiento aún no otorgado
            Chat-->>U: Muestra pantalla de Aviso de Privacidad e IA
            U->>Chat: Hace clic en "Acepto"
            Chat->>Chat: Guarda "ia_consent=true"
        end

        Chat->>Backend: GET /agents
        Backend->>DB: SELECT id, name, title FROM agent WHERE active = TRUE
        DB-->>Backend: Lista de agentes
        Backend-->>Chat: { agents: [...] }
        Chat-->>U: Muestra pantalla de selección de Agente
        U->>Chat: Selecciona un Agente
    end

    rect rgba(0, 100, 50, 0.4)
        Note over U,OAI: FASE 2 - Creación del Thread y Conexión de Eventos
        Chat->>Backend: GET /createNewThread?agentName=...
        Backend->>Backend: Genera UUID (threadId) e inicializa la sesión
        Backend->>DB: UPSERT user
        Backend->>DB: INSERT INTO thread y chat
        Backend-->>Chat: { threadId: "uuid-xxxx" }

        Chat->>Backend: GET /thread/{threadId}/user-events (Conecta al SSE)
        Backend->>Backend: Actualiza estado de presencia a Online
        Backend-->>Chat: event: connected
        Chat-->>U: Muestra mensaje de bienvenida
    end

    rect rgba(100, 70, 0, 0.4)
        Note over U,NLM: FASE 3 - Envío de Mensaje y Respuesta (SSE Streaming Directo)
        U->>Chat: Escribe mensaje
        Chat->>Chat: setIsTyping(true) / Start AbortController (timeout 240s)

        Chat->>Backend: POST /chat/stream { threadId, message, assistantName } (SSE)

        rect rgba(100, 50, 0, 0.3)
            Note over Backend,OAI: Etapa 3a - Reescritura de la Pregunta (timeout 60s)
            Backend-->>Chat: event: status { stage: "rewriting" }
            Chat-->>U: Muestra "Preparando tu consulta..."
            Backend->>OAI: chat.completions.create (reescribe SOLO la pregunta)
            OAI-->>Backend: query reescrita (autocontenida)
            Note over Backend: ⚠️ OpenAI NO reescribe la respuesta
        end

        rect rgba(0, 50, 100, 0.3)
            Note over Backend,NLM: Etapa 3b - Búsqueda + Respuesta NotebookLM (timeout 240s)
            Backend-->>Chat: event: status { stage: "searching" }
            Chat-->>U: Muestra "Buscando en los manuales..."
            Backend->>NLM: notebooklm ask ...
            loop Chunks intermedios (thinking)
                NLM-->>Backend: chunk de razonamiento
                Backend-->>Chat: event: status { stage: "thinking", detail: "..." }
                Chat-->>U: Muestra estado del procesamiento
            end
            NLM-->>Backend: Respuesta final de los manuales
            loop Párrafos de la respuesta (streaming)
                Backend-->>Chat: event: token { text: "..." }
                Chat-->>U: Renderiza el texto progresivamente
            end
        end

        rect rgba(70, 30, 100, 0.4)
            Note over Backend,DB: Etapa 3c - Persistencia (asíncrona)
            Backend-->>Chat: event: status { stage: "saving" }
            Backend->>DB: Guarda mensajes y crea Subject (asunto corto)
        end

        Backend-->>Chat: event: done { chat_id, content }
        Chat->>Chat: setIsTyping(false)
        Chat-->>U: Muestra respuesta final con feedback
    end

    rect rgba(0, 80, 120, 0.4)
        Note over A,U: FASE 4 - Auditoría e Intervención del Soporte (Inyección de la Verdad)
        A->>Audit: Accede a la conversación en curso
        Audit->>Backend: GET /thread/{threadId}/presence (Conecta al SSE)
        Backend-->>Audit: event: presence { online: true }
        Audit-->>A: Muestra indicador verde "Online"

        A->>Audit: Escribe y envía corrección/mensaje al usuario
        Audit->>Backend: POST /thread/{threadId}/auditor-message
        Backend->>DB: Persiste chat con origen='auditor'
        Backend-->>Chat: Envía mensaje por GET /user-events -- event: auditor_message
        Backend-->>Audit: Devuelve status OK (y new_message al SSE del Auditor)

        Chat-->>U: Renderiza el mensaje del auditor en dorado con ícono humano

        Backend->>Backend: Adjunta a la sesión en memoria como {role: "system", "[CORRECCIÓN DEL SOPORTE HUMANO]: ..."}
        Note over Backend,OAI: En las próximas preguntas del Usuario:
        Backend->>OAI: Query Rewrite recibe instrucción de incorporar la corrección humana
        Note over Backend: La respuesta sigue viniendo directo de NotebookLM<br/>(sin reescritura OpenAI = sin alucinaciones)
    end

    rect rgba(100, 0, 0, 0.4)
        Note over U,Chat: TIMEOUT DEL CLIENTE - AbortController (240s)
        Note over Chat: Si la conexión falla, intenta fallback POST /chat (sin streaming).
    end
`;

export const diagrams: Record<Locale, string> = {
  "pt-BR": ptBR,
  "en-US": enUS,
  es,
};
