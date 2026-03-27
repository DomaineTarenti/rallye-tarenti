"use client";

export default function PlayerError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        backgroundColor: "#0d0d1a",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Oops</p>
      <p
        style={{
          color: "#9CA3AF",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
          maxWidth: "24rem",
        }}
      >
        {error.message || "Something went wrong"}
      </p>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <a
          href="/play"
          style={{
            backgroundColor: "#7F77DD",
            color: "#fff",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          Back to game
        </a>
        <a
          href="/"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            color: "#9CA3AF",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          Start over
        </a>
      </div>
    </div>
  );
}
