import ChatIA from "../../components/ChatIA";
import ChatAuditList from "../../components/ChatAuditList";

export default function TestarAgentesPage() {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Testar Agentes
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Use o botão flutuante para testar novos chats. Abaixo, audite todas as conversas registradas.
        </p>
      </div>

      {/* Section: Audit list (full width) */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent, #bd4140) 0%, var(--accent-hover, #a03534) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            💬
          </div>
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              Auditoria de Conversas
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              Clique em uma conversa para visualizar as mensagens completas
            </p>
          </div>
        </div>

        <ChatAuditList />
      </div>

      {/* ChatIA balloon - preserved as-is for testing new chats */}
      <ChatIA 
        session={{
          user: {
            userAuthentication: {
              username: "admin@arpasistemas.com.br",
              nome: "Conta de Testes - admin",
              tenantId: { schemaFilial: "03600477000104" }
            }
          }
        }} 
      />
    </div>
  );
}
