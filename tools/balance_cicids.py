import pandas as pd

input_path  = "backend/data/default_csv/cicids_full_conn.csv"
output_path = "backend/data/default_csv/cicids_balanced_conn.csv"

# cuántas filas quieres por clase (ajústalo si quieres más/menos)
ROWS_PER_CLASS = 2000

print(f"🔁 Leyendo {input_path} (puede tardar un poco)...")
with open(input_path, 'r') as f:
    first_line = f.readline().strip()

# Muchos CSVs exportados desde Zeek/Zeek-Log incluyen una fila inicial
# '#fields,...' que pandas interpreta como comentario. Aquí la usamos para
# generar las columnas correctas y luego la escribimos de nuevo al final.
header_line = first_line
if first_line.startswith("#fields"):
    clean_header = first_line.split(",", 1)[1]
    columns = clean_header.split(",")
    df = pd.read_csv(input_path, skiprows=1, names=columns)
else:
    df = pd.read_csv(input_path)

if 'cicids_attack' not in df.columns:
    raise SystemExit("❌ No se encontró la columna 'cicids_attack' en el CSV convertido. Columnas detectadas: "
                     f"{', '.join(df.columns)}")

print("📊 Clases disponibles y tamaños originales:")
print(df['cicids_attack'].value_counts())

# muestreamos por clase
samples = []
for label, group in df.groupby('cicids_attack'):
    n = min(ROWS_PER_CLASS, len(group))
    print(f"➡️  Clase {label}: tomando {n} filas de {len(group)}")
    samples.append(group.sample(n=n, random_state=42))

balanced = pd.concat(samples, ignore_index=True)

# recuperamos la línea '#fields ...' del archivo original
with open(input_path, 'r') as f:
    header_line = f.readline().rstrip('\n')

print(f"✍️ Escribiendo archivo balanceado en {output_path} ...")
with open(output_path, 'w') as f:
    f.write(header_line + '\n')
    balanced.to_csv(f, index=False, header=False)

print("✅ Listo. Filas totales en el archivo balanceado:", len(balanced))
