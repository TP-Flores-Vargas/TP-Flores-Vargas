import type { Severity } from "../api/alerts";

const severityLabels: Record<Severity, string> = {
  Low: "Baja",
  Medium: "Media",
  High: "Alta",
  Critical: "Crítica",
};

export const translateSeverity = (value: Severity) =>
  severityLabels[value] ?? value;

export const severityOptions = [
  { value: "Low", label: severityLabels.Low },
  { value: "Medium", label: severityLabels.Medium },
  { value: "High", label: severityLabels.High },
  { value: "Critical", label: severityLabels.Critical },
];

