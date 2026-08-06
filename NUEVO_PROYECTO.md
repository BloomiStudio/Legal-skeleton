# Cómo clonar este esqueleto para un despacho nuevo

Esta guía es para cualquier persona — o cualquier sesión de Claude Code sin
contexto previo — que necesite levantar la plataforma para un cliente nuevo
a partir de este repo base. Sigue los pasos en orden; cada uno asume que el
anterior ya quedó listo.

## 0. Qué es este repo y qué no

Este es el **esqueleto**: esquema de Supabase completo (tablas, RLS,
triggers de auditoría, Edge Functions) más un frontend mínimo (login +
panel) que prueba que la conexión funciona de punta a punta. Los módulos
de negocio completos (clientes, expedientes, documentos, generación con
IA, etc.) NO están en este repo — viven en
[Legal_demov1](https://github.com/BloomiStudio/Legal_demov1), que es donde
se construyeron y probaron por primera vez. Para un cliente real, lo más
rápido normalmente es partir de ese repo demo (ya tiene todo el frontend
construido) y sólo ajustar branding/contenido, no reconstruir desde cero
sobre este esqueleto. Usa este esqueleto cuando el cliente necesite algo
sustancialmente distinto al giro de notaría, o cuando quieras partir de
cero a propósito.

## 1. Clona el repo y crea el nuevo remoto

```bash
git clone https://github.com/BloomiStudio/Legal-skeleton.git nombre-del-cliente
cd nombre-del-cliente
rm -rf .git && git init -b main
gh repo create BloomiStudio/nombre-del-cliente --private --source=. --remote=origin
```

(Ajusta el nombre del repo al cliente real. Si el repo ya existe, sólo
agrega el remoto con `git remote add origin <url>`.)

## 2. Crea el proyecto de Supabase del cliente

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New
   project**. Nombre sugerido: `<cliente>-legal`. Elige una región cercana
   (ej. `us-east-1`). Guarda la contraseña de la base de datos en un
   gestor de contraseñas — no se vuelve a mostrar.
2. Espera ~2 minutos a que aprovisione.
3. En **Project Settings → API**, copia:
   - Project URL
   - `anon` `public` key
   - `service_role` key (secreta — nunca va al frontend ni se commitea)
4. En **Project Settings → Database → Connection string**, copia la
   variante URI (Session o Transaction pooler, cualquiera sirve) para
   aplicar migraciones con `psql`.

## 3. Aplica las migraciones

Con el Supabase CLI instalado (`brew install supabase/tap/supabase`) y
`psql` disponible (`brew install libpq` si no lo tienes):

```bash
for f in supabase/migrations/*.sql; do
  psql "<CONNECTION_STRING>" -f "$f" || break
done
```

Corre los archivos **en orden** (el nombre ya está numerado para eso). Si
alguno falla, detente y revisa el error antes de seguir — no continúes con
el resto si uno no aplicó limpio.

Alternativa sin CLI: copia y pega el contenido de cada archivo, en orden,
en el **SQL Editor** del dashboard del proyecto.

## 4. Configura los secretos de las Edge Functions

Sólo falta uno manual (los demás — `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — los inyecta Supabase
automáticamente):

- **Dashboard** → Edge Functions → Secrets → agrega `ANTHROPIC_API_KEY`
  con una llave de [console.anthropic.com](https://console.anthropic.com).
- O por CLI: `supabase login` (login interactivo, una vez por máquina) →
  `supabase link --project-ref <ref>` → `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`.

## 5. Despliega las Edge Functions

```bash
supabase functions deploy generate-document
supabase functions deploy approve-document
supabase functions deploy transcribe-ocr
supabase functions deploy check-deadlines --no-verify-jwt
supabase functions deploy check-case-requirements --no-verify-jwt
supabase functions deploy propose-requirements
supabase functions deploy check-sanctions-list
```

`check-deadlines` y `check-case-requirements` están pensadas para
dispararse por **Cron Jobs de Supabase** (Edge Functions → tu función →
Cron), no por un usuario — configúralas ahí con una frecuencia diaria.

## 6. Registra al primer usuario (queda como administrador)

1. Copia `.env.example` a `.env` y llena `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_ANON_KEY` con los del paso 2.
2. `npm install && npm run dev`, abre `/login`, pestaña "Crear cuenta".
3. El primer registro crea automáticamente la organización y un
   departamento "General", y ese usuario queda como administrador general
   (ver `handle_new_user` en
   `supabase/migrations/20260805100100_organizations_profiles.sql`).
4. Renombra la organización y el departamento inicial desde
   Administración una vez que tengas el frontend completo conectado (ver
   paso 8).

## 7. Configura la estructura real del cliente

Ya con el primer admin:

- Crea los departamentos reales del despacho (Administración >
  Departamentos).
- Registra al resto del personal (que se registren ellos, o se les da de
  alta) y asígnales rol, departamento, `document_permission`,
  `can_comment` y `case_visibility_scope` desde Administración > Usuarios.
- Da de alta los tipos de acto que aplican a este cliente en
  `act_types` (ya viene una lista base para notaría — bórrala o
  ajústala si el giro es distinto, ej. despacho jurídico o correduría).
- Sube plantillas + ejemplos por tipo de acto y genera/aprueba el
  checklist de requisitos con IA (Administración > Plantillas y
  requisitos) — esto requiere el frontend completo del demo, no está en
  este esqueleto todavía.

## 8. Trae el frontend completo (si este cliente lo necesita)

Si vas a partir del esqueleto en vez del demo: construye los módulos de
`src/` que falten (clientes, expedientes, documentos, etc.) siguiendo el
mismo patrón que ya está en `Legal_demov1` — ese repo es la referencia de
implementación. Si Eduardo va a personalizar el frontend en Lovable,
conecta ese repo a Lovable vía GitHub ahora, antes de invertir tiempo en
pulir la UI aquí en Claude Code.

## 9. Desactiva módulos que no aplican a este cliente

- **Despacho jurídico**: no necesita PLD. La función `check-sanctions-list`
  puede quedarse sin usar (no hace daño) o eliminarse junto con su
  entrada en `supabase/config.toml`.
- **Corredurías**: revisa si `act_types` necesita ajustarse a los actos
  que corresponden (no son los mismos que notaría).
- En general: es más seguro dejar una tabla/función sin usar que borrarla
  a medias — si algo no aplica, primero confirma que ningún flujo restante
  depende de ella antes de eliminarla.

## 10. Despliega el frontend en Vercel

```bash
vercel link   # conecta esta carpeta a un proyecto de Vercel
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```

Repite `vercel env add` para los ambientes `preview`/`development` si
quieres previews automáticos por pull request (recomendado — ya viene
soportado por Vercel de forma nativa por rama).

## 11. Checklist final antes de entregar

- [ ] Los 4 roles (`administrador`, `notario`, `abogado`, `asistente`)
      tienen al menos un usuario de prueba.
- [ ] Un usuario no-admin **no puede** ver expedientes fuera de su
      `case_visibility_scope`.
- [ ] Un usuario sin `document_permission >= create` **no puede** generar
      documentos con IA (el botón debe verse deshabilitado, y aunque se
      fuerce la llamada a la Edge Function, debe regresar 403).
- [ ] `audit_log` está registrando las acciones de los pasos anteriores.
- [ ] Las Edge Functions responden (pruébalas con `curl` o desde la UI)
      y `ANTHROPIC_API_KEY` está configurada.
- [ ] El dominio de producción en Vercel apunta al proyecto correcto de
      Supabase (revisa `.env` / variables de entorno de Vercel).
