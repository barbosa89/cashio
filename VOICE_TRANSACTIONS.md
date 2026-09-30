# Captura inteligente y análisis financiero offline

## Estado del documento

- Estado: fases 0 y 1 completadas; candidato de Fase 2 implementado en código y no habilitado para lanzamiento hasta completar sus gates físicos y legales.
- Fecha de actualización: 2026-09-28.
- Alcance inmediato recomendado: Android e iOS, una transacción por dictado, procesamiento local y confirmación humana obligatoria.
- Evolución prevista: dictado -> captura desde imagen -> chat de consulta financiera, siempre con inferencia en el dispositivo.
- Decisión principal: no operar un backend de IA ni enviar audio, imágenes, prompts, respuestas o registros financieros a proveedores externos.

### Estado de implementación

- **Fase 0 completada:** el spike técnico fija `llama.rn`, Gemma 4, el proyector y sus hashes; incluye descarga verificada, carga multimodal, probes de texto/audio/imagen, cancelación, aislamiento web y perfiles internos. La calificación física y la aprobación legal permanecen como gates de lanzamiento, no como trabajo de implementación de la fase.
- **Fase 1 completada:** el contrato estructurado, la validación determinista, la resolución exacta/ambigua/faltante, las reglas de transferencias y la frontera única de escritura están implementados y cubiertos por pruebas independientes del modelo.
- **Fase 2 en validación:** el MVP de dictado está implementado para builds internas; aún requiere recaptura y mediciones en dispositivos físicos antes de considerarse publicable.
- La ruta nativa `/voice-transaction` administra la descarga explícita y verificada de los artefactos fijados, conserva un marcador de integridad ligado a revisión, hashes, tamaños y tiempos de modificación, graba hasta 30 segundos y limpia audio y contexto en éxito, error, cancelación, segundo plano y desmontaje.
- La salida restringida incluye nombres semánticos y se vuelve a validar antes de resolver cuentas, categorías y etiquetas existentes. Coincidencias ausentes o ambiguas permanecen sin seleccionar.
- El resultado entra al formulario existente como borrador parcial y solo `Guardar` cruza la frontera de escritura del repositorio.
- Web conserva exclusivamente la captura manual. Inglés, español y portugués de Brasil incluyen la nueva experiencia y sus estados de recuperación.
- Siguen pendientes las pruebas en dispositivos físicos de memoria, latencia, temperatura, interrupción, modo avión, aislamiento de red y exactitud por idioma. La licencia de los artefactos también requiere aprobación antes de distribución.
- El acceso y los plugins nativos están habilitados en `development`, `ai-spike` o `voice-mvp`; las builds normales bloquean el permiso de micrófono y mantienen la ruta oculta hasta cerrar esos gates.

## Respuesta ejecutiva

