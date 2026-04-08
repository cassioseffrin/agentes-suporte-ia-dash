import ChatIA from "../../components/ChatIA";

export default function TestarAgentesPage() {
  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 800 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          Testar Agentes
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Clique no botão flutuante no canto inferior direito para abrir o chat e interagir com os agentes para teste.
        </p>
      </div>
      
      {/* Container to render the component */}
      {/* <div style={{ position: "relative", minHeight: "400px", padding: 20, background: "var(--bg-surface)", borderRadius: "var(--radius)", border: "1px dashed var(--accent)" }}> */}
        {/* <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "2rem" }}>
          Widget do chat ativo nesta página.
        </p> */}
        
        {/* Render ChatIA. We pass a mock session so the test works naturally */}
        <ChatIA 
          session={{
            user: {
              userAuthentication: {
                username: "admin@test.com",
                nome: "Conta de Testes - admin",
                tenantId: { schemaFilial: "test_tenant" }
              }
            }
          }} 
        />
      {/* </div> */}
    </div>
  );
}
