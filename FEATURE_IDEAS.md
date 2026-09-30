# Ideas de próximas características para Cash IO

## Propósito del documento

Este documento propone una evolución de producto basada en las capacidades reales de Cash IO y en necesidades generales de finanzas personales. Prioriza características que reutilizan los datos conservados por la aplicación y mantienen su promesa de privacidad, funcionamiento sin conexión y control del usuario.

Fecha del análisis: 2026-09-24.

## Punto de partida

Cash IO ya permite:

- Registrar ingresos, gastos y transferencias con fecha, cuenta, categoría, descripción y etiquetas.
- Administrar varias cuentas y sus saldos iniciales.
- Consultar balances y resúmenes mensuales.
- Crear presupuestos mensuales por cuenta y categoría.
- Revisar gráficos por categoría y tendencias anuales.
- Buscar y filtrar movimientos.
- Programar eventos financieros únicos o recurrentes con notificaciones.
- Exportar rangos mensuales en CSV.
- Realizar copias opcionales en Google Drive o iCloud.
- Trabajar localmente en SQLite, sin una cuenta de Cash IO ni un servidor obligatorio.

El activo estratégico de la aplicación no es solamente cada transacción, sino la serie histórica privada que se forma al usarla. Con seis, doce o más meses se pueden detectar patrones personales que una aplicación nueva o una calculadora genérica no conocen.

## Dirección recomendada

La evolución más coherente es llevar Cash IO de **registro mensual** a **asistente de planificación local**:

1. Asegurar que los datos sean fáciles de corregir y suficientemente expresivos.
2. Reducir el trabajo repetitivo de registrar y presupuestar.
3. Usar el historial para producir referencias personales, pronósticos y alertas explicables.
4. Adaptarse a monedas, formatos, ciclos de ingreso y preferencias regionales configurables sin asociarlas automáticamente al idioma.

No se necesita inteligencia artificial remota para la mayoría de estas ideas. Medianas, promedios, tendencias, reglas de recurrencia y proyecciones pueden calcularse en el dispositivo con SQLite y TypeScript.

## Propuesta principal: Resumen de 12 meses

Cuando exista suficiente historial, Cash IO podría mostrar un **Resumen de 12 meses** privado y generado en el dispositivo. No debería desbloquearse estrictamente al cumplir 365 días, sino al contar con cobertura suficiente, por ejemplo:

- Movimientos en al menos 10 de los últimos 12 meses.
- Un mínimo de transacciones que no sean transferencias.
- Categorías utilizadas de forma suficientemente consistente.
- Una advertencia visible cuando existan meses incompletos.

### Contenido sugerido

- Ingresos, gastos y flujo neto del periodo.
- Tasa de ahorro observada, excluyendo transferencias.
- Gasto mensual típico usando la mediana.
- Meses con mayor y menor gasto y las categorías que explican la diferencia.
- Evolución por categoría frente al periodo anterior.
- Variabilidad de ingresos.
- Gastos esenciales frente a flexibles, si el usuario clasifica sus categorías.
- Frecuencia y valor de gastos recurrentes detectados.
- Cumplimiento y desviación de presupuestos.
- Saldo acumulado por cuenta.
- Concentración de gasto en las categorías principales.

El resumen debe terminar en acciones que el usuario pueda aceptar o ignorar:

- Crear el presupuesto del próximo mes con el gasto típico por categoría.
- Crear una meta de fondo de emergencia.
- Añadir al calendario un compromiso recurrente detectado.
- Revisar una categoría con una variación inusual.
- Prepararse para meses históricamente más costosos.

Cada conclusión debe explicar su cálculo, periodo y exclusiones. No conviene usar diagnósticos opacos ni lenguaje que sugiera asesoría financiera profesional.

## Características prioritarias

### 1. Editar y duplicar transacciones

**Problema:** una corrección requiere eliminar y volver a registrar el movimiento. Esto introduce fricción y reduce la calidad del historial que alimentará presupuestos, gráficos y análisis futuros.

**Alcance:**

