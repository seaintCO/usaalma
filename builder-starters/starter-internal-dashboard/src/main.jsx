import React from "react";
import { createRoot } from "react-dom/client";
import { Activity, TrendingUp } from "lucide-react";
import "./style.css";

function App() {
  return (
    <main>
      <header>
        <Activity />
        <h1>Operations dashboard</h1>
      </header>
      <section>
        <div>
          <span>Open work</span>
          <strong>12</strong>
        </div>
        <div>
          <span>Revenue</span>
          <strong>$24.8k</strong>
        </div>
        <div>
          <span>Trend</span>
          <strong>
            <TrendingUp size={28} /> Up
          </strong>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
