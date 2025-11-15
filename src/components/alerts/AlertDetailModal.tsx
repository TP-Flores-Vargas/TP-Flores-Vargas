import { useMemo, useState } from "react";

import type { Alert, AttackType } from "../../api/alerts";
import { SeverityBadge } from "../SeverityBadge";
import {
  formatPercent,
  getBenignConfidence,
  getConfidenceLabel,
  getDisplayConfidence,
  getRiskScore,
} from "../../utils/modelConfidence";
import { formatFullLocal, formatLocalTimestamp, formatUtcTimestamp } from "../../utils/time";

const PLAYBOOK_FALLBACK: Record<AttackType, string[]> = {
  Benign: ["Registrar el evento para entrenamiento futuro.", "Verificar falsos positivos.", "No se requiere acción inmediata."],
  DoS: [
    "Aplicar rate limiting en el servicio impactado.",
    "Bloquear temporalmente la IP de origen.",
    "Notificar al equipo de redes si la saturación continúa.",
  ],
  DDoS: [
    "Activar mitigación DDoS en el borde o proveedor.",
    "Coordinar con el ISP para filtrar prefijos maliciosos.",
    "Monitorear métricas de disponibilidad cada 5 minutos.",
  ],
  PortScan: [
    "Bloquear la IP ofensora en el firewall.",
    "Auditar servicios expuestos en el segmento escaneado.",
    "Revisar logs para intentos subsecuentes.",
  ],
  BruteForce: [
    "Habilitar MFA en los servicios atacados.",
    "Bloquear la IP origen y rotar credenciales.",
    "Revisar registros de autenticación fallida.",
  ],
  XSS: [
    "Aplicar reglas WAF para bloquear payloads detectados.",
    "Validar sanitización en la aplicación objetivo.",
    "Notificar al equipo de desarrollo para corregir inputs.",
  ],
  SQLi: [
    "Bloquear patrones en WAF/IDS.",
    "Ejecutar escaneo de seguridad en la aplicación.",
    "Verificar integridad de la base de datos y respaldos.",
  ],
  Bot: [
    "Aislar el host comprometido y ejecutar análisis DFIR.",
    "Revocar credenciales utilizadas desde el dispositivo.",
    "Monitorear tráfico hacia dominios C2 relacionados.",
  ],
  Infiltration: [
    "Aislar el activo comprometido inmediatamente.",
    "Coordinar con equipo forense para preservar evidencia.",
    "Iniciar plan de respuesta a incidentes completo.",
  ],
  Other: [
    "Revisar la consola de Zeek/IDS para más contexto.",
    "Correlacionar con otras alertas del mismo origen.",
    "Escalar al SOC si el comportamiento se repite.",
  ],
};

const TITLE_MAP: Partial<Record<AttackType, string>> = {
  Bot: "Malware Detectado",
  DDoS: "Ataque Distribuido Detectado",
  DoS: "Ataque de Denegación Detectado",
  PortScan: "Escaneo de Puertos Detectado",
  BruteForce: "Ataque de Fuerza Bruta",
  XSS: "Intento de XSS",
  SQLi: "Intento de SQL Injection",
  Infiltration: "Infiltración Detectada",
};

interface Props {
  alert: Alert;
  onClose: () => void;
}

