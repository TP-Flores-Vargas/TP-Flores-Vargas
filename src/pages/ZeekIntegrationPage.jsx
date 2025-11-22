import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";

import { HelpCircleIcon } from "../assets/icons/index.jsx";
import Card from "../components/common/Card.jsx";
import {
  executeKaliCommand,
  fetchDatasetPreview,
  fetchSyntheticStatus,
  forceSyncZeek,
  simulateZeekAlert,
  toggleSyntheticSource,
  uploadZeekDataset,
} from "../api/zeekLab";
import { zeekLabHelp } from "../content/contextualHelp";
import { formatPercent, getConfidenceLabel, getDisplayConfidence } from "../utils/modelConfidence";
import { translateSeverity } from "../utils/severity";
import { InfoTooltip } from "../components/InfoTooltip";

const ATTACK_TYPE_OPTIONS = [
  { value: "", label: "Cualquier tipo (según modelo)" },
  { value: "BENIGN", label: "Benigno" },
  { value: "BOT", label: "Bot" },
  { value: "BRUTE_FORCE", label: "Fuerza bruta" },
  { value: "DDOS", label: "DDOS" },
  { value: "DOS", label: "DOS" },
  { value: "PORTSCAN", label: "Escaneo de puertos" },
];

const renderPreviewTable = (columns = [], rows = []) => {
  if (!columns.length || !rows.length) {
    return <p className="text-sm text-gray-400">No hay vista previa disponible.</p>;
  }
  return (
    <div className="mt-3 overflow-auto border border-gray-800 rounded-lg">
      <table className="min-w-full text-sm text-gray-200">
        <thead className="bg-gray-800 text-xs uppercase text-gray-400">
          <tr>
            {columns.map((col) => (
              <th key={col} className="px-3 py-2 text-left whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row.uid ?? row.ts ?? rowIndex}`} className="odd:bg-gray-900/60">
              {columns.map((col) => (
                <td key={`${rowIndex}-${col}`} className="px-3 py-2 whitespace-nowrap">
                  {row[col] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ZeekIntegrationPage = () => {
  const fileInputRef = useRef(null);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [datasetError, setDatasetError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [simulationType, setSimulationType] = useState("");
  const [simulationCount, setSimulationCount] = useState(1);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState("");
  const [command, setCommand] = useState("sudo zeekctl status");
  const [commandLoading, setCommandLoading] = useState(false);
  const [commandOutput, setCommandOutput] = useState(null);
  const [commandError, setCommandError] = useState("");
  const [syntheticStatus, setSyntheticStatus] = useState(null);
  const [syntheticRate, setSyntheticRate] = useState(5);
  const [syntheticLoading, setSyntheticLoading] = useState(false);
  const [syntheticError, setSyntheticError] = useState("");
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const loadSyntheticStatus = async () => {
    try {
      const data = await fetchSyntheticStatus();
      setSyntheticStatus(data);
      if (data.rate_per_min) {
        setSyntheticRate(data.rate_per_min);
      }
      setSyntheticError("");
    } catch (error) {
      console.error("fetchSyntheticStatus failed", error);
      setSyntheticStatus(null);
      setSyntheticError(error?.response?.data?.detail ?? "No se pudo obtener el estado del generador.");
    }
  };

  useEffect(() => {
    loadSyntheticStatus();
  }, []);

  const triggerFileDialog = () => {
    setDatasetError("");
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setDatasetError("");
    try {
      const data = await uploadZeekDataset(file);
      setDatasetInfo({ ...data, filename: file.name, source: "uploaded" });
    } catch (error) {
      console.error("uploadZeekDataset failed", error);
      setDatasetInfo(null);
      setDatasetError(error?.response?.data?.detail ?? "No se pudo subir el CSV.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleUseSynced = async () => {
    setUploading(true);
    setDatasetError("");
    try {
      const data = await fetchDatasetPreview({ useDefault: true });
      setDatasetInfo({ ...data, filename: "Dataset sincronizado" });
    } catch (error) {
      console.error("fetchDatasetPreview failed", error);
      setDatasetInfo(null);
      setDatasetError(error?.response?.data?.detail ?? "No se pudo cargar el dataset por defecto.");
    } finally {
      setUploading(false);
    }
  };

  const handleUseReference = async () => {
    setUploading(true);
    setDatasetError("");
    try {
      const data = await fetchDatasetPreview({ datasetId: "__reference__" });
      setDatasetInfo({ ...data, source: "reference", filename: "Dataset de referencia" });
    } catch (error) {
      console.error("fetchDatasetPreview reference failed", error);
      setDatasetInfo(null);
      setDatasetError(error?.response?.data?.detail ?? "No se pudo cargar el dataset de referencia.");
    } finally {
      setUploading(false);
    }
  };

  const handleForceSync = async () => {
    setSyncLoading(true);
    setSyncMessage("");
    try {
      const result = await forceSyncZeek();
      setSyncMessage(
        result.stdout?.trim()
          ? `Sync OK (código ${result.exit_code}). ${result.stdout.trim().split("\n").pop()}`
          : `Sync OK (código ${result.exit_code}).`,
      );
      setLastSyncAt(new Date());
      const data = await fetchDatasetPreview({ useDefault: true });
      setDatasetInfo({ ...data, filename: "Dataset sincronizado" });
    } catch (error) {
      console.error("forceSyncZeek failed", error);
      const detail =
        error?.response?.data?.detail?.stderr ||
        error?.response?.data?.detail ||
        "No se pudo sincronizar.";
      setSyncMessage(`Error: ${detail}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!datasetInfo) {
      setSimulationError("Selecciona o carga un dataset para generar alertas.");
      return;
    }
    setSimulationError("");
    setSimulateLoading(true);
    try {
      const payload = {
        attack_type: simulationType || undefined,
        count: simulationCount,
        dataset_id: datasetInfo.source === "uploaded" ? datasetInfo.dataset_id : undefined,
        use_default: datasetInfo.source === "default",
      };
      const data = await simulateZeekAlert(payload);
      setSimulationResult(data);
    } catch (error) {
      console.error("simulateZeekAlert failed", error);
      setSimulationResult(null);
      setSimulationError(error?.response?.data?.detail ?? "No se pudieron generar alertas.");
    } finally {
      setSimulateLoading(false);
    }
  };

  const handleExecuteCommand = async () => {
    if (!command.trim()) {
      setCommandError("Ingresa un comando antes de ejecutar.");
      return;
    }
    setCommandError("");
    setCommandLoading(true);
    try {
      const output = await executeKaliCommand(command);
      setCommandOutput(output);
    } catch (error) {
      console.error("executeKaliCommand failed", error);
      setCommandOutput(null);
      setCommandError(error?.response?.data?.detail ?? "No se pudo ejecutar el comando.");
    } finally {
      setCommandLoading(false);
    }
  };

  const handleSyntheticToggle = async (enable) => {
    setSyntheticLoading(true);
    setSyntheticError("");
    try {
      const data = await toggleSyntheticSource({
        enable,
        rate_per_min: enable ? syntheticRate : undefined,
      });
      setSyntheticStatus(data);
      if (data.rate_per_min) {
        setSyntheticRate(data.rate_per_min);
      }
    } catch (error) {
      console.error("toggleSyntheticSource failed", error);
      setSyntheticError(error?.response?.data?.detail ?? "No se pudo actualizar el generador.");
    } finally {
      setSyntheticLoading(false);
    }
  };

  const handleRefreshSynthetic = () => {
    loadSyntheticStatus();
  };

  return (
    <div className="p-8 space-y-8 text-gray-100">
      <div>
        <h1 className="text-3xl font-bold">Pruebas / Integración Zeek</h1>
        <p className="text-sm text-gray-400">
          Laboratorio para validar datasets de Zeek, generar alertas usando el modelo CICIDS y preparar la
          conexión con la sonda en Kali Linux.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Generador de datos sintéticos</h2>
            <p className="text-sm text-gray-400">
              Mantén vivo el flujo de alertas mock basado en el generador interno. Puedes activarlo o detenerlo sin
              reiniciar el backend.
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <HelpCircleIcon className="w-4 h-4 text-gray-500 mt-0.5" aria-hidden />
            <p>{zeekLabHelp.syntheticGenerator}</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-2 text-sm">
              Rate (alertas/min)
              <input
                type="number"
                min={1}
                max={120}
                value={syntheticRate}
                onChange={(event) => setSyntheticRate(Number(event.target.value) || 1)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSyntheticToggle(true)}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
                disabled={syntheticLoading || syntheticStatus?.enabled}
              >
                {syntheticLoading && syntheticStatus?.enabled === false ? "Activando…" : "Activar"}
              </button>
              <button
                type="button"
                onClick={() => handleSyntheticToggle(false)}
                className="px-4 py-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-sm font-semibold"
                disabled={syntheticLoading || !syntheticStatus?.enabled}
              >
                {syntheticLoading && syntheticStatus?.enabled ? "Deteniendo…" : "Detener"}
              </button>
              <button
                type="button"
                onClick={handleRefreshSynthetic}
                className="px-4 py-2 rounded-lg border border-gray-600 text-sm"
                disabled={syntheticLoading}
              >
                Actualizar estado
              </button>
            </div>
          </div>
          {syntheticStatus ? (
            <p className="text-sm text-gray-300">
              Estado actual: <span className={syntheticStatus.enabled ? "text-green-400" : "text-red-400"}>{syntheticStatus.enabled ? "Activo" : "Detenido"}</span>
              {" "}· rate {syntheticStatus.rate_per_min} alertas/min · modo base {syntheticStatus.ingestion_mode}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Consultando estado del generador…</p>
          )}
          {syntheticError && <p className="text-sm text-red-400">{syntheticError}</p>}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Datasets disponibles</h2>
              <p className="text-sm text-gray-400">
                El dataset activo alimenta la simulación de alertas y las pruebas de carga.
              </p>
            </div>
            <InfoTooltip content="Sube tu CSV con formato conn.log o reutiliza los datasets incluidos. La simulación tomará los registros desde aquí.">
              <HelpCircleIcon className="w-4 h-4 text-gray-500" />
            </InfoTooltip>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={triggerFileDialog}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
              disabled={uploading}
            >
              {uploading ? "Procesando…" : "Subir CSV personalizado"}
            </button>
            <button
              type="button"
              onClick={handleUseReference}
              className="px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-400 text-sm"
              disabled={uploading}
            >
              Dataset de referencia
            </button>
            <button
              type="button"
              onClick={handleUseSynced}
              className="px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-400 text-sm"
              disabled={uploading}
            >
              Dataset sincronizado (Zeek)
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileChange}
            />
          </div>
          <p className="text-xs text-gray-400">{zeekLabHelp.datasetSelector}</p>
          {datasetError && <p className="text-sm text-red-400">{datasetError}</p>}
          {datasetInfo ? (
            <div>
              <p className="text-sm text-gray-300">
                Dataset activo: <span className="font-semibold">{datasetInfo.filename ?? datasetInfo.source}</span>
              </p>
              <p className="text-xs text-gray-400">
                Columnas ({datasetInfo.columns.length}): {datasetInfo.columns.join(", ")}
              </p>
              {renderPreviewTable(datasetInfo.columns, datasetInfo.preview)}
              <p className="text-xs text-sky-300 mt-2">
                Usa la sección “Simulación de alertas” para generar eventos a partir de este dataset.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No hay dataset seleccionado.</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Simulación de alertas</h2>
            <p className="text-sm text-gray-400">
              Genera alertas de prueba usando el dataset activo. Puedes forzar un tipo de ataque o dejar que el modelo decida.
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <InfoTooltip content={zeekLabHelp.simulation}>
              <HelpCircleIcon className="w-4 h-4 text-gray-500 mt-0.5 cursor-pointer" />
            </InfoTooltip>
            <p>{datasetInfo ? `Dataset en uso: ${datasetInfo.filename ?? datasetInfo.source}` : "Selecciona un dataset en la sección superior antes de simular."}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm">
              Tipo de alerta
              <InfoTooltip content="Si no eliges un tipo, simularemos registros en orden desde el dataset activo.">
                <HelpCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer" />
              </InfoTooltip>
              <select
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2"
                value={simulationType}
                onChange={(event) => setSimulationType(event.target.value)}
              >
                {ATTACK_TYPE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Cantidad
              <InfoTooltip content="Número de alertas a generar en esta ejecución (máximo 10 de golpe).">
                <HelpCircleIcon className="w-4 h-4 text-gray-500 cursor-pointer" />
              </InfoTooltip>
              <input
                type="number"
                min={1}
                max={10}
                value={simulationCount}
                onChange={(event) => setSimulationCount(Number(event.target.value) || 1)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSimulate}
                className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={simulateLoading || !datasetInfo}
              >
                {simulateLoading ? "Generando…" : datasetInfo ? "Simular alerta" : "Generar alerta"}
              </button>
            </div>
          </div>
          {simulationError && <p className="text-sm text-red-400">{simulationError}</p>}
          {simulationResult && (
            <div className="space-y-2">
              <p className="text-sm text-gray-300">
                Se crearon {simulationResult.ingested} alerta(s) · modo {simulationResult.used_default ? "dataset por defecto" : "dataset cargado"}
              </p>
              <div className="space-y-2">
                {simulationResult.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border border-gray-800 rounded-lg px-4 py-3 text-sm bg-black/30"
                  >
                    <p className="font-semibold text-white">
                      {alert.attack_type} · {translateSeverity(alert.severity)} ·{" "}
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {alert.src_ip}:{alert.src_port} → {alert.dst_ip}:{alert.dst_port} ·{" "}
                      {formatPercent(getDisplayConfidence(alert.model_score ?? 0, alert.model_label ?? "benign"))}{" "}
                      {getConfidenceLabel(alert.model_label ?? "benign")} · regla {alert.rule_name ?? "N/A"}
                    </p>
                    {alert?.meta?.model?.probabilities && (
                      <div className="mt-2 text-xs text-gray-300 space-y-1">
                        <p className="text-gray-400">Probabilidades por clase:</p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                          {Object.entries(alert.meta.model.probabilities).map(([label, prob]) => (
                            <div
                              key={`${alert.id}-${label}`}
                              className="px-2 py-1 rounded bg-gray-900/40 border border-gray-800"
                            >
                              <span className="font-semibold">{label}:</span>{" "}
                              <span>{formatPercent(prob)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold">Comandos para Kali Linux</h2>
            <p className="text-sm text-gray-400">
              Se ejecutan vía SSH cuando las credenciales están configuradas. En desarrollo se usa un fallback local.
            </p>
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <HelpCircleIcon className="w-4 h-4 text-gray-500 mt-0.5" aria-hidden />
            <p>{zeekLabHelp.commands}</p>
          </div>
          <textarea
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm min-h-[120px]"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
          />
          {commandError && <p className="text-sm text-red-400">{commandError}</p>}
          <button
            type="button"
            onClick={handleExecuteCommand}
            className="self-start px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold"
            disabled={commandLoading}
          >
            {commandLoading ? "Ejecutando…" : "Ejecutar en Kali"}
          </button>
          {commandOutput && (
            <div className="text-xs text-gray-200">
              <p className="mb-1">
                Salida (modo {commandOutput.mode} · código {commandOutput.exit_code})
              </p>
              <pre className="bg-black/60 rounded-lg p-3 whitespace-pre-wrap text-gray-100">
{commandOutput.stdout || "(sin salida)"}
              </pre>
              {commandOutput.stderr && (
                <pre className="bg-black/40 rounded-lg p-3 whitespace-pre-wrap text-red-300 mt-2">
{commandOutput.stderr}
                </pre>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-semibold">Integración en tiempo real con Zeek</h2>
            <p className="text-sm text-gray-400">
              El cron ejecuta <code className="font-mono text-xs">sync_zeek_and_simulate.sh</code> cada minuto y alimenta el
              dataset sincronizado. Usa este panel para forzar una sincronización manual cuando lo necesites.
            </p>
          </div>
          <div className="text-sm text-gray-300">
            Último sync manual: {lastSyncAt ? dayjs(lastSyncAt).format("YYYY-MM-DD HH:mm:ss") : "(sin forzar aún)"}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleForceSync}
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-semibold"
              disabled={syncLoading}
            >
              {syncLoading ? "Sincronizando…" : "Forzar sincronización"}
            </button>
            {syncMessage && (
              <span className={`text-sm ${syncMessage.startsWith("Error") ? "text-red-400" : "text-emerald-400"}`}>
                {syncMessage}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ZeekIntegrationPage;
