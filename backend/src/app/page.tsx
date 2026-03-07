import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <span style={{ fontSize: "3rem" }}>🇮🇳</span>
          <h1>JanSahayak AI</h1>
          <p>Your AI-powered government schemes assistant. Ask questions in plain language and get simple, clear answers about 4,500+ Indian government schemes.</p>
        </div>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/app/">
            💬&nbsp; Open Chat Assistant
          </Link>
          <Link className={styles.secondary} href="/api/v1/auth/session">
            🔌&nbsp; API Health Check
          </Link>
        </div>

        <div className={styles.intro} style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>How it Works</h2>
          <ol style={{ textAlign: "left", lineHeight: 1.8 }}>
            <li>Choose your language & persona (farmer, student, etc.)</li>
            <li>Ask any question about government schemes</li>
            <li>Get an easy-to-understand answer with official source links</li>
          </ol>
        </div>

        <p style={{ marginTop: "2rem", fontSize: "0.8rem", opacity: 0.6 }}>
          Built for AI for Bharat Hackathon &bull; Powered by Gemini + Pinecone RAG
        </p>
      </main>
    </div>
  );
}
