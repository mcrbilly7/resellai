import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "../lib/auth";
import * as st from "../lib/styles";

const FEATURES = [
  {
    title: "Real accounts",
    body: "Email/password signup and login with hashed passwords and secure sessions - no more everything living in one browser tab.",
  },
  {
    title: "Shared inventory",
    body: "One inventory your whole team works from, with every read and write checked against permissions on the server.",
  },
  {
    title: "Team roles",
    body: "Add workers by email and control exactly what they can see and do - viewer, buyer, seller, or a custom mix.",
  },
  {
    title: "Admin panel",
    body: "See every account, edit or remove any of them, and send email to everyone or just the people you choose.",
  },
];

export default function Home() {
  const userId = getSessionUserId();
  if (userId) redirect("/settings");

  return (
    <div style={{ minHeight: "100vh", background: st.pageBg }}>
      <nav style={{ maxWidth: 1080, margin: "0 auto", padding: "24px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3 }}>ResellAI</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link href="/login" style={{ ...st.link, color: "#12201B" }}>Log in</Link>
          <Link href="/signup" style={{ ...st.button, width: "auto", padding: "9px 18px", display: "inline-block", textDecoration: "none" }}>
            Sign up free
          </Link>
        </div>
      </nav>

      <header
        style={{
          background: st.brandGradient,
          color: "#fff",
          margin: "0 16px",
          borderRadius: 24,
          padding: "72px 24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 800, lineHeight: 1.15, maxWidth: 720, margin: "0 auto 18px" }}>
          The backend for running a real reselling business
        </h1>
        <p style={{ fontSize: 16.5, color: "rgba(255,255,255,0.88)", maxWidth: 560, margin: "0 auto 32px" }}>
          Accounts, a shared team inventory, permissions, and an admin panel - everything your
          resale operation needs once it outgrows a spreadsheet in one browser tab.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/signup"
            style={{ ...st.button, width: "auto", padding: "13px 26px", fontSize: 15.5, background: "#fff", color: "#0E6B45", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", textDecoration: "none", display: "inline-block" }}
          >
            Create your account
          </Link>
          <Link
            href="/login"
            style={{ ...st.secondaryButton, width: "auto", padding: "13px 26px", fontSize: 15.5, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.45)", textDecoration: "none", display: "inline-block" }}
          >
            Log in
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "72px 24px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>Everything gated behind one login</h2>
        <p style={{ fontSize: 14.5, color: "#666C61", textAlign: "center", maxWidth: 520, margin: "0 auto 44px" }}>
          Sign up and you get access immediately - your own account, your own inventory, and the
          ability to bring your team in whenever you're ready.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: "#fff", border: "1px solid #DEE1D7", borderRadius: 14, padding: 22 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: "#666C61", lineHeight: 1.55 }}>{f.body}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 56 }}>
          <Link href="/signup" style={{ ...st.button, width: "auto", padding: "13px 30px", fontSize: 15.5, textDecoration: "none", display: "inline-block" }}>
            Get started - it's free
          </Link>
        </div>
      </main>

      <footer style={{ textAlign: "center", padding: "24px 24px 40px", fontSize: 12.5, color: "#666C61" }}>
        &copy; {new Date().getFullYear()} ResellAI
      </footer>
    </div>
  );
}
