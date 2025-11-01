import { useState } from "react";

import { predict } from "../services/ids.js";

export default function DemoPredict() {
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const r = await predict({ features: [0.1, 0.2, 0.3] });
      setResp(r);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Demo /predict</h2>
      <button onClick={handleClick} disabled={loading}>
        {loading ? "Consultando..." : "Probar predicción"}
      </button>
      <pre style={{ marginTop: 12 }}>
        {resp ? JSON.stringify(resp, null, 2) : "Sin respuesta aún"}
      </pre>
    </div>
  );
}