const AlertDetailModal = ({ alert, onClose }: Props) => {
  const [showJson, setShowJson] = useState(false);
  const summary =
    (alert.meta?.summary as string) || TITLE_MAP[alert.attack_type] || alert.attack_type;
  const actions =
    (Array.isArray(alert.meta?.playbook) && (alert.meta?.playbook as string[]).length > 0
      ? (alert.meta?.playbook as string[])
      : PLAYBOOK_FALLBACK[alert.attack_type]) ?? PLAYBOOK_FALLBACK.Other;

  const modelMeta = (alert.meta?.model as Record<string, unknown>) || {};
  const probabilities = Object.entries((modelMeta as { probabilities?: Record<string, number> }).probabilities ?? {})
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 5);
  const zeekConn = (alert.meta?.zeek_conn as Record<string, string>) || null;

  const jsonString = useMemo(() => JSON.stringify(alert, null, 2), [alert]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-3 py-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-full overflow-y-auto shadow-2xl border border-slate-700"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Alerta</p>
            <h2 className="text-xl font-bold text-white">
              {TITLE_MAP[alert.attack_type] || alert.attack_type}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {formatFullLocal(alert.timestamp)} ({formatUtcTimestamp(alert.timestamp)})
            </p>
          </div>
          <SeverityBadge value={alert.severity} />
        </div>

        <div className="p-5 space-y-5 text-sm text-gray-200">
          <section>
            <h3 className="font-semibold text-white mb-2">Resumen del incidente</h3>
            <p className="text-gray-300 leading-relaxed">{summary}</p>
          </section>

          <section>
            <h3 className="font-semibold text-white mb-2">Qué hacer ahora</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-200">
              {actions.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold text-white">Detalles técnicos</h3>
            <div className="grid grid-cols-1 gap-2 text-xs text-gray-300 font-mono">
              <p>
                <span className="text-gray-400">IP Origen:</span> {alert.src_ip}:{alert.src_port}
              </p>
              <p>
                <span className="text-gray-400">IP Destino:</span> {alert.dst_ip}:{alert.dst_port}
              </p>
              <p>
                <span className="text-gray-400">Protocolo:</span> {alert.protocol}
              </p>
              <p>
                <span className="text-gray-400">Regla:</span> {alert.rule_id} — {alert.rule_name}
              </p>
              <p>
                <span className="text-gray-400">Hora local:</span> {formatLocalTimestamp(alert.timestamp)}
              </p>
              <p>
                <span className="text-gray-400">Hora UTC:</span> {formatUtcTimestamp(alert.timestamp)}
              </p>
              <p>
                <span className="text-gray-400">{getConfidenceLabel(alert.model_label)}:</span>{" "}
                {formatPercent(getDisplayConfidence(alert.model_score, alert.model_label))}
              </p>
              <p>
                <span className="text-gray-400">Riesgo de ataque:</span>{" "}
                {formatPercent(getRiskScore(alert.model_score))}
              </p>
            </div>
          </section>

          <section className="space-y-2 text-xs text-gray-200">
            <h3 className="font-semibold text-white">Modelo CICIDS</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-[28px] font-bold text-sky-300">
                {formatPercent(getDisplayConfidence(alert.model_score, alert.model_label))}
              </span>
              <span className="uppercase tracking-wide text-gray-400">{getConfidenceLabel(alert.model_label)}</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Riesgo de ataque: {formatPercent(getRiskScore(alert.model_score))} · Confianza en benigno:{" "}
              {formatPercent(getBenignConfidence(alert.model_score))}
            </p>
            {probabilities.length > 0 && (
              <div className="space-y-1">
                {probabilities.map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="font-mono text-sky-200">{(Number(value) * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {zeekConn && (
            <section className="space-y-1 text-xs text-gray-200">
              <h3 className="font-semibold text-white">Campos Zeek</h3>
              {[
                ["Timestamp", zeekConn.ts],
                ["UID", zeekConn.uid],
                ["Proto", zeekConn.proto],
                ["Servicio", zeekConn.service],
                ["Estado", zeekConn.conn_state],
                ["Bytes origen", zeekConn.orig_bytes],
                ["Bytes destino", zeekConn.resp_bytes],
                ["Packets origen", zeekConn.orig_pkts],
                ["Packets destino", zeekConn.resp_pkts],
              ].map(
                ([label, value]) =>
                  value && (
                    <p key={label}>
                      <span className="text-gray-400">{label}:</span> <span className="font-mono">{value}</span>
                    </p>
                  ),
              )}
            </section>
          )}

          <section>
            <button
              type="button"
              className="text-sky-400 underline text-sm"
              onClick={() => setShowJson((prev) => !prev)}
            >
              {showJson ? "Ocultar JSON crudo" : "Ver JSON crudo"}
            </button>
            {showJson && (
              <pre className="mt-3 bg-black/50 text-[11px] text-emerald-200 p-3 rounded-lg border border-slate-800 overflow-auto max-h-48">
                {jsonString}
              </pre>
            )}
          </section>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertDetailModal;
