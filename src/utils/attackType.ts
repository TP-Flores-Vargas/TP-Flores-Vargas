import type { AttackType } from "../api/alerts";

const ATTACK_LABELS: Record<AttackType, string> = {
  BENIGN: "Benigno",
  BOT: "Bot",
  BRUTE_FORCE: "Fuerza bruta",
  DDOS: "DDoS",
  DOS: "DoS",
  PORTSCAN: "Escaneo de puertos",
};

export const translateAttackType = (value: AttackType | string): string =>
  ATTACK_LABELS[value as AttackType] ?? value.replace(/_/g, " ");