- Editar ingresos y gastos existentes.
- Editar ambos lados de una transferencia como una sola operación lógica.
- Cambiar fecha, cuenta, tipo, monto, categoría, descripción y etiquetas.
- Convertir un movimiento normal en transferencia y una transferencia en movimiento normal.
- Duplicar un movimiento como borrador revisable.
- Usar la fecha actual al duplicar y conservar el resto de los datos.
- Recalcular los resúmenes de todos los meses y cuentas afectados.

**Fuera de alcance:**

- Conciliación de cuentas o extractos.
- Detección automática de movimientos duplicados.
- Edición masiva.
- Historial de versiones.
- Guardado automático del duplicado.

**Valor:** alto y transversal. Es un prerrequisito de calidad de datos para cualquier pronóstico o resumen anual.

### 2. Moneda principal y formatos regionales

- Elegir una moneda principal sin inferirla del idioma.
- Formatear valores usando el locale y la moneda configurados.
- Conservar inicialmente una sola moneda por instalación.
- Diseñar una evolución hacia moneda por cuenta solo si existe demanda real.

### 3. Plantillas y movimientos recurrentes confirmables

- Convertir un evento del calendario en borrador de transacción.
- Crear una plantilla desde una transacción existente.
- Notificar en la fecha prevista y abrir un borrador editable.
- Nunca guardar automáticamente sin confirmación.
- Permitir importes fijos o por completar.
- Soportar ciclos semanales, dos veces al mes, mensuales y anuales.

### 4. Presupuesto sugerido por historial

- Sugerir por categoría la mediana de los últimos tres o seis meses.
- Mostrar rango habitual y último presupuesto.
- Ajustar por estacionalidad cuando exista al menos un año de datos.
- Permitir una estrategia conservadora, típica o de reducción porcentual.
- Excluir transferencias y mostrar categorías con pocos datos.

### 5. Flujo de caja futuro

- Combinar saldo actual, eventos futuros y movimientos recurrentes confirmados.
- Proyectar el saldo diario durante 30, 60 o 90 días.
- Alertar localmente sobre un posible saldo negativo.
- Permitir escenarios hipotéticos.
- Diferenciar claramente registros reales de valores proyectados.
- Permitir periodos de planificación mensuales, semanales o personalizados.

### 6. Detección local de compromisos y anomalías

- Detectar movimientos similares por descripción, categoría, monto y periodicidad.
- Sugerir convertirlos en eventos o plantillas.
- Avisar de incrementos fuertes o posibles cobros repetidos.
- Detectar suscripciones sin depender de una lista comercial externa.
- Permitir descartar una sugerencia.

### 7. Metas y fondos separados

- Metas con importe objetivo, fecha y cuenta asociada.
- Aportes manuales o identificados mediante una categoría o etiqueta.
- Ritmo requerido según el ciclo elegido por el usuario.
- Fecha estimada basada en el ritmo real de ahorro.
- Fondo de emergencia calculado con el gasto esencial típico.

### 8. Tarjetas de crédito, cuotas y deudas

- Tipo de cuenta de crédito con límite, fecha de corte y fecha de pago.
- Compra con número de cuotas, tasa opcional y plan esperado.
- Resumen del próximo pago y calendario de cuotas.
- Diferenciar el pago de la tarjeta de un gasto nuevo.
- Simular estrategias de pago de deuda de forma explicable.

### 9. Importación CSV y revisión asistida

- Importador genérico con mapeo de columnas, formato de fecha y separadores.
- Perfiles reutilizables para formatos frecuentes del usuario.
- Vista previa y detección de duplicados antes de guardar.
- Reglas locales de categorización.
- Lotes revisables y reversibles.

No se recomienda comenzar con lectura de SMS, correo o notificaciones bancarias debido a los permisos, la fragilidad y los riesgos de privacidad.

### 10. Cierre mensual guiado

- Revisar movimientos con datos incompletos.
- Explicar desviaciones frente al presupuesto.
- Confirmar compromisos del mes siguiente.
- Guardar una nota privada de contexto para meses atípicos.

## Otras ideas con buen encaje

### Periodos de planificación flexibles

- Presupuestos mensuales, semanales o divididos por fechas configurables.
- Asignación de obligaciones a ingresos esperados.
- Indicador de dinero disponible hasta el siguiente ingreso.
- Compatibilidad con ingresos regulares e irregulares.

### Ingresos estacionales o extraordinarios

- Plantillas opcionales para bonificaciones, comisiones, devoluciones u otros ingresos no recurrentes.
- Fechas e importes definidos por el usuario.
- Distribución opcional entre deuda, ahorro y gasto.
- Separación del presupuesto ordinario.

### Organizador anual de registros

- Etiquetas configurables para conceptos relevantes para el usuario.
- Resumen anual de cuentas, ingresos, gastos y documentos pendientes.
- Exportación para revisión personal o profesional.
- Recordatorios configurables.

Cash IO debe organizar registros, no determinar obligaciones legales, laborales, contables o tributarias.

### Ajuste por inflación como contexto

- Comparar gasto nominal y ajustado mediante una serie elegida por el usuario.
- Mostrar fuente y fecha de actualización.
- Diferenciar variación personal e inflación general.

Esta función requiere una fuente externa mantenida y no debe bloquear las comparaciones locales.

### Efectivo, billeteras y fondos

- Tipos de cuenta descriptivos: efectivo, ahorro, corriente, billetera, fondo y crédito.
- Transferencias rápidas sin contarlas como ingreso o gasto.
- Fondos representados como cuentas o metas, evitando balances duplicados.

### Salud financiera explicable

- Meses de cobertura del fondo de emergencia.
- Porcentaje de meses con flujo neto positivo.
- Peso de compromisos recurrentes sobre ingresos típicos.
- Variabilidad de ingresos y gastos.
- Avance de metas y deuda.

Debe mostrar hechos y tendencias, no una puntuación moralizante u opaca.

### Clasificación de categorías

- Esencial o flexible.
- Fija o variable.
- Personal, hogar, proyecto u otra dimensión configurable.

### Reglas automáticas locales

- Reglas por texto, cuenta, rango de importe o periodicidad.
- Aplicación durante una importación o al confirmar una transacción.
- Vista previa y posibilidad de deshacer.
- Prioridad visible cuando coincidan varias reglas.

### Compartir sin una cuenta conjunta

- Exportar un presupuesto o reporte sin sincronizar toda la base.
- Importar movimientos compartidos con revisión de duplicados.
- Ocultar cuentas, categorías o descripciones privadas.

La sincronización multiusuario en tiempo real no debería ser temprana: exige identidad, resolución de conflictos, cifrado y servidor.

## Plan de implementación: editar y duplicar transacciones

### Dominio y persistencia

- Definir un `EditableTransaction` que represente un movimiento normal o una transferencia completa.
- Resolver cualquiera de los dos IDs de una transferencia hacia el mismo borrador lógico.
- Compartir validación entre creación y edición.
- Ejecutar la edición dentro de una transacción SQLite.
- Mantener la fila de origen al transformar operaciones y crear o eliminar el lado receptor cuando corresponda.
- Sincronizar etiquetas en todas las filas de una transferencia.
- Recalcular cada combinación original y nueva de cuenta y mes.
- No añadir una migración de base de datos porque el esquema actual ya contiene los campos necesarios.

### Interfaz

- Una pulsación sobre un movimiento abre una hoja de acciones.
- Una pulsación prolongada conserva la selección múltiple para eliminar.
- La hoja muestra un resumen financiero y las acciones `Editar` y `Duplicar`.
- Editar abre un formulario precargado.
- Duplicar abre un nuevo borrador con la fecha actual.
- Ninguna duplicación se guarda sin confirmación explícita.
- Los estados de carga, error y movimiento no encontrado deben ser visibles y accesibles.

### Internacionalización y accesibilidad

- Mantener textos equivalentes en inglés, español y portugués de Brasil.
- Proporcionar roles, nombres y estados accesibles a las acciones.
- Mantener objetivos táctiles de al menos 44 puntos en iOS y 48 dp en Android.
- No comunicar tipo o estado únicamente mediante color.

### Pruebas

- Lectura de movimientos normales y transferencias.
- Edición dentro del mismo mes.
- Cambio de fecha, cuenta y mes.
- Conversión entre movimiento normal y transferencia.
- Sincronización de etiquetas.
- Rechazo de fechas, cuentas, categorías y transferencias inválidas.
- Precarga del formulario.
- Navegación hacia edición y duplicación.
- Fecha actual en el duplicado.
- Regresión de selección y eliminación múltiple.

