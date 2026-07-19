import React from "react";
import { createRoot } from "react-dom/client";
import { FileText, ListChecks, MessageSquare } from "lucide-react";
import "./style.css";

const cards = [
  ["Documents", FileText],
  ["Tasks", ListChecks],
  ["Messages", MessageSquare],
];

function App() {
  return (
    <main>
      <h1>Client portal</h1>
      <div className="grid">
        {cards.map(([label, Icon]) => (
          <article key={label}>
            <Icon />
            <h2>{label}</h2>
            <p>Connect this surface to real project data when approved.</p>
          </article>
        ))}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
