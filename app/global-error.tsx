"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ backgroundColor: "#0d0d1a", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>😕</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
            Une erreur s&apos;est produite
          </h1>
          <p style={{ color: "#9CA3AF", fontSize: "0.875rem", marginBottom: "1.5rem", maxWidth: "20rem" }}>
            Ne vous inquiétez pas, votre progression est sauvegardée.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{ backgroundColor: "#7F77DD", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "0.875rem" }}
            >
              Réessayer
            </button>
            <a
              href="/"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff", padding: "0.75rem 1.5rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.15)", fontWeight: "600", cursor: "pointer", textDecoration: "none", fontSize: "0.875rem" }}
            >
              Accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
