import React from "react";
import { createRoot } from "react-dom/client";
import { CalendarCheck, Clock, Send } from "lucide-react";
import "./style.css";

function App() {
  return (
    <main className="shell">
      <section>
        <CalendarCheck />
        <h1>Book a service</h1>
        <p>
          Capture the customer request, preferred time, and service details.
        </p>
      </section>
      <form>
        <label>
          Service
          <input placeholder="Consultation" />
        </label>
        <label>
          <Clock size={16} /> Preferred time
          <input placeholder="Tomorrow morning" />
        </label>
        <button>
          <Send size={16} /> Request booking
        </button>
      </form>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
