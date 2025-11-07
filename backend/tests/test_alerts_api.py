import os
from contextlib import contextmanager
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlmodel import SQLModel, Session, create_engine

os.environ["INGESTION_MODE"] = "TEST_DISABLED"

from app.db import get_session
from app.main import app

DATABASE_URL = "sqlite://"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SQLModel.metadata.create_all(engine)


def override_get_session():
    with Session(engine) as session:
        yield session


app.dependency_overrides[get_session] = override_get_session

client = TestClient(app)


def sample_alert_payload(**kwargs):
    base = {
        "timestamp": datetime.utcnow().isoformat(),
        "severity": "High",
        "attack_type": "DoS",
        "src_ip": "10.0.0.10",
        "src_port": 4444,
        "dst_ip": "192.168.0.2",
        "dst_port": 80,
        "protocol": "TCP",
        "rule_id": "RULE-1001",
        "rule_name": "Test Rule",
        "model_score": 0.82,
        "model_label": "malicious",
        "meta": {"dataset_label": "DoS Hulk"},
    }
    base.update(kwargs)
    return base


def test_post_alert_creates_entry():
    response = client.post("/alerts", json=sample_alert_payload())
    assert response.status_code == 201
    data = response.json()
    assert data["rule_id"] == "RULE-1001"


def test_get_alerts_with_filters():
    payload = sample_alert_payload(rule_id="RULE-2001", attack_type="PortScan", severity="Medium")
    client.post("/alerts", json=payload)
    resp = client.get("/alerts", params={"attack_type": "PortScan", "severity": "Medium"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert any(item["attack_type"] == "PortScan" for item in body["items"])


def test_metrics_overview_structure():
    resp = client.get("/metrics/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "counts_by_severity" in data
    assert "last24h_series" in data


@pytest.mark.anyio
async def test_stream_emits_event_on_new_alert():
    async with AsyncClient(app=app, base_url="http://test") as async_client:
        async with async_client.stream("GET", "/stream") as response:
            await async_client.post("/alerts", json=sample_alert_payload(rule_id="STREAM-1"))
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    assert "STREAM-1" in line
                    break
