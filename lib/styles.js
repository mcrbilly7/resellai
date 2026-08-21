export const card = {
  maxWidth: 380,
  margin: "72px auto",
  padding: 32,
  background: "#FFFFFF",
  border: "1px solid #DEE1D7",
  borderRadius: 16,
  boxShadow: "0 1px 2px rgba(18,32,27,0.04), 0 16px 40px rgba(18,32,27,0.08)",
};

export const input = {
  display: "block",
  width: "100%",
  padding: "11px 13px",
  marginBottom: 12,
  borderRadius: 9,
  border: "1px solid #DEE1D7",
  boxSizing: "border-box",
  fontSize: 14,
  background: "#FCFCFB",
};

export const button = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 9,
  border: "none",
  background: "linear-gradient(135deg, #14A46C, #0E6B45)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14.5,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(18,145,95,0.28)",
};

export const secondaryButton = {
  ...button,
  background: "#FFFFFF",
  color: "#12201B",
  border: "1px solid #DEE1D7",
  boxShadow: "none",
};

export const dangerButton = {
  ...button,
  background: "#B23A2C",
  boxShadow: "0 2px 8px rgba(178,58,44,0.25)",
};

export const link = { color: "#0E6B45", textDecoration: "none", fontWeight: 600 };

export const errorText = { color: "#B23A2C", fontSize: 13, marginBottom: 10 };
export const successText = { color: "#0E6B45", fontSize: 13, marginBottom: 10 };
export const label = { display: "block", fontSize: 11.5, fontWeight: 700, color: "#666C61", marginBottom: 5, letterSpacing: 0.3 };

// Landing page + auth-screen branding tokens
export const brandGradient = "linear-gradient(160deg, #0B3B2A 0%, #0E6B45 55%, #14A46C 100%)";
export const pageBg = "#F5F6F8";
