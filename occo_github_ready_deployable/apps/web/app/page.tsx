"use client";

import { useMemo, useState } from "react";

type ScoreResponse = {
  issuer: "OCCO";
  wallet: string;
  modelVersion: string;
  score: number;
  riskTier: string;
  confidence: number;
  flags: string[];
  computedAt: string;
};

export default function Page() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_OCCO_API_BASE ?? "http://localhost:3000", []);
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ScoreResponse | null>(null);

  async function lookup() {
    setErr(null);
    setData(null);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/v1/score/${wallet}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "request_failed");
      setData(json);
    } catch (e: any) {
      setErr(e?.message ?? "request_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.logo}>OCCO</div>
        <div style={styles.tagline}>The Credit Standard for On-Chain Finance</div>
      </header>

      <section style={styles.card}>
        <label style={styles.label}>Solana Wallet Address</label>
        <input
          value={wallet}
          onChange={(e) => setWallet(e.target.value.trim())}
          placeholder="Enter wallet address"
          style={styles.input}
        />
        <button onClick={lookup} disabled={loading || wallet.length < 32} style={styles.button}>
          {loading ? "Searching…" : "Search"}
        </button>

        {err && <div style={styles.error}>Error: {err}</div>}
      </section>

      {data && (
        <section style={styles.card}>
          <h2 style={styles.h2}>OCCO Credit Summary</h2>
          <div style={styles.grid}>
            <div>
              <div style={styles.k}>OCCO Score</div>
              <div style={styles.v}>{data.score}</div>
            </div>
            <div>
              <div style={styles.k}>Risk Tier</div>
              <div style={styles.v}>{data.riskTier}</div>
            </div>
            <div>
              <div style={styles.k}>Confidence</div>
              <div style={styles.v}>{data.confidence}</div>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={styles.k}>Flags</div>
            <ul style={styles.ul}>
              {(data.flags?.length ? data.flags : ["none"]).map((f) => (
                <li key={f} style={styles.li}>{f}</li>
              ))}
            </ul>
          </div>

          <div style={styles.meta}>
            Issuer: {data.issuer} • Model: {data.modelVersion} • Computed: {new Date(data.computedAt).toLocaleString()}
          </div>
        </section>
      )}

      <footer style={styles.footer}>
        OCCO provides informational analytics only. Not financial advice.
      </footer>
    </main>
  );
}

const styles: Record<string, any> = {
  page: {
    fontFamily: "IBM Plex Sans, Arial, sans-serif",
    background: "#f7f9fb",
    minHeight: "100vh",
    padding: "24px",
    color: "#1C1F26",
  },
  header: {
    maxWidth: 900,
    margin: "0 auto 24px auto",
    borderBottom: "1px solid #D1D5DB",
    paddingBottom: 16,
  },
  logo: { fontSize: 28, fontWeight: 600, letterSpacing: 2, color: "#0B1F33" },
  tagline: { color: "#5A6B7A", marginTop: 6 },
  card: {
    maxWidth: 900,
    margin: "0 auto 16px auto",
    background: "#fff",
    border: "1px solid #D1D5DB",
    borderRadius: 6,
    padding: 20,
  },
  label: { display: "block", color: "#5A6B7A", marginBottom: 8 },
  input: {
    width: "100%",
    padding: 12,
    border: "1px solid #D1D5DB",
    borderRadius: 4,
    fontSize: 14,
  },
  button: {
    marginTop: 12,
    padding: "12px 14px",
    background: "#0B1F33",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontWeight: 600,
  },
  error: { marginTop: 12, color: "#B91C1C" },
  h2: { margin: "0 0 14px 0", fontSize: 18 },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 },
  k: { color: "#5A6B7A", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  v: { fontSize: 22, fontWeight: 600, marginTop: 6 },
  ul: { margin: "10px 0 0 18px" },
  li: { marginBottom: 6 },
  meta: { marginTop: 16, color: "#5A6B7A", fontSize: 12 },
  footer: { maxWidth: 900, margin: "24px auto 0 auto", color: "#5A6B7A", fontSize: 12 },
};
