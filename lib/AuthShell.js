import Link from "next/link";
import * as st from "./styles";

const FEATURES = [
  "Real accounts with secure password login",
  "Shared inventory your whole team can work from",
  "Role-based access - control who sees what",
  "Admin panel to manage every account in one place",
];

export default function AuthShell({ children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: st.pageBg }}>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "none",
          padding: 56,
          background: st.brandGradient,
          color: "#fff",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
        className="auth-brand-panel"
      >
        <Link href="/" style={{ color: "#fff", textDecoration: "none", fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>
          ResellAI
        </Link>
        <div>
          <h1 style={{ fontSize: 34, lineHeight: 1.25, fontWeight: 800, margin: "0 0 20px", maxWidth: 420 }}>
            Run your resale business like a real operation.
          </h1>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380 }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14.5, color: "rgba(255,255,255,0.92)" }}>
                <span style={{ marginTop: 2 }}>&#10003;</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", margin: 0 }}>
          &copy; {new Date().getFullYear()} ResellAI
        </p>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%" }}>{children}</div>
      </div>

      <style>{`@media (min-width: 860px) { .auth-brand-panel { display: flex !important; } }`}</style>
    </div>
  );
}
