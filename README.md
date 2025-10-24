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

   Al completar el formulario de acceso se validará que ingreses ambos campos y, una vez aceptado, se abrirá una nueva ventana con el panel de dashboards de referencia.

## Cómo grabar un video demo del panel

1. Sigue los pasos anteriores para abrir `dashboard.html` en una pestaña nueva.
2. En la parte superior del panel encontrarás los botones **🎬 Reproducir demo** y **⟲ Reiniciar**.
3. Haz clic en **Reproducir demo** para lanzar una narración guiada que:
   - Resalta automáticamente cada sección clave.
   - Actualiza las métricas con datos simulados.
   - Muestra mensajes flotantes que puedes narrar en tu video.
4. Si necesitas volver al estado inicial, presiona **Reiniciar**; el panel recuperará los valores originales y limpiará las animaciones.
5. Repite la demostración cuantas veces necesites hasta obtener la grabación deseada.

## Publicar en GitHub Pages

Si quieres hacer público el portal directamente desde GitHub, sigue estos pasos:

1. Crea un repositorio en GitHub y sube el contenido de este proyecto.
2. Asegúrate de que tu rama principal se llama `main` o ajusta el flujo de trabajo en `.github/workflows/deploy.yml` para que apunte a la rama adecuada.
3. En GitHub, ve a **Settings → Pages** y selecciona **GitHub Actions** como fuente de despliegue.
4. A partir de ahora, cada `git push` a `main` ejecutará el flujo de trabajo **Deploy login portal to GitHub Pages**, el cual publicará el contenido de la carpeta `web` en GitHub Pages.
5. Una vez completado el despliegue, encontrarás la URL pública en la pestaña **Actions** o en la sección **Environments** del repositorio.

## Estructura

- `web/login.html`: Página principal del portal con formulario que lanza el panel en una nueva ventana.
- `web/dashboard.html`: Panel demostrativo con métricas globales, cronología de incidentes, servicios críticos y controles operativos.
- `web/demo.js`: Lógica del modo demo que automatiza la narración y las animaciones del panel.
- `web/styles.css`: Estilos personalizados del portal.
- `serve_login.py`: Script ligero para desplegar la interfaz en un entorno local.
- `.github/workflows/deploy.yml`: Flujo de trabajo que publica la carpeta `web` en GitHub Pages.

## Créditos

Trabajo desarrollado como parte de un proyecto de tesis orientado a la administración de redes.