### Criterios de aceptación

- Todo movimiento visible puede editarse o duplicarse.
- Editar no crea una operación adicional.
- Duplicar no escribe datos antes de confirmar.
- Ambos lados de una transferencia permanecen sincronizados.
- No puede quedar una transferencia incompleta.
- Los resúmenes afectados se actualizan correctamente.
- El flujo continúa funcionando completamente sin conexión.
- No se envían datos financieros fuera del dispositivo.

## Priorización sugerida

| Prioridad | Característica | Valor | Esfuerzo estimado | Dependencias principales |
| --- | --- | --- | --- | --- |
| P0 | Editar y duplicar transacciones | Muy alto | Medio | Validaciones y recálculo de resúmenes |
| P0 | Moneda principal | Alto | Medio | Ajustes y formato común |
| P0 | Calendario a borrador recurrente | Muy alto | Medio | Integrar eventos y formulario |
| P1 | Presupuesto sugerido por historial | Alto | Medio | Consultas de medianas y cobertura |
| P1 | Cierre mensual guiado | Alto | Medio | Reglas de revisión |
| P1 | Metas y fondos | Alto | Medio | Nuevo modelo de datos |
| P1 | Periodos de planificación flexibles | Alto | Medio | Periodos presupuestarios configurables |
| P2 | Resumen de 12 meses | Muy alto con retención | Medio-alto | Calidad y clasificación de datos |
| P2 | Compromisos y anomalías locales | Alto | Medio-alto | Motor de similitud explicable |
| P2 | Flujo de caja futuro | Muy alto | Alto | Recurrencias y saldo confiable |
| P2 | Importación CSV configurable | Alto | Alto | Lotes, deduplicación y deshacer |
| P2 | Tarjetas, cuotas y deudas | Alto | Alto | Modelo de crédito separado |
| P3 | Organizador anual | Medio | Alto | Taxonomía, exportación y mantenimiento |
| P3 | Comparación con inflación | Medio | Medio-alto | Fuente externa y actualización |
| P3 | Sincronización compartida | Variable | Muy alto | Backend, identidad y conflictos |

## Secuencia de entrega recomendada

### Fase 1: confianza en los datos

- Edición y duplicación de transacciones.
- Moneda principal.
- Clasificación opcional de categorías.

### Fase 2: menos trabajo repetitivo

- Eventos del calendario convertibles en borradores.
- Plantillas de transacción.
- Presupuesto sugerido por historial.
- Reglas locales de categorización.
- Cierre mensual guiado.

### Fase 3: planificación personal

- Metas y fondo de emergencia.
- Periodos de planificación flexibles.
- Flujo de caja proyectado.
- Tarjetas de crédito y cuotas.

### Fase 4: valor del historial largo

- Resumen de 12 meses.
- Estacionalidad y comparación interanual.
- Detección de anomalías y compromisos.
- Organizador anual exportable.

## Principios y límites

- Mantener cálculos e historial en el dispositivo siempre que sea posible.
- No convertir automáticamente predicciones en transacciones reales.
- Explicar cada métrica con periodo, fórmula y datos excluidos.
- Usar medianas y rangos para evitar conclusiones dominadas por meses atípicos.
- Distinguir datos observados, datos ingresados y proyecciones.
- No inferir moneda, residencia, relación laboral o ciclo de pago a partir del idioma.
- No presentar recordatorios o resúmenes como asesoría profesional.
- Diseñar importaciones como procesos revisables y reversibles.
- Evitar que funciones opcionales con red degraden el flujo manual sin conexión.
- Preservar exportación y portabilidad de cualquier dato nuevo.

## Recomendación final

La primera apuesta debe ser **edición y duplicación de transacciones**, seguida por **moneda principal** y **movimientos recurrentes confirmables**. Estas capacidades mejoran el uso diario y elevan la calidad del historial.

Después, Cash IO puede diferenciarse con presupuestos sugeridos, planificación flexible y un Resumen de 12 meses completamente local. Esta ruta aprovecha la naturaleza actual del producto y produce valor creciente sin depender tempranamente de integraciones bancarias, servidores o modelos de IA.
