# Aula de inferencia estadística

Página: [aula de inferencia](../../pages/inferencia-estadistica.html).
Contenido y módulos: [pages/inferencia/](../../pages/inferencia/).
Fuentes y correspondencia con los apuntes: [inferencia.SOURCES.md](inferencia.SOURCES.md).

## Alcance

- 36 lecciones: puente matemático y los cuatro temas suministrados, incluidos familia exponencial/GLM, multinomial y normal bivariante.
- 14 laboratorios y un explorador de 16 familias de distribuciones. Cada tema abre el modelo adecuado; los controles conservan el último estado válido cuando una entrada no respeta el soporte.
- 29 generadores de ejercicios con semillas reproducibles, datos, supuestos, pistas, corrección y resolución desarrollada. El banco completo incluye apoyos adicionales de muestreo, chi-cuadrado, Student y Fisher: no se presentan como temas incluidos en los PDF.
- 28 lecturas animadas, 141 escenas, sin reproducción automática ni audio. Subtítulos legibles, pausa, escenas, velocidad, transcripción y descargas. Algunas lecturas se comparten entre lecciones relacionadas.
- Glosario de 40 símbolos, búsqueda sin acentos, enlaces directos por fragmento de URL, progreso local y copia JSON.

La corrección admite coma decimal, fracciones simples, notación científica y porcentajes explícitos, sin evaluar código. Una pista o solución consultada antes de acertar distingue la respuesta como asistida. Abrir una lección no la marca como estudiada.

Los ejemplos son ficticios, no resultados experimentales ni recomendaciones clínicas. Las gráficas y sus textos señalan colas truncadas, probabilidades indefinidas, frecuencias esperadas y las hipótesis necesarias.

## Pruebas

Desde este directorio:

```sh
npm ci --ignore-scripts
npm test
```

Las dependencias de desarrollo son `linkedom` y `css-tree`; no forman parte de la aplicación publicada. Las suites cubren cálculos de referencia, semillas, soportes, lectura de respuestas, renderizado de fórmulas con KaTeX, sintaxis CSS, recursos locales, navegación de las 36 lecciones, ayudas, copias de progreso y ciclo de vida del reproductor. El DOM simulado verifica comportamiento, no la presentación real en navegador.

### Verificación pública, 2026-11-05

Se comprobó la publicación en `webs.raular.com` y la aparición del aula en la portada. Los módulos publicados usan `.js`, porque el nginx actual entrega `.mjs` como `application/octet-stream`, que el navegador rechaza. Los scripts de desarrollo mantienen `.mjs`; los dos archivos de metadatos de paquete preservan ESM para las pruebas y CommonJS para las bibliotecas UMD, sin introducir un build.

La entrega de archivos estáticos tiene caché de 120 segundos. Las URLs de entrada y de los módulos incluyen una huella de contenido para no ejecutar una copia anterior tras publicar. Después de editar código, estilos o temario y antes de probar/commitear, ejecuta:

```sh
node version-assets.mjs
npm test
```

El script solo actualiza URLs en dos archivos y es idempotente. Las pruebas rechazan huellas desactualizadas. No se ejecuta en el pod ni necesita un proceso de compilación o una herramienta de bundling.

En navegador se comprobaron fórmulas, fuente local, iconos, gráficos no vacíos y ausencia de errores de carga. Se revisaron capturas y desbordamientos a 1440, 768, 390 y 320 píxeles, menú móvil, corrección de Bayes, pistas, persistencia al recargar y actualización del laboratorio al cambiar la prevalencia. La animación cambió sus píxeles con movimiento normal y respetó la preferencia de movimiento reducido. Las capturas son temporales y no se incluyen en Git.

Se validó el texto generado por la descarga del guion. El navegador integrado no notificó el evento de guardado del archivo; la transferencia a disco no se considera verificada. Las pruebas offline verifican todos los guiones y WebVTT. No se arrancaron servidores locales ni se modificó Kubernetes.

## Exportar lecturas

```sh
node export-lecturas.mjs
node export-lecturas.mjs --out /ruta/de/salida
```

Por defecto genera en `_work/lecturas/`, excluido de Git:

- Un `.vtt` y un `.txt` por lectura.
- Un manifiesto `lecturas.json` con títulos, tiempos, fórmulas y subtítulos por escena.

El texto de los `.txt` coincide con los subtítulos del reproductor. Es la base para producir audio en el futuro. Si la duración de la voz cambia, habrá que ajustar los tiempos de las escenas: los actuales se calculan para lectura silenciosa, no para sincronización automática de audio.

## Publicación

No hay build ni backend. Se publica el HTML y su directorio de módulos en `simple-webs`; nginx y git-sync funcionan sin cambios. La portada detecta el HTML y usa su ficha en [webs.json](../../webs.json).

La URL tras integrar en `main` será `https://webs.raular.com/pages/inferencia-estadistica.html`. Los módulos necesitan HTTP, no `file://`. Para una previsualización manual sirve el comando del [README principal](../../README.md).

Los originales docentes de `Inferencia estadística/` permanecen locales e ignorados. No se distribuyen PDF, figuras originales ni respuestas de la PEC vigente.

## Bibliotecas Locales

| Biblioteca | Versión | Uso |
| --- | --- | --- |
| KaTeX | 0.16.25 | Fórmulas |
| jStat | 1.9.6 | PMF, CDF, cuantiles y funciones especiales |
| Lucide | 0.468.0 | Iconos |
| Atkinson Hyperlegible, Fontsource | 5.2.5 | Fuente local en pesos 400 y 700 |

Las licencias están junto a los archivos en [vendor/](../../pages/inferencia/vendor/). No se usan servicios remotos para cargar contenido, corregir ejercicios o guardar progreso.