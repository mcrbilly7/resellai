export const metadata = {
  title: "ResellAI",
  description: "AI-powered reselling accounts",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", background: "#F5F6F8", color: "#12201B" }}>
        {children}
      </body>
    </html>
  );
}
