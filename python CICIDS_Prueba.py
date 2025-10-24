"""Entrenamiento rápido de modelos para el dataset CICIDS2017.

Permite indicar la ruta a los CSV mediante ``--data-dir`` y ofrece mensajes
claros cuando los archivos aún no están disponibles.
"""

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# =============================
# 1) Definir rutas
# =============================
FILES = [
    "Monday-WorkingHours.pcap_ISCX.csv",
    "Tuesday-WorkingHours.pcap_ISCX.csv",
    "Wednesday-workingHours.pcap_ISCX.csv",
    "Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv",
    "Thursday-WorkingHours-Afternoon-Infilteration.pcap_ISCX.csv",
    "Friday-WorkingHours-Morning.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv",
    "Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv",
]

# =============================
# 2) Buscar datasets y convertir CSV → Parquet (si no existe)
# =============================
SCRIPT_DIR = Path(__file__).resolve().parent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Entrena RandomForest y Regresión Logística sobre CICIDS2017",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        help="Carpeta donde se encuentran los CSV originales del dataset",
    )
    return parser.parse_args()


def find_datasets(base_dir: Path | None) -> Path:
    """Devuelve la carpeta que contiene todos los CSV requeridos.

    Se prueban distintas rutas por comodidad del usuario:
    1. La ruta indicada por ``--data-dir``.
    2. ``datasets`` al lado de este script.
    3. ``datasets`` en el directorio desde el que se ejecuta el script.
    """

    candidates: list[Path] = []
    if base_dir is not None:
        candidates.append(base_dir)
    candidates.extend(
        [
            SCRIPT_DIR / "datasets",
            Path.cwd() / "datasets",
        ]
    )

    checked: list[tuple[Path, list[str]]] = []

    for candidate in candidates:
        resolved = candidate.expanduser().resolve()
        if any(resolved == seen for seen, _ in checked):
            continue

        if not resolved.exists():
            checked.append((resolved, FILES))
            continue

        missing = [file for file in FILES if not (resolved / file).exists()]
        if not missing:
            return resolved
        checked.append((resolved, missing))

    message_lines = [
        "No se encontraron los CSV requeridos del dataset CICIDS2017.",
        "Coloca los archivos en la siguiente carpeta (se creará si no existe):",
    ]

    preferred_dir = (base_dir or SCRIPT_DIR / "datasets").expanduser().resolve()
    preferred_dir.mkdir(parents=True, exist_ok=True)
    message_lines.append(f" - {preferred_dir}")

    if checked:
        message_lines.append("\nSe revisaron estas rutas sin éxito:")
        for path, missing in checked:
            if missing:
                formatted_missing = "\n    - ".join(missing)
                message_lines.append(
                    f" - {path} (faltaron: \n    - {formatted_missing})"
                )
            else:
                message_lines.append(f" - {path} (no existe)")

    message_lines.append(
        "Descarga los CSV originales de CICIDS2017 y vuelve a ejecutar el script."
    )
    raise SystemExit("\n".join(message_lines))


def main() -> None:
    args = parse_args()
    data_dir = find_datasets(args.data_dir)

    for file in FILES:
        csv_path = data_dir / file
        parquet_path = csv_path.with_suffix(".parquet")
        if not parquet_path.exists():
            print(f"Convirtiendo {file} → {parquet_path.name}")
            df_temp = pd.read_csv(csv_path)
            df_temp.to_parquet(parquet_path, index=False)

    # =============================
    # 3) Cargar Parquet y unir
    # =============================
    dfs = [pd.read_parquet(data_dir / f.replace(".csv", ".parquet")) for f in FILES]
    df = pd.concat(dfs, ignore_index=True)
    print("Dataset combinado:", df.shape)

    # Normalizar nombres de columnas
    df.columns = [c.strip() for c in df.columns]

    # =============================
    # 4) Preprocesamiento
    # =============================
    # Reemplazar inf por NaN
    df = df.replace([np.inf, -np.inf], np.nan)

    # Eliminar columnas con >40% NaN
    df = df.loc[:, df.isna().mean() <= 0.4]

    # Rellenar NaN con la mediana
    df = df.fillna(df.median(numeric_only=True))

    # Crear columna binaria (BENIGN vs ATTACK)
    df["Label_binary"] = np.where(df["Label"].str.upper() == "BENIGN", "BENIGN", "ATTACK")

    print("Distribución de clases:")
    print(df["Label_binary"].value_counts())

    # =============================
    # 5) Subsample balanceado
    # =============================
    N = 20000  # puedes ajustar
    df_sample = df.groupby("Label_binary", group_keys=False).apply(
        lambda x: x.sample(min(len(x), N), random_state=42)
    )
    print("Tamaño de la muestra balanceada:", df_sample.shape)

    # =============================
    # 6) Separar features y etiquetas
    # =============================
    X = df_sample.select_dtypes(include=[np.number])  # solo columnas numéricas
    y = df_sample["Label_binary"]

    # Train/Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    # Escalado (para LR)
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    # =============================
    # 7) Entrenamiento de modelos
    # =============================
    # Random Forest
    rf = RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    print("\n=== Random Forest ===")
    print(classification_report(y_test, y_pred_rf))

    # Logistic Regression
    lr = LogisticRegression(max_iter=1000)
    lr.fit(X_train_s, y_train)
    y_pred_lr = lr.predict(X_test_s)
    print("\n=== Logistic Regression ===")
    print(classification_report(y_test, y_pred_lr))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit("Ejecución interrumpida por el usuario.")
