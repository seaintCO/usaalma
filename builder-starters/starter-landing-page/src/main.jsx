import React from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight, Sparkles } from "lucide-react";
import "./style.css";

function App() {
  return (
    <main className="page">
      <section className="hero">
        <div className="badge">
          <Sparkles size={16} /> ALMA Builder starter
        </div>
        <h1>Premium service website</h1>
        <p>
          Replace this starter with a focused offer, crisp proof, and a clear
          path for customers to take action.
        </p>
        <button>
          Get started <ArrowRight size={18} />
        </button>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
