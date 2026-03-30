import Sidebar from "../components/Sidebar";

export default function DashboardShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main
        style={{
          marginLeft: "var(--sidebar-width)",
          flex: 1,
          padding: "32px",
          minHeight: "100vh",
          background: "var(--bg-base)",
        }}
      >
        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          main { margin-left: 0 !important; padding: 16px !important; padding-top: 56px !important; }
        }
      `}</style>
    </div>
  );
}
