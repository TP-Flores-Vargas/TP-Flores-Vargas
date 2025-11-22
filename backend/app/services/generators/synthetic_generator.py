from __future__ import annotations

import asyncio
import ipaddress
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

from ...models import AttackTypeEnum, ModelLabelEnum, ProtocolEnum, SeverityEnum
from ...schemas import AlertCreate
from ..alerts_service import AlertsService

CICIDS_COUNTS = {
    "BENIGN": 2_359_087,
    "DoS Hulk": 231_072,
    "PortScan": 158_930,
    "DDoS": 41_835,
    "DoS GoldenEye": 10_293,
    "FTP-Patator": 7_938,
    "SSH-Patator": 5_897,
    "DoS slowloris": 5_796,
    "DoS Slowhttptest": 5_499,
    "Bot": 1_966,
}

LABEL_TO_ATTACK_TYPE = {
    "BENIGN": AttackTypeEnum.benign,
    "DoS Hulk": AttackTypeEnum.dos,
    "PortScan": AttackTypeEnum.portscan,
    "DDoS": AttackTypeEnum.ddos,
    "DoS GoldenEye": AttackTypeEnum.dos,
    "FTP-Patator": AttackTypeEnum.bruteforce,
    "SSH-Patator": AttackTypeEnum.bruteforce,
    "DoS slowloris": AttackTypeEnum.dos,
    "DoS Slowhttptest": AttackTypeEnum.dos,
    "Bot": AttackTypeEnum.bot,
    "Web Attack – Brute Force": AttackTypeEnum.bruteforce,
    "Web Attack – XSS": AttackTypeEnum.dos,
    "Infiltration": AttackTypeEnum.dos,
    "Web Attack – Sql Injection": AttackTypeEnum.dos,
    "Heartbleed": AttackTypeEnum.dos,
}

ATTACK_SUMMARY = {
    AttackTypeEnum.ddos: "Se detectó un pico de tráfico distribuido dirigido al servicio público.",
    AttackTypeEnum.dos: "Se observó un patrón de solicitudes repetitivas que impactan la disponibilidad.",
    AttackTypeEnum.portscan: "El origen está enumerando puertos abiertos en los segmentos protegidos.",
    AttackTypeEnum.bruteforce: "Intentos masivos de autenticación fueron detectados contra servicios críticos.",
    AttackTypeEnum.bot: "Actividad compatible con malware tipo bot se detectó comunicándose con C2.",
    AttackTypeEnum.benign: "Tráfico clasificado como benigno por el modelo actual.",
}

PLAYBOOKS = {
    AttackTypeEnum.ddos: [
        "Habilitar mitigación DDoS en el borde y ajustar políticas de rate limiting.",
        "Coordinar con el ISP para filtrar tráfico proveniente del origen sospechoso.",
        "Monitorizar métricas de disponibilidad del servicio afectado cada 5 minutos.",
    ],
    AttackTypeEnum.dos: [
        "Implementar filtros temporales para el origen identificado.",
        "Validar la salud del servicio y reiniciarlo si es necesario.",
        "Escalar al equipo de redes si el patrón persiste.",
    ],
    AttackTypeEnum.portscan: [
        "Bloquear la IP fuente en el firewall perimetral.",
        "Revisar registros de IPS en busca de explotación posterior.",
        "Notificar al SOC para seguimiento del origen.",
    ],
    AttackTypeEnum.bruteforce: [
        "Habilitar MFA en las cuentas objetivo si aún no está activo.",
        "Bloquear temporalmente la IP origen.",
        "Obligar cambio de contraseñas afectadas y auditar accesos.",
    ],
    AttackTypeEnum.bot: [
        "Desconectar el host comprometido y ejecutar análisis antimalware.",
        "Revocar credenciales utilizadas desde el activo identificado.",
        "Supervisar tráfico de salida hacia dominios C2 conocidos.",
    ],
}

PROTOCOL_BY_ATTACK = {
    AttackTypeEnum.dos: [ProtocolEnum.tcp, ProtocolEnum.udp, ProtocolEnum.http],
    AttackTypeEnum.ddos: [ProtocolEnum.tcp, ProtocolEnum.udp, ProtocolEnum.http],
    AttackTypeEnum.portscan: [ProtocolEnum.tcp, ProtocolEnum.udp],
    AttackTypeEnum.bruteforce: [ProtocolEnum.tcp, ProtocolEnum.http, ProtocolEnum.https],
    AttackTypeEnum.bot: [ProtocolEnum.tcp, ProtocolEnum.https],
    AttackTypeEnum.benign: [ProtocolEnum.http, ProtocolEnum.https, ProtocolEnum.dns, ProtocolEnum.tcp],
}

DEFAULT_PROTOCOLS = [
    ProtocolEnum.tcp,
    ProtocolEnum.udp,
    ProtocolEnum.icmp,
    ProtocolEnum.http,
    ProtocolEnum.https,
    ProtocolEnum.dns,
]

SEVERITY_WEIGHT = {
    SeverityEnum.low: 0,
    SeverityEnum.medium: 1,
    SeverityEnum.high: 2,
    SeverityEnum.critical: 3,
}

SEVERITY_POLICY = {
    AttackTypeEnum.benign: SeverityEnum.low,
    AttackTypeEnum.dos: SeverityEnum.medium,
    AttackTypeEnum.ddos: SeverityEnum.critical,
    AttackTypeEnum.bot: SeverityEnum.critical,
    AttackTypeEnum.bruteforce: SeverityEnum.high,
    AttackTypeEnum.portscan: SeverityEnum.medium,
}

SEVERITY_FLOOR = {
    AttackTypeEnum.benign: SeverityEnum.low,
    AttackTypeEnum.portscan: SeverityEnum.medium,
    AttackTypeEnum.dos: SeverityEnum.medium,
    AttackTypeEnum.ddos: SeverityEnum.critical,
    AttackTypeEnum.bruteforce: SeverityEnum.high,
    AttackTypeEnum.bot: SeverityEnum.critical,
}


class SyntheticAlertGenerator:
    def __init__(self, seed: int = 42):
        self.random = random.Random(seed)
        self.seed = seed
        self.weights, self.labels = self._build_weights()

    def _build_weights(self) -> Tuple[List[float], List[str]]:
        total = sum(CICIDS_COUNTS.values())
        labels = list(CICIDS_COUNTS.keys())
        weights = [count / total for count in CICIDS_COUNTS.values()]
        return weights, labels

    def _random_ip(self) -> str:
        return str(ipaddress.IPv4Address(self.random.randint(0x0A000000, 0x0AFFFFFF)))

    def _map_severity(self, score: float, attack_type: AttackTypeEnum) -> SeverityEnum:
        policy = SEVERITY_POLICY.get(attack_type)
        if policy:
            return policy
        if score >= 0.9:
            return SeverityEnum.critical
        if score >= 0.6:
            return SeverityEnum.high
        if score >= 0.3:
            return SeverityEnum.medium
        return SeverityEnum.low

    def _enforce_severity_floor(
        self, attack_type: AttackTypeEnum, severity: SeverityEnum
    ) -> SeverityEnum:
        floor = SEVERITY_FLOOR.get(attack_type)
        if not floor:
            return severity
        if SEVERITY_WEIGHT[severity] < SEVERITY_WEIGHT[floor]:
            return floor
        return severity

    def _model_score(self, severity: SeverityEnum) -> float:
        mu_sigma = {
            SeverityEnum.low: (0.2, 0.12),
            SeverityEnum.medium: (0.5, 0.12),
            SeverityEnum.high: (0.8, 0.12),
            SeverityEnum.critical: (0.95, 0.07),
        }
        mu, sigma = mu_sigma[severity]
        score = self.random.gauss(mu, sigma)
        return max(0.01, min(score, 0.999))

    def _select_protocol(self, attack_type: AttackTypeEnum) -> ProtocolEnum:
        return self.random.choice(PROTOCOL_BY_ATTACK.get(attack_type, DEFAULT_PROTOCOLS))

    def _port_for_attack(self, attack_type: AttackTypeEnum) -> int:
        mapping = {
            AttackTypeEnum.bruteforce: self.random.choice([21, 22, 3389, 5900]),
            AttackTypeEnum.portscan: self.random.randint(1, 1024),
            AttackTypeEnum.ddos: self.random.choice([80, 443, 53]),
            AttackTypeEnum.dos: self.random.choice([80, 443, 22]),
        }
        return mapping.get(attack_type, self.random.randint(1024, 65535))

    def _rule_for_attack(self, attack_type: AttackTypeEnum) -> Tuple[str, str]:
        name = f"{attack_type.value} Detection"
        return f"RULE-{self.random.randint(1000, 9999)}", name

    def _model_label(self, score: float, dataset_label: str) -> ModelLabelEnum:
        malicious = dataset_label != "BENIGN" and score >= 0.5
        return ModelLabelEnum.malicious if malicious else ModelLabelEnum.benign

    def generate_alert(self) -> AlertCreate:
        dataset_label = self.random.choices(self.labels, weights=self.weights, k=1)[0]
        attack_type = LABEL_TO_ATTACK_TYPE.get(dataset_label, AttackTypeEnum.dos)
        src_ip = self._random_ip()
        dst_ip = self._random_ip()
        protocol = self._select_protocol(attack_type)
        dst_port = self._port_for_attack(attack_type)
        rule_id, rule_name = self._rule_for_attack(attack_type)
        raw_score = self.random.random()
        severity = self._map_severity(raw_score, attack_type)
        severity = self._enforce_severity_floor(attack_type, severity)
        score = self._model_score(severity)
        model_label = self._model_label(score, dataset_label)
        timestamp = datetime.utcnow() - timedelta(minutes=self.random.randint(0, 120))
        meta = {
            "dataset_label": dataset_label,
            "summary": ATTACK_SUMMARY.get(attack_type, ATTACK_SUMMARY[AttackTypeEnum.dos]),
            "playbook": PLAYBOOKS.get(attack_type, []),
            "generator_seed": self.seed,
        }
        return AlertCreate(
            timestamp=timestamp,
            severity=severity,
            attack_type=attack_type,
            src_ip=src_ip,
            src_port=self.random.randint(1024, 65535),
            dst_ip=dst_ip,
            dst_port=dst_port,
            protocol=protocol,
            rule_id=rule_id,
            rule_name=rule_name,
            model_score=score,
            model_label=model_label,
            meta=meta,
        )

    def seed_initial(self, service: AlertsService, count: int) -> None:
        for _ in range(count):
            service.create_alert(self.generate_alert(), source="synthetic_seed")

    async def start_live_emit(self, service: AlertsService, rate_per_min: int, stop_event: asyncio.Event):
        interval = 60 / max(1, rate_per_min)
        while not stop_event.is_set():
            service.create_alert(self.generate_alert(), source="synthetic_live")
            await asyncio.sleep(interval)
