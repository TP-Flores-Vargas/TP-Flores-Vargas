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
    "Web Attack – Brute Force": 1_507,
    "Web Attack – XSS": 652,
    "Infiltration": 36,
    "Web Attack – Sql Injection": 21,
    "Heartbleed": 11,
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
    "Web Attack – XSS": AttackTypeEnum.xss,
    "Infiltration": AttackTypeEnum.infiltration,
    "Web Attack – Sql Injection": AttackTypeEnum.sqli,
    "Heartbleed": AttackTypeEnum.other,
}

ATTACK_SUMMARY = {
    AttackTypeEnum.ddos: "Se detectó un pico de tráfico distribuido dirigido al servicio público.",
    AttackTypeEnum.dos: "Se observó un patrón de solicitudes repetitivas que impactan la disponibilidad.",
    AttackTypeEnum.portscan: "El origen está enumerando puertos abiertos en los segmentos protegidos.",
    AttackTypeEnum.bruteforce: "Intentos masivos de autenticación fueron detectados contra servicios críticos.",
    AttackTypeEnum.xss: "Se intentó inyectar scripts maliciosos en una aplicación web.",
    AttackTypeEnum.sqli: "Consultas sospechosas indican un intento de inyección SQL.",
    AttackTypeEnum.bot: "Actividad compatible con malware tipo bot se detectó comunicándose con C2.",
    AttackTypeEnum.infiltration: "Se identificó movimiento lateral y extracción de datos.",
    AttackTypeEnum.benign: "Tráfico clasificado como benigno por el modelo actual.",
    AttackTypeEnum.other: "Actividad fuera de catálogo, revise el flujo completo.",
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
    AttackTypeEnum.xss: [
        "Aplicar reglas en el WAF para bloquear payloads detectados.",
        "Ejecutar análisis estático de la aplicación para validar sanitización.",
        "Revisar logs de usuarios para descartar robo de sesión.",
    ],
    AttackTypeEnum.sqli: [
        "Bloquear consultas con patrones similares en el WAF.",
        "Ejecutar escaneo de seguridad en la aplicación afectada.",
        "Validar integridad de la base de datos y activar respaldos.",
    ],
    AttackTypeEnum.infiltration: [
        "Aislar completamente el host comprometido.",
        "Recolectar artefactos forenses para DFIR.",
        "Notificar a seguridad corporativa para contención.",
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
    AttackTypeEnum.xss: [ProtocolEnum.http, ProtocolEnum.https],
    AttackTypeEnum.sqli: [ProtocolEnum.http, ProtocolEnum.https],
    AttackTypeEnum.bot: [ProtocolEnum.tcp, ProtocolEnum.https],
    AttackTypeEnum.infiltration: [ProtocolEnum.https, ProtocolEnum.tcp],
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
        if score >= 0.9 or attack_type in (AttackTypeEnum.infiltration, AttackTypeEnum.other):
            return SeverityEnum.critical
        if score >= 0.75 or attack_type in (
            AttackTypeEnum.dos,
            AttackTypeEnum.ddos,
            AttackTypeEnum.bruteforce,
            AttackTypeEnum.bot,
            AttackTypeEnum.xss,
            AttackTypeEnum.sqli,
        ):
            return SeverityEnum.high
        if score >= 0.4:
            return SeverityEnum.medium
        return SeverityEnum.low

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
            AttackTypeEnum.xss: self.random.choice([80, 443, 8080]),
            AttackTypeEnum.sqli: self.random.choice([1433, 3306, 5432, 1521]),
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
        attack_type = LABEL_TO_ATTACK_TYPE.get(dataset_label, AttackTypeEnum.other)
        src_ip = self._random_ip()
        dst_ip = self._random_ip()
        protocol = self._select_protocol(attack_type)
        dst_port = self._port_for_attack(attack_type)
        rule_id, rule_name = self._rule_for_attack(attack_type)
        raw_score = self.random.random()
        severity = self._map_severity(raw_score, attack_type)
        score = self._model_score(severity)
        model_label = self._model_label(score, dataset_label)
        timestamp = datetime.utcnow() - timedelta(minutes=self.random.randint(0, 120))
        meta = {
            "dataset_label": dataset_label,
            "summary": ATTACK_SUMMARY.get(attack_type, ATTACK_SUMMARY[AttackTypeEnum.other]),
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
