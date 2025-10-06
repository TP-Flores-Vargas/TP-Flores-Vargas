# Portal de inicio de sesión para administradores de red

Este repositorio contiene una interfaz de inicio de sesión diseñada para un portal de administración de redes.

## Visualizar la interfaz

1. Asegúrate de tener Python 3 instalado.
2. Ejecuta el script de ayuda que levanta un servidor HTTP local:

   ```bash
   python serve_login.py
   ```

   También puedes definir el puerto deseado mediante la variable de entorno `LOGIN_PORT`:

   ```bash
   LOGIN_PORT=8080 python serve_login.py
   ```

3. El script abrirá automáticamente tu navegador predeterminado en la página `login.html`. Si no se abre, accede manualmente a `http://localhost:8000/login.html` (o al puerto que hayas definido).

## Estructura

- `web/login.html`: Página principal del portal.
- `web/styles.css`: Estilos personalizados del portal.
- `serve_login.py`: Script ligero para desplegar la interfaz en un entorno local.

## Créditos

Trabajo desarrollado como parte de un proyecto de tesis orientado a la administración de redes.