Sí, es posible construir la experiencia propuesta con modelos locales. El artículo de Hugging Face
[`LLM Inference on Edge`](https://huggingface.co/blog/llm-inference-on-edge) demuestra que una
aplicación React Native puede descargar, cargar y ejecutar modelos GGUF cuantizados mediante
`llama.rn`, con generación incremental y sin un servidor de inferencia. Esta dirección encaja con la
arquitectura local-first de Cash IO.

Sin embargo, el artículo demuestra principalmente **chat de texto**. Cash IO amplía esa arquitectura
con Gemma 4 E2B-it QAT, que admite texto, imagen y audio mediante un proyector multimodal compatible
con `llama.rn`:

```text
Voz:    audio  -> Gemma 4 + mmproj -> JSON/tools -> borrador
Imagen: foto   -> Gemma 4 + mmproj -> JSON/tools -> borrador
Chat:   texto  -> Gemma 4 -> tools financieras de solo lectura -> respuesta
```

### Un modelo para las tres modalidades

La arquitectura selecciona un único LLM multimodal: Gemma 4 E2B-it QAT. El archivo GGUF contiene el
modelo principal y `mmproj-F16.gguf` incorpora la capacidad de procesar audio e imágenes. El audio se
procesa directamente en el mismo contexto que genera el borrador estructurado.

- El audio grabado se entrega directamente a Gemma junto con el esquema de extracción y el contexto
  local mínimo.
- La imagen de un recibo se entrega al mismo modelo y proyector.
- El chat reutiliza el GGUF y puede liberar el proyector cuando solo procesa texto.
- MTP es un drafter opcional para acelerar generación textual; no sustituye a Gemma ni añade otra
  modalidad, y queda fuera del camino inicial de audio o imagen.

La viabilidad sigue condicionada a demostrar calidad en inglés, español y portugués de Brasil, además
de memoria y latencia aceptables en dispositivos físicos. Si el audio directo no alcanza los umbrales,
la función de voz no se publica en esos dispositivos o idiomas; esta propuesta no incorpora un segundo
pipeline de voz como fallback.

## Relación con el artículo de Hugging Face

### Lo que el artículo sí demuestra

- Modelos pequeños, aproximadamente de 1 a 3 mil millones de parámetros, pueden ser utilizables en
  teléfonos.
- La cuantización GGUF permite intercambiar calidad, tamaño y velocidad.
- `llama.rn`, como binding de `llama.cpp`, permite ejecutar inferencia desde React Native.
- El modelo puede descargarse al almacenamiento de la aplicación, cargarse localmente y responder
  sin enviar el prompt a un servicio remoto.
- Es posible emitir tokens progresivamente, cancelar generación y gestionar el ciclo de carga del
  modelo.
- Los modelos de 4 a 7 mil millones de parámetros quedan principalmente para dispositivos modernos
  de gama alta; 8B o más no son una base razonable para compatibilidad móvil amplia.

### Lo que el artículo no demuestra

- Comprensión directa de audio fiable en inglés, español y portugués de Brasil.
- Extracción exacta de montos, fechas, cuentas y categorías.
- Extracción fiable de transacciones desde recibos o facturas fotografiados.
- Rendimiento en el conjunto real de dispositivos que soporta Cash IO.
- Salidas JSON válidas y semánticamente correctas para datos financieros.
- Gestión de presión de memoria, interrupciones del sistema y cierres por falta de recursos.
- Distribución de modelos, actualizaciones, licencias, integridad y recuperación de descargas.
- Calidad suficiente para responder preguntas financieras sobre una base SQLite local.

Los modelos concretos del artículo son ejemplos de 2025, no una selección de producción. La elección
de Cash IO debe basarse en un corpus propio, licencias redistribuibles, soporte multilingüe, formato
GGUF compatible y mediciones en dispositivos físicos.

### Estado actual de `llama.rn`

La documentación actual de `llama.rn` incluye:

- Aceleración Metal en iOS y opciones de GPU/NPU con compatibilidad limitada en Android.
- Salidas restringidas mediante gramáticas GBNF o JSON Schema.
- Tool calling, embeddings y reranking.
- Soporte multimodal de visión y audio para determinados modelos y proyectores `mmproj`.
- Plugin para proyectos Expo con builds nativos.

Estas capacidades hacen viable un spike, pero no equivalen a soporte uniforme en todos los teléfonos.
La aceleración Android depende del hardware, backend y cuantización; el fallback por CPU debe medirse.
El soporte multimodal requiere archivos adicionales y más memoria. Cash IO debe fijar y probar una
versión concreta de `llama.rn`, `llama.cpp`, modelo y cuantización antes de comprometer compatibilidad.

## Encaje con Cash IO

Cash IO ya establece que:

- SQLite es la fuente de verdad.
- El núcleo funciona sin conexión.
- No existe un servidor de aplicación.
- Los registros financieros no se usan para publicidad ni analítica.
- Android, iOS y web comparten la aplicación, con capacidades adaptadas por plataforma.

La inferencia local preserva estas propiedades mejor que un pipeline administrado:

- El audio, las imágenes, los prompts, las respuestas y los movimientos permanecen en el dispositivo.
- No se requieren claves de proveedores, autenticación, atestación ni cuotas de inferencia.
- No existe costo variable por solicitud.
- La captura continúa funcionando sin conexión una vez instalados los artefactos de Gemma.
- El usuario conserva el flujo manual si el dispositivo no puede ejecutar Gemma.

La descarga inicial o actualización de los artefactos sí puede requerir conexión. Esto no contradice el
procesamiento offline, pero debe explicarse con precisión. Si el requisito fuera funcionar sin haber
tenido conexión después de instalar la app, los artefactos tendrían que incluirse en el binario, con un
impacto importante en el tamaño de descarga de las tiendas.

## Objetivos de producto

### Objetivo inmediato: dictado

Permitir que una persona describa oralmente una transacción y obtenga un borrador local, editable y
validado. El sistema reduce escritura, pero no toma la decisión final ni persiste automáticamente.

Ejemplo:

> "Gasté 25 mil en supermercado hoy desde la cuenta principal, categoría comida, etiqueta hogar."

Resultado esperado:

- Tipo: egreso.
- Monto: `25000`.
- Fecha: fecha local actual.
- Cuenta: coincidencia inequívoca con "Principal".
- Categoría: coincidencia inequívoca con "Comida" y compatible con egresos.
- Etiqueta: coincidencia con "Hogar".
- Descripción: "Supermercado".
- Estado: borrador pendiente de confirmación.

### Objetivo posterior: captura desde imagen

Permitir que el usuario tome o seleccione una foto de un recibo y obtenga uno o más candidatos de
transacción. La imagen se entrega directamente a Gemma 4 y se elimina cuando deja de
ser necesaria. No se implementa una etapa intermedia dedicada a convertir toda la imagen en texto.

La captura visual introduce problemas distintos al dictado:

- Recibos inclinados, borrosos, arrugados o con poco contraste.
- Múltiples importes: subtotal, impuestos, propina, descuento, total y cambio.
- Fechas, comercios y divisas ambiguas.
- Documentos con varias compras, páginas o idiomas.
- Metadatos EXIF potencialmente sensibles.

El MVP de imagen debe comenzar con una imagen y un candidato, exigir que el usuario confirme el total
y no intentar categorizar líneas individuales automáticamente.

### Objetivo opcional final: chat financiero

Permitir preguntas sobre movimientos locales, por ejemplo:

- "¿Cuánto gasté en comida este mes?"
- "Compara transporte con el mes anterior."
- "¿Cuáles fueron mis categorías con mayor gasto?"

El chat no debe recibir una serialización completa de SQLite en el prompt ni ejecutar SQL generado
libremente. El LLM debe seleccionar herramientas locales tipadas y de solo lectura, por ejemplo:

```ts
type FinancialToolCall =
  | { name: "get_expense_total"; from: string; to: string; categoryId: number | null }
  | { name: "compare_periods"; metric: "income" | "expense"; periods: [DateRange, DateRange] }
  | { name: "get_category_breakdown"; from: string; to: string; limit: number }
  | { name: "get_account_summary"; accountId: number; from: string; to: string }
  | { name: "search_transactions"; filters: TransactionSearchFilters; limit: number };
```

La aplicación valida los argumentos, ejecuta consultas preparadas en repositorios y entrega al LLM
solo el resultado mínimo necesario para redactar la respuesta. Las respuestas deben distinguir hechos
calculados de explicaciones generadas y no presentarse como asesoría financiera profesional.

## Arquitectura recomendada

### Entrada multimodal unificada

```text
Micrófono -> audio -------------------------+
                                            |
Cámara/galería -> imagen -------------------+-> Gemma4MultimodalModel
                                            |            |
Entrada escrita ----------------------------+            v
                                                  JSON restringido
                                                   / tool calls
                                                        |
                                            +-----------------------+
                                            | Tool registry local   |
                                            | Validación/repositorio|
                                            +-----------------------+
                                                        |
                                                SQLite / borrador UI
```

Interfaces conceptuales:

```ts
type LocalMultimodalModel = {
  extractTransaction(input: ExtractionInput): Promise<UnresolvedTransactionDraft>;
  extractTransactionFromAudio(
    input: AudioExtractionInput,
  ): Promise<UnresolvedTransactionDraft>;
  extractTransactionFromImage(
    input: ImageExtractionInput,
  ): Promise<UnresolvedTransactionDraft>;
  planFinancialQuery(input: FinancialQuestion): Promise<FinancialToolCall>;
  explainToolResult(input: ToolResultInput): AsyncIterable<string>;
};
```

El adaptador multimodal encapsula el GGUF de Gemma 4, `mmproj-F16`, los prompts, las tools y las
gramáticas. Inicializa el proyector para audio o imagen y puede liberarlo para chat exclusivamente
textual. La UI no conoce detalles de `llama.rn` ni puede sustituir el modelo por una URL arbitraria.

### Pipeline de voz recomendado

```text
Audio temporal
  -> comprobar duración/formato
  -> Gemma 4 + mmproj + contexto local mínimo
  -> salida restringida por JSON Schema/GBNF o tools permitidas
  -> validar tipos, monto y fecha
  -> resolver nombres contra SQLite
  -> mostrar borrador editable
  -> confirmar explícitamente
  -> createTransaction
  -> eliminar audio y estado efímero
```

Gemma interpreta el audio y produce directamente el borrador semántico, sin generar otro artefacto
intermedio. El modelo devuelve nombres, no IDs. Si usa una tool de búsqueda, solo puede referirse a IDs
incluidos en la respuesta limitada de esa tool. En ambos casos el cliente vuelve a
resolver o verificar los IDs contra SQLite antes de confirmar.

### Pipeline de imagen recomendado

```text
Imagen temporal
  -> corregir orientación y limitar resolución
  -> eliminar metadatos no necesarios
  -> Gemma 4 + mmproj + contexto mínimo
  -> JSON restringido o tools locales permitidas
  -> candidato semántico no resuelto
  -> validación y resolución local
  -> revisión obligatoria
  -> createTransaction
  -> eliminar imagen y estado efímero
```

El modelo debe interpretar directamente el contenido visual y devolver los campos de la transacción.
No se necesita conservar ni mostrar todo el texto del recibo. Para facilitar la revisión,
la respuesta puede incluir evidencia breve por campo, como el texto visible asociado al total o la
fecha, siempre limitada y mantenida solo en memoria.

### Tools locales

Las tools conectan el modelo con capacidades controladas de Cash IO; no sustituyen la capacidad visual
del modelo. Todas se implementan en la aplicación, usan contratos tipados y pasan por una allowlist.

Para crear un pre-registro pueden exponerse:

```ts
type TransactionDraftToolCall =
  | { name: "search_accounts"; query: string }
  | {
      name: "search_categories";
      query: string;
      transactionType: "income" | "expense";
    }
  | { name: "search_tags"; query: string }
  | { name: "get_local_date_context" }
  | { name: "validate_transaction_draft"; draft: UnresolvedTransactionDraft };
```

La búsqueda devuelve pocos candidatos y nunca permite al modelo seleccionar un ID que no haya sido
devuelto por la tool. `validate_transaction_draft` reutiliza las mismas reglas deterministas del
formulario y del repositorio; informa errores, pero no persiste.

Para catálogos pequeños puede ser más rápido incluir candidatos mínimos en el prompt y generar el JSON
en una sola inferencia. El bucle de tools debe activarse solo cuando reduzca ambigüedad o evite enviar
catálogos grandes al contexto. No se debe convertir la captura en un agente autónomo innecesario.

Política mínima de ejecución:

```ts
type LocalToolPolicy = {
  allowedTools: ReadonlySet<string>;
  maxToolCalls: number;
  timeoutMs: number;
  readOnly: true;
};
```

La aplicación valida nombre, esquema, longitudes y parámetros antes de ejecutar cada llamada. Un error
o un límite agotado termina en borrador incompleto; nunca amplía permisos ni intenta una operación
alternativa.

### Pipeline de chat recomendado

```text
Pregunta
  -> Gemma 4 genera una llamada tipada
  -> validador comprueba operación y parámetros
  -> repositorio ejecuta consulta local de solo lectura
  -> resultado agregado mínimo
  -> Gemma 4 redacta una explicación
  -> UI muestra periodo, filtros y cifras fuente
```

El chat no debe crear, editar o eliminar transacciones en su primera versión. Si más adelante propone
acciones, estas deben convertirse en borradores y requerir la misma confirmación humana.

## Modelo seleccionado

### Modelo seleccionado: Gemma 4 E2B-it QAT

El modelo seleccionado para el spike es
[`unsloth/gemma-4-E2B-it-qat-GGUF`](https://huggingface.co/unsloth/gemma-4-E2B-it-qat-GGUF),
una conversión GGUF del checkpoint QAT
[`google/gemma-4-E2B-it-qat-q4_0-unquantized`](https://huggingface.co/google/gemma-4-E2B-it-qat-q4_0-unquantized).
Es un modelo instruction-tuned con texto, imagen, audio, function calling y licencia Apache 2.0. Esta
selección es provisional hasta completar las pruebas de calidad, memoria, latencia y compatibilidad en
dispositivos físicos.

Gemma 4 E2B tiene 2.3B parámetros efectivos y 5.1B al contar sus embeddings por capa. La selección no
se basa únicamente en el nombre E2B: se debe presupuestar usando el tamaño real de los artefactos y el
pico de memoria medido. La configuración inicial usa:

- `UD-Q4_K_XL` como cuantización única del spike.
- `mmproj-F16` para entrada directa de audio e imagen.
- Contextos cortos y thinking desactivado para la extracción interactiva.
- JSON Schema/GBNF y tools tipadas para controlar la salida.
- Inglés, español y portugués de Brasil como idiomas que deben validarse por separado.
- MTP desactivado hasta disponer de una línea base estable.

Artefactos fijados para la primera prueba con `llama.rn`:

| Artefacto | Uso | Tamaño | SHA-256 | Descarga |
| --- | --- | ---: | --- | --- |
| `gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf` | Modelo principal QAT cuantizado | 2,620,370,976 bytes (~2.62 GB) | `e531007218dfab990486a5de7676a6932d6ea8dea233d1f698d7c21cf8a16889` | [Descargar modelo](https://huggingface.co/unsloth/gemma-4-E2B-it-qat-GGUF/resolve/66a399f68ddd113b06dff02fca9523e55465d11d/gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf?download=true) |
| `mmproj-F16.gguf` | Proyector multimodal para imagen y audio | 985,654,080 bytes (~0.99 GB) | `13c8966d1635d02e6727f27402880614906fa291850c07feda18dbcddf2291b6` | [Descargar proyector](https://huggingface.co/unsloth/gemma-4-E2B-it-qat-GGUF/resolve/66a399f68ddd113b06dff02fca9523e55465d11d/mmproj-F16.gguf?download=true) |
| `mtp-gemma-4-E2B-it.gguf` | Drafter MTP opcional para speculative decoding | 59,235,648 bytes (~59 MB) | `586f2460b909008640981ec34060aa864e03c144fbabfb3173c4335087e4aae0` | [Descargar MTP](https://huggingface.co/unsloth/gemma-4-E2B-it-qat-GGUF/resolve/66a399f68ddd113b06dff02fca9523e55465d11d/mtp-gemma-4-E2B-it.gguf?download=true) |

El modelo y el proyector requieren aproximadamente 3.61 GB de descarga. Con MTP, el total es de
aproximadamente 3.67 GB, sin contar archivos temporales, KV cache ni buffers de ejecución. El
proyector es obligatorio para procesar imágenes o audio; MTP no lo es y debe activarse solo después de
medir su beneficio. El soporte MTP actual de `llama.rn` es textual, por lo que no se presupone una
mejora en las fases que procesan directamente imagen o audio.

La aplicación no debe descargar siempre la revisión `main`. El manifiesto de producción debe fijar el
commit `66a399f68ddd113b06dff02fca9523e55465d11d`, las URLs finales, los tamaños y los hashes anteriores.
Antes de redistribuir los artefactos también debe conservarse el aviso de licencia y verificarse que la
revisión fijada no haya cambiado.

### Uso por modalidad

- **Audio:** Gemma recibe una grabación local de hasta 30 segundos después del texto de instrucciones,
  según el orden recomendado por su model card. Devuelve directamente el borrador estructurado.
- **Imagen:** Gemma recibe primero la imagen y después las instrucciones. El presupuesto visual se
  ajusta para preservar texto pequeño en recibos sin exceder los límites medidos.
- **Texto y chat:** Gemma se ejecuta sin contenido multimedia; el proyector puede liberarse cuando la
  sesión no vaya a procesar audio o imágenes.
- **Tools:** la plantilla incluida en el GGUF soporta function calling, pero cada llamada sigue pasando
  por la allowlist y validación de Cash IO.

Que el modelo declare una modalidad no demuestra que `llama.rn` la ejecute correctamente en cada
backend. El spike debe validar que el mismo `mmproj-F16` expone `vision: true` y `audio: true` en iOS y
Android antes de considerar disponible cualquiera de esas funciones.

## Gestión y distribución de artefactos

### Instalación

Se recomienda que las funciones inteligentes sean opcionales y que los artefactos se descarguen de forma
explícita:

- Mostrar tamaño antes de descargar.
- Permitir elegir entre datos móviles y Wi-Fi.
- Soportar pausa, reanudación, cancelación y espacio insuficiente.
- Verificar hash y tamaño antes de activar un archivo.
- Descargar a un archivo temporal y moverlo atómicamente al completar.
- Permitir eliminar los artefactos de Gemma sin eliminar datos financieros.
- No activar automáticamente una versión nueva sin validación de compatibilidad.

Descargar pesos no implica enviar información financiera. La solicitud de descarga solo debe revelar
los metadatos técnicos inevitables del transporte. No deben adjuntarse identificadores de cuentas,
catálogos ni telemetría de uso.

### Manifiesto local

Cada artefacto debe tener un manifiesto versionado:

```ts
type LocalModelManifest = {
  id: string;
  capability: "multimodal_model" | "multimodal_projector" | "mtp_drafter";
  version: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  license: string;
  supportedLocales: string[];
  minimumAppVersion: string;
  minimumMemoryClass?: string;
};
```

No se deben aceptar repositorios o URLs arbitrarias introducidas por el usuario en el flujo normal.
Cash IO debe fijar artefactos evaluados, revisar sus licencias y conservar hashes reproducibles.

### Presupuesto de recursos

El tamaño del GGUF no equivale a la RAM usada. También consumen memoria el contexto, KV cache,
buffers, proyectores y backend de aceleración. Antes de definir dispositivos compatibles hay que medir:

- Tamaño de descarga e instalación.
- Pico de RAM al cargar y durante inferencia.
- Tiempo de carga en frío.
- Tiempo de procesamiento por segundo de audio.
- Tokens por segundo del LLM.
- Tiempo total hasta el borrador.
- Consumo térmico y de batería tras usos consecutivos.
- Frecuencia de cierres por presión de memoria.

La aplicación debe responder a eventos de memoria, liberar el contexto y el proyector al salir, y
cancelar de forma segura cuando pasa a segundo plano. MTP no debe cargarse durante audio o imagen ni
en dispositivos donde aumente el pico de memoria sin una mejora textual demostrada.

## Salida estructurada y validación

### Contrato no resuelto

El LLM produce datos semánticos, nunca una transacción persistible:

```ts
type LocalExtractionResult = {
  detectedEntryCount: number;
  extracted: {
    type: "income" | "expense" | null;
    amount: number | null;
    transactionDate: string | null;
    description: string;
    accountName: string | null;
    categoryName: string | null;
    tagNames: string[];
    destinationAccountName: string | null;
    currencyMention: string | null;
  };
  warnings: Array<
    | "multiple_entries"
    | "currency_mentioned"
    | "unsupported_intent"
    | "unclear_source"
    | "future_date"
  >;
};
```

La generación debe restringirse con JSON Schema o GBNF. Esto garantiza forma sintáctica, no verdad
semántica. Todo resultado sigue siendo entrada no confiable.

### Resolución local

```ts
type FieldResolution =
  | "exact"
  | "ambiguous"
  | "missing"
  | "invalid"
  | "omitted"
  | "not_applicable";
```

Reglas obligatorias:

- Rechazar importes no finitos, cero, negativos o no enteros mientras el formulario mantenga
  precisión cero.
- Exigir fecha ISO `YYYY-MM-DD` y comprobar que sea real.
- Resolver fechas relativas con instante, fecha local y zona horaria capturados al iniciar.
- No convertir monedas. Mientras no exista moneda configurada, una divisa pronunciada o detectada
  requiere revisión y no se interpreta automáticamente.
- Normalizar nombres solo para búsqueda y preferir coincidencia exacta.
- Marcar múltiples coincidencias como ambiguas; nunca elegir por orden.
- Verificar que cuentas, categorías y etiquetas sigan existiendo antes de confirmar.
- Verificar compatibilidad entre categoría y tipo.
- Para transferencias, exigir origen y destino distintos y las reglas compartidas del repositorio.
- Limitar duración de audio, evidencia visual, descripción, prompt y respuesta.
- No usar una confianza numérica del modelo como autorización para guardar.

### Frontera de escritura

El LLM no recibe una herramienta de escritura. Solo la acción explícita `Confirmar transacción`
convierte un borrador completo en `CreateTransactionInput` y llama al flujo existente:

```text
UI -> useCashioData().addTransaction -> createTransaction -> SQLite
```

Antes de habilitar voz deben extraerse del formulario las reglas de categoría y transferencia y
reforzarse en `createTransaction`, para que captura manual, voz e imagen compartan la misma frontera.

## Alcance del MVP de dictado

### Incluido

- Android e iOS.
- Inicio y detención manual de una grabación en primer plano.
- Máximo inicial recomendado de 30 segundos.
- Permiso de micrófono solicitado en contexto.
- Descarga y administración explícita de los artefactos seleccionados.
- Comprensión de audio y extracción completamente locales con Gemma 4.
- Una transacción por grabación.
- Ingreso, egreso y transferencia.
- Inglés, español y portugués de Brasil.
- Campos extraídos y advertencias visibles para detectar errores.
- Resolución exclusiva contra entidades existentes.
- Borrador editable y confirmación obligatoria.
- Eliminación del audio tras éxito, cancelación, error terminal o desmontaje.
- Ruta clara al formulario manual si el modelo falta, falla o el dispositivo no es compatible.

### No incluido

- Procesamiento remoto o fallback a la nube.
- Escucha permanente, palabra de activación o grabación en segundo plano.
- Varias transacciones por grabación.
- Guardado automático.
- Crear cuentas, categorías o etiquetas desde el modelo.
- Modificar o eliminar movimientos por voz.
- Captura desde imagen en la primera entrega.
- Chat financiero en la primera entrega.
- Web en la primera entrega.
- Selección arbitraria de modelos o artefactos por el usuario.
- Importes decimales o conversión de moneda mientras el dominio no los soporte.

## Experiencia de usuario

### Preparación de Gemma

Antes del primer uso:

1. Explicar que el procesamiento ocurre en el dispositivo.
2. Mostrar el espacio requerido y los idiomas cubiertos.
3. Descargar y verificar los artefactos.
4. Ejecutar una comprobación corta de compatibilidad.
5. Permitir eliminar o volver a descargar desde ajustes.

No es necesario pedir consentimiento para enviar datos a terceros porque no se envían, pero sí debe
informarse sobre almacenamiento, batería, temperatura y descarga de los artefactos.

### Estados de voz

1. `model_assets_missing`: explica y ofrece descargar.
2. `model_assets_downloading`: progreso, pausa/cancelación y espacio restante.
3. `idle`: explicación breve y botón "Grabar".
4. `requesting_permission`: solicita micrófono.
5. `recording`: indicador inequívoco, duración y botón "Detener".
6. `processing_audio`: Gemma procesa el audio y genera el borrador restringido.
7. `review`: formulario precargado, evidencia mínima y advertencias.
8. `saving`: confirmación bloqueada contra doble pulsación.
9. `retryable_error`: permite reintentar localmente mientras la pantalla siga abierta.
10. `terminal_error`: elimina temporales y ofrece grabar de nuevo o continuar manualmente.

### Errores específicos

- Permiso denegado temporal o permanentemente.
- Modelo ausente, corrupto o incompatible.
- Espacio insuficiente durante descarga o instalación.
- Descarga interrumpida.
- Memoria insuficiente al cargar o inferir.
- Sobrecalentamiento o cancelación por segundo plano.
- Audio vacío, inaudible, demasiado corto o largo.
- Audio sin transacción identificable.
- JSON inválido pese a la gramática o resultado semánticamente inválido.
- Monto, fecha, cuenta o categoría ausentes/ambiguos.
- Más de una transacción detectada.

## Integración técnica en este repositorio

### Dependencias y builds

La dirección a evaluar es:

- `expo-audio` para grabación.
- `llama.rn` para Gemma 4 GGUF, el proyector de audio/imagen, MTP opcional y las tools locales.
- `expo-file-system`, ya instalado, para artefactos y temporales.
- `expo-camera` y/o `expo-image-picker` cuando comience la fase de imagen, tras verificar las versiones
  compatibles con Expo SDK 56.

`llama.rn` es un módulo nativo y requiere la Nueva Arquitectura de React Native en versiones actuales.
Cash IO usa React Native 0.85, pero la compatibilidad exacta con Expo SDK 56 debe comprobarse en un
spike antes de fijar dependencia. Será necesario configurar plugins Expo/CNG y usar development
builds; Expo Go no es suficiente.

No se deben editar directamente los directorios nativos generados. Configuración, entitlements y
opciones de compilación pertenecen en `app.json`, config plugins o módulos fuente.

### Módulos sugeridos

```text
src/
  components/
    transaction-form.tsx
    voice-transaction-recorder.tsx
    voice-transaction-review.tsx
    image-transaction-capture.tsx
    image-transaction-review.tsx
    local-model-manager.tsx
  hooks/
    use-voice-transaction.ts
    use-image-transaction.ts
    use-local-model.ts
  lib/
    local-ai/
      contracts.ts
      model-manifest.ts
      model-manager.ts
      multimodal-model.native.ts
      multimodal-model.web.ts
      transaction-extraction.ts
      tool-registry.ts
      transaction-tools.ts
      financial-tools.ts
      errors.ts
    transaction-domain.ts
    resolve-transaction-draft.ts
    audio-file.ts
```

Los adaptadores de plataforma deben dejar voz, captura desde imagen y chat no disponibles en web hasta
que exista una implementación local equivalente. El formulario manual web permanece intacto.

### Base de datos

El MVP de voz no requiere migración:

- Audio y borrador son efímeros.
- Los artefactos de Gemma viven como archivos administrados, no dentro de SQLite.
- La confirmación reutiliza `CreateTransactionInput`.

El chat sí puede requerir nuevas consultas agregadas, pero no necesita embeddings para las preguntas
estructuradas iniciales. Deben preferirse consultas deterministas sobre transacciones antes de añadir
un índice vectorial. Si posteriormente se persiste historial de chat o embeddings, se necesita una
decisión separada sobre esquema, expiración y backups.

## Privacidad y seguridad

### Invariantes

- Ningún audio, imagen, prompt, resultado de consulta o movimiento sale del dispositivo.
- No existe fallback silencioso a APIs del sistema que puedan usar red.
- Las funciones manuales no dependen de Gemma ni de conectividad.
- Los temporales se guardan en cache y se eliminan en todos los caminos terminales.
- Los prompts y respuestas no se registran en logs.
- Gemma no ejecuta SQL ni recibe herramientas de escritura.
- Las consultas de chat usan operaciones permitidas y parámetros validados.
- Los artefactos de modelo se verifican criptográficamente antes de cargarse.

### Entrada multimedia

La grabación se realiza con `expo-audio` y se entrega por ruta local a Gemma 4. El archivo permanece en
cache y se elimina después del resultado, cancelación o error terminal; ninguna API externa o del
sistema procesa su contenido.

El selector de galería y la cámara solo obtienen archivos locales. La imagen se entrega al modelo
multimodal mediante una ruta local y nunca a un reconocedor remoto o servicio de almacenamiento.

### Prompt injection local

Aunque no haya servidor, el contenido de un audio, recibo o nombre de categoría puede contener instrucciones
maliciosas. Deben delimitarse como datos. La salida restringida y la lista cerrada de herramientas
evitan que el modelo amplíe sus permisos. En chat, ninguna instrucción almacenada en una descripción
de transacción puede cambiar las reglas del sistema.

## Rendimiento y compatibilidad

No todos los dispositivos podrán ofrecer la misma experiencia. Debe definirse una matriz basada en
mediciones, no solo en versión de sistema:

- Arquitectura de 64 bits.
- RAM disponible y clase de memoria.
- Soporte Metal en iOS.
- CPU y, cuando proceda, GPU/NPU compatible en Android.
- Espacio libre para los artefactos de Gemma y archivos temporales.
- Tiempo máximo aceptable por operación.

La aplicación debe detectar fallos con dignidad y conservar siempre la captura manual. No debe
prometer que una función está disponible solo porque el dispositivo permite instalar la app.

Posibles perfiles después de medir:

- **No compatible:** captura inteligente desactivada y formulario manual disponible.
- **Estándar:** Gemma 4 `UD-Q4_K_XL` + `mmproj-F16` para voz e imagen.
- **Avanzado:** la misma base con mayor contexto de chat o MTP textual si las mediciones lo justifican.

No se deben publicar estos perfiles hasta tener resultados reproducibles.

## Pruebas y evaluación

### Spike obligatorio

Antes de implementar UI de producción:

1. Integrar `llama.rn` en un development build de Expo SDK 56.
2. Descargar y verificar el modelo y proyector fijados de Gemma 4.
3. Cargar `UD-Q4_K_XL` con `mmproj-F16` y confirmar soporte de audio e imagen.
4. Procesar audio real de iOS y Android y forzar un esquema de extracción con GBNF/JSON Schema.
5. Medir el pico de RAM del modelo, proyector, contexto y buffers durante inferencia multimodal.
6. Probar cancelación, segundo plano y presión de memoria.
7. Verificar que el dispositivo no realiza solicitudes durante inferencia.
8. Comparar MTP desactivado y activado únicamente en generación textual.
9. Comparar al menos un teléfono Android económico, uno medio y uno de gama alta, además de dos
   generaciones relevantes de iPhone.

### Corpus de voz

- Inglés, español y portugués de Brasil.
- Acentos regionales y mezcla de idiomas en nombres propios.
- Habla rápida/lenta, ruido y micrófonos diferentes.
- Números como "veinticinco mil", "mil quinientos" y homófonos.
- Fechas absolutas y relativas.
- Cuentas y categorías con nombres similares.
- Ingresos, egresos y transferencias.
- Frases incompletas, contradictorias y múltiples transacciones.
- Instrucciones maliciosas dentro de la frase o los catálogos.

### Corpus futuro de imagen

- Recibos impresos y manuscritos cuando se declare soporte.
- Diferentes iluminaciones, rotaciones y niveles de desenfoque.
- Subtotal, impuestos, propina, descuento y total.
- Fechas y formatos numéricos por locale.
- Varias divisas, aunque el producto inicialmente las marque para revisión.
- Documentos no financieros y contenido adversarial.

### Evaluación de chat

- Exactitud numérica frente a consultas SQL esperadas.
- Selección correcta de herramienta, periodo, cuenta y categoría.
- Rechazo de operaciones no soportadas.
- Ausencia de escrituras o SQL arbitrario.
- Respuesta consistente con el resultado de la herramienta.
- Manejo explícito de datos insuficientes.
- Latencia hasta el primer token y tiempo total.

### Métricas de salida

- Exactitud por campo después de la extracción directa desde audio.
- Tasa de borradores confirmados sin cambios.
- Falsas selecciones de cuenta/categoría, penalizadas más que campos vacíos.
- p50/p95 de carga, procesamiento de audio, extracción y tiempo total.
- Pico de RAM y cierres por presión de memoria.
- Tamaño instalado de cada capacidad.
- Batería y temperatura tras capturas consecutivas.
- Exactitud numérica del chat; no solo calidad percibida de la redacción.

## Plan de entrega

### Fase 0: viabilidad técnica - completada

- Se fijaron `llama.rn@0.13.0-rc.6`, Gemma 4 E2B-it QAT `UD-Q4_K_XL`, `mmproj-F16`, la revisión inmutable, tamaños y hashes SHA-256.
- Se integró `llama.rn` con Expo SDK 56, Nueva Arquitectura, configuración C++20, entitlements de memoria y backends nativos mediante perfiles internos.
- Se implementó el harness `/ai-spike` con descarga atómica, verificación incremental, carga multimodal, detección de soporte de audio/visión y probes restringidos de texto, audio e imagen.
- Se implementaron cancelación, liberación de contexto, aislamiento por propietario, cleanup al pasar a segundo plano, fallback web y documentación operativa en `AI_SPIKE.md`.
- Se decidió la descarga opcional explícita del modelo y proyector; MTP permanece desactivado y fuera del camino inicial.
- Se documentaron como gates de lanzamiento pendientes la aprobación legal y las mediciones físicas de calidad, RAM, latencia, temperatura, backend y compatibilidad por dispositivo.

### Fase 1: dominio compartido - completada

- Se definió un contrato JSON restringido para tipo, monto, fecha, descripción, cuentas, categoría, etiquetas, moneda y cantidad de transacciones detectadas.
- Se implementó validación local independiente del modelo para forma, claves permitidas, límites, importes enteros y fechas reales.
- Se implementó resolución determinista de cuentas, categorías y etiquetas con estados exacto, ambiguo, faltante, inválido, omitido y no aplicable.
- Se preserva explícitamente la intención de transferencia y se exige origen y destino distintos sin convertir destinos no resueltos en gastos ordinarios.
- Se reforzó la frontera compartida de persistencia para rechazar importes no enteros y reutilizar las validaciones del repositorio y sus escrituras atómicas.
- Se añadieron pruebas independientes del modelo para contratos, resolución, campos omitidos, coincidencias ambiguas, transferencias y borradores parciales sin defaults silenciosos.

### Fase 2: MVP de dictado

- Gestión segura de artefactos y verificación de hashes.
- Permisos, grabación y cleanup.
- Extracción directa de audio con Gemma 4 y gramática restringida.
- Revisión editable y confirmación única.
- Localización en inglés, español y portugués.
- Pruebas físicas de interrupción, memoria y funcionamiento sin red.

### Fase 3: beta y optimización

- Medir correcciones y abandonos localmente sin registrar contenido sensible.
- Afinar prompts contra el corpus versionado.
- Ajustar contexto, backend y perfiles de dispositivo sin cambiar el modelo seleccionado.
- Decidir si se requiere fine-tuning o si prompting y reglas son suficientes.
- Documentar dispositivos no compatibles y degradación al formulario manual.

### Fase 4: captura desde imagen

- Evaluar el modelo multimodal y su proyector con recibos reales consentidos o sintéticos.
- Implementar cámara, galería, orientación, límites de resolución y eliminación de metadatos.
- Entregar la imagen directamente al modelo y reutilizar las tools y la resolución de borrador.
- Confirmar total, fecha y comercio antes de permitir guardar.

### Fase 5: chat financiero de solo lectura

- Definir preguntas soportadas y herramientas tipadas.
- Implementar consultas agregadas deterministas.
- Añadir planificación local y explicación con el LLM compartido.
- Mostrar filtros, periodos y cifras fuente.
- Evaluar exactitud numérica y bloquear cualquier escritura.

## Criterios de aceptación del MVP de voz

- Toda inferencia continúa funcionando con modo avión después de instalar los artefactos.
- Una prueba de red confirma que no se envía audio, catálogo ni datos financieros.
- No existe clave ni endpoint de proveedor de IA en el cliente.
- Ninguna transacción se escribe antes de confirmación explícita.
- El resultado del LLM está restringido por esquema y pasa por validación local.
- IDs inexistentes, ambiguos o incompatibles nunca se seleccionan silenciosamente.
- El audio se elimina en éxito, cancelación, error terminal y desmontaje.
- Los logs no contienen audio, prompts, respuestas, monto, descripción ni nombres de catálogos.
- La captura manual sigue funcionando offline sin los artefactos de Gemma instalados.
- Los tres idiomas cumplen las métricas acordadas en dispositivos físicos.
- Los picos de memoria, temperatura y latencia permanecen dentro de límites definidos.
- La aplicación detecta artefactos corruptos y puede recuperarse sin afectar SQLite.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Aplicación o descarga demasiado grande | Menos instalaciones y falta de espacio | Artefactos opcionales, tamaños visibles, eliminación independiente |
| Presión de memoria | Cierre de la app o pérdida del borrador | Contextos cortos, ciclo de vida del proyector, liberar buffers, matriz de dispositivos |
| Inferencia lenta | Captura más lenta que el formulario | Límites cortos, cuantización fijada, streaming y fallback manual |
| Calidad desigual por idioma/acento | Montos o fechas incorrectos | Corpus multilingüe, métricas por campo y revisión obligatoria |
| Alucinación del LLM | Clasificación financiera incorrecta | JSON restringido, catálogo cerrado, validación y confirmación |
| El modelo visual selecciona el total incorrecto | Registro de monto erróneo | Mostrar evidencia/candidatos y exigir confirmación del total |
| Chat inventa cifras | Pérdida de confianza | Cálculo SQL determinista, herramientas tipadas y cifras fuente visibles |
| El proyector no procesa audio en un backend objetivo | Voz no disponible | Comprobación de capacidad al instalar y degradación al formulario manual |
| Modelo o licencia cambia | Riesgo legal o incompatibilidad | Artefactos fijados, manifiesto, revisión de licencia y hashes |
| Fragmentación Android | Aceleración impredecible | CPU baseline, perfiles medidos y degradación clara |
| Una regresión del modelo afecta voz, imagen y chat | Fallos transversales | Versión fijada, corpus por capacidad, rollback del artefacto y tools desacopladas |
| Prompt injection en voz/imagen/datos | Uso indebido de herramientas | Datos delimitados, allowlist, solo lectura y argumentos validados |

## Decisiones abiertas

1. ¿Es aceptable una descarga obligatoria de aproximadamente 3.61 GB para habilitar voz e imagen?
2. ¿Qué dispositivos y cantidad de RAM forman el mínimo soportado por Gemma 4?
3. ¿Los artefactos se incluyen en la app o se descargan tras una acción explícita?
4. ¿Gemma 4 alcanza la exactitud mínima desde audio directo en los tres idiomas?
5. ¿La licencia Apache 2.0 y los avisos de los artefactos permiten la distribución prevista?
6. ¿Cuál es la latencia máxima aceptable desde detener la grabación hasta mostrar el borrador?
7. ¿Qué presupuesto visual alcanza calidad suficiente con recibos en los tres idiomas?
8. ¿Qué conjunto cerrado de preguntas admitirá el primer chat financiero?
9. ¿Se ofrecerá MTP en dispositivos compatibles o se mantendrá fuera de la primera versión?
10. ¿Cómo se distribuirán actualizaciones de Gemma sin introducir telemetría financiera?

## Recomendación final

Proceder con un spike offline antes de construir la experiencia completa. La arquitectura seleccionada
es **Gemma 4 E2B-it QAT como único modelo, `mmproj-F16` para audio e imagen y tools locales
controladas**:

```text
MVP de voz: audio -> Gemma 4 + mmproj -> borrador validado
Fase imagen: imagen -> Gemma 4 + mmproj -> borrador validado
Fase chat: texto -> Gemma 4 -> tools SQLite de solo lectura
```

Esta estrategia reutiliza el mismo modelo y mantiene las operaciones sensibles detrás de tools tipadas.
El spike comienza con `UD-Q4_K_XL`, su proyector `mmproj-F16` y MTP desactivado. MTP se activa
únicamente si mejora la latencia textual sin comprometer estabilidad o memoria.

El primer objetivo no debe ser chat ni imagen: debe ser demostrar en dispositivos físicos que Gemma
recibe una frase grabada, produce JSON restringido, se valida contra SQLite y llega a un borrador
editable sin realizar ninguna solicitud de red. Si ese flujo cumple calidad y rendimiento, la misma
base de modelo, proyector, tools y validación permite añadir imagen y chat sin abandonar la promesa
local-first de Cash IO.

## Referencias

- Hugging Face, `LLM Inference on Edge`: <https://huggingface.co/blog/llm-inference-on-edge>
- Repositorio del ejemplo EdgeLLM: <https://github.com/MekkCyber/EdgeLLM>
- `llama.rn`: <https://github.com/mybigday/llama.rn>
- `llama.cpp`: <https://github.com/ggml-org/llama.cpp>
- Gemma 4 E2B-it QAT GGUF de Unsloth: <https://huggingface.co/unsloth/gemma-4-E2B-it-qat-GGUF>
- Checkpoint QAT de origen de Google: <https://huggingface.co/google/gemma-4-E2B-it-qat-q4_0-unquantized>
- Expo Audio: <https://docs.expo.dev/versions/latest/sdk/audio/>
- Documentos del proyecto: `README.md`, `PRODUCT.md`, `ARCHITECTURE.md`, `DESIGN.md`.

Las APIs, backends, modelos, formatos, licencias y requisitos de hardware cambian. Deben fijarse por
versión y volver a evaluarse antes de cada lanzamiento.
