# Casa Clara — archivos de arranque

## Qué hay aquí

| Archivo | Para qué |
| --- | --- |
| `schema.sql` | Crea toda la base de datos en Supabase: 20 tablas, seguridad por rol (RLS), historial, vistas para el dashboard, carpeta de archivos y tareas automáticas diarias |
| `enviar-push/index.ts` | Función de Supabase que envía las notificaciones push a los teléfonos (Firebase) |

---

## Paso 1 — Base de datos (día 1, 10 minutos)

1. Entra a https://supabase.com → **New project** → nombre `casa-clara`, región **South America (São Paulo)**, guarda la contraseña de la base en un lugar seguro.
2. Menú izquierdo → **SQL Editor** → **New query** → pega todo `schema.sql` → **Run**.
3. Si la última parte (pg_cron) da error: **Database → Extensions** → busca `pg_cron` → activar → vuelve a correr solo las 3 últimas líneas del archivo.
4. Revisa en **Table Editor** que aparezcan las tablas (`propiedades`, `movimientos`, etc.).

## Paso 2 — Conectar FlutterFlow (día 1)

1. Supabase → **Project Settings → API**: copia la **Project URL** y la **anon public key**.
   - ⚠️ Nunca uses la **service_role key** en FlutterFlow. Esa llave salta toda la seguridad.
2. FlutterFlow → **Settings → Integrations → Supabase** → pega URL y anon key → **Get Schema**.
3. FlutterFlow → **Settings → Authentication** → tipo **Supabase**.

## Paso 3 — Primer uso (día 2)

1. Regístrate en tu app (pantalla de login).
2. Crea tu familia: en FlutterFlow, en el botón "Crear", agrega la acción **Supabase → Call RPC → `crear_espacio`** con el parámetro `p_nombre`.
3. Guarda el `id` que devuelve en el **App State** (`espacioActual`). Todas las consultas filtran por ese espacio.

Funciones (RPC) disponibles para usar desde FlutterFlow:

| Función | Parámetros | Qué hace |
| --- | --- | --- |
| `crear_espacio` | `p_nombre` | Crea la familia; quien la crea queda como administrador. Agrega 17 categorías por defecto |
| `invitar_miembro` | `p_espacio`, `p_email`, `p_rol`, `p_persona` (opcional) | Invita a un familiar, propietario, arrendatario o invitado. Al registrarse con ese correo queda enlazado |
| `marcar_pagado` | `p_movimiento`, `p_medio` (opcional) | Marca un cobro como pagado y, si es cuota de deuda, baja el saldo |

Vistas para el dashboard (se consultan como tablas): `v_indicadores`, `v_resumen_mensual`, `v_gastos_por_categoria`, `v_resultado_propiedad`, `v_proximos_vencimientos`, `v_presupuesto_vs_real`.

Rutas de archivos en Storage (bucket `archivos`): siempre `{espacio_id}/{carpeta}/{nombre}`, por ejemplo `7b1c…/propiedades/3fa2…/contrato.pdf`. Después de subir, crea la fila en `documentos` con esa misma ruta.

## Paso 4 — Notificaciones push (semana 4)

1. **Firebase**: https://console.firebase.google.com → crear proyecto → agregar apps Android e iOS con el mismo Bundle ID / package name de FlutterFlow.
2. En FlutterFlow → **Settings → Push Notifications** → activar y seguir el asistente (guarda el token del teléfono). Haz que al iniciar sesión se inserte el token en la tabla `dispositivos` (`token_fcm`, `plataforma`).
3. iPhone: en developer.apple.com crea una **APNs Key (.p8)** y súbela a Firebase → Project Settings → Cloud Messaging.
4. Firebase → Project Settings → **Service accounts** → **Generate new private key** → se descarga un JSON.
5. Supabase → **Edge Functions → Deploy a new function → Via Editor** → nombre `enviar-push` → pega `enviar-push/index.ts` → Deploy. Deja activada la opción **Verify JWT**: el webhook de Supabase envía su propia autorización y además la función revisa el `WEBHOOK_SECRET`.
6. Supabase → **Edge Functions → Secrets**:
   - `FIREBASE_SERVICE_ACCOUNT` = el contenido completo del JSON del paso 4
   - `WEBHOOK_SECRET` = una clave larga inventada por ti
7. Supabase → **Database → Webhooks → Create** → tabla `notificaciones`, evento **Insert**, tipo **Supabase Edge Function** → `enviar-push` → en **HTTP Headers** agrega `x-webhook-secret` con la misma clave del paso 6.
8. Prueba: en SQL Editor ejecuta
   ```sql
   insert into notificaciones (user_id, tipo, titulo, cuerpo, clave)
   values ('<tu user id>', 'prueba', 'Hola', 'Push de prueba', 'prueba-1');
   ```
   Debe llegar el aviso a tu teléfono.

## Tareas automáticas (ya programadas por `schema.sql`)

| Tarea | Cuándo | Qué hace |
| --- | --- | --- |
| `alertas-diarias` | Todos los días 08:00 Chile (11:00 UTC) | Marca atrasados, avisa pagos a 3 días / hoy / atrasados, contratos a 60 y 30 días, documentos a 30 días, mantenciones de mañana y recordatorios |
| `movimientos-del-mes` | Día 1 de cada mes | Crea los cobros de arriendo de contratos vigentes y los cargos recurrentes en estado "pendiente" |

> En invierno Chile usa UTC-4: las alertas llegarán a las 07:00. Para cambiar la hora: `select cron.schedule('alertas-diarias', '0 12 * * *', $$select public.generar_alertas()$$);`

## Reglas de oro

- Toda regla importante (permisos, cálculos, alertas) va en Supabase, no en las pantallas. Así la migración a Flutter puro solo cambia la interfaz.
- Antes de un cambio grande, pruébalo en un segundo proyecto de Supabase.
- Exporta un respaldo propio una vez al mes (Database → Backups, o `pg_dump`).
