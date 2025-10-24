import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

# =============================
# 1) Definir rutas
# =============================
DATA_DIR = Path("datasets")  # Carpeta donde están los CSV
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
# 2) Convertir CSV → Parquet (si no existe)
# =============================
for file in FILES:
    csv_path = DATA_DIR / file
    parquet_path = csv_path.with_suffix(".parquet")
    if not parquet_path.exists():
        print(f"Convirtiendo {file} → {parquet_path.name}")
        df_temp = pd.read_csv(csv_path)
        df_temp.to_parquet(parquet_path, index=False)

# =============================
# 3) Cargar Parquet y unir
# =============================
dfs = [pd.read_parquet(DATA_DIR / f.replace(".csv", ".parquet")) for f in FILES]
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
df_sample = df.groupby("Label_binary", group_keys=False).apply(lambda x: x.sample(min(len(x), N), random_state=42))
print("Tamaño de la muestra balanceada:", df_sample.shape)

# =============================
# 6) Separar features y etiquetas
# =============================
X = df_sample.select_dtypes(include=[np.number])  # solo columnas numéricas
y = df_sample["Label_binary"]

# Train/Test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25,
                                                    random_state=42, stratify=y)

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
lr = LogisticRegression(max_iter=1000, n_jobs=-1)
lr.fit(X_train_s, y_train)
y_pred_lr = lr.predict(X_test_s)
print("\n=== Logistic Regression ===")
print(classification_report(y_test, y_pred_lr))
