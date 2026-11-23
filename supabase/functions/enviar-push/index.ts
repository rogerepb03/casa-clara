// =====================================================================
//  Edge Function "enviar-push" — Casa Clara
//  Se dispara cada vez que se inserta una fila en public.notificaciones
//  (Database Webhook) y envía el push a todos los teléfonos del usuario
//  usando Firebase Cloud Messaging (API HTTP v1).
//
//  SECRETOS que debes cargar en Supabase → Edge Functions → Secrets:
//   FIREBASE_SERVICE_ACCOUNT  → el JSON completo de la cuenta de servicio de Firebase
//   WEBHOOK_SECRET            → una clave larga inventada por ti (la misma va en el webhook)
//  (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen cargados por Supabase)
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { JWT } from "npm:google-auth-library@9";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const cuenta = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT")!);

async function tokenGoogle(): Promise<string> {
  const jwt = new JWT({
    email: cuenta.client_email,
    key: cuenta.private_key,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const { access_token } = await jwt.authorize();
  return access_token!;
}

Deno.serve(async (req) => {
  // 1. Solo aceptamos llamadas de nuestro propio webhook
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("No autorizado", { status: 401 });
  }

  const { record } = await req.json(); // la notificación recién creada
  if (!record?.user_id) return new Response("Sin destinatario", { status: 400 });

  // 2. Teléfonos registrados del usuario
  const { data: dispositivos } = await supabase
    .from("dispositivos").select("id, token_fcm").eq("user_id", record.user_id);
  if (!dispositivos?.length) return new Response("Usuario sin dispositivos", { status: 200 });

  // 3. Enviar a cada teléfono
  const accessToken = await tokenGoogle();
  const url = `https://fcm.googleapis.com/v1/projects/${cuenta.project_id}/messages:send`;
  let enviados = 0;

  for (const d of dispositivos) {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token: d.token_fcm,
          notification: { title: record.titulo, body: record.cuerpo ?? "" },
          data: { tipo: record.tipo, ref_tabla: record.ref_tabla ?? "", ref_id: record.ref_id ?? "" },
          apns: { payload: { aps: { sound: "default" } } },
        },
      }),
    });
    if (r.ok) enviados++;
    // Token vencido o app desinstalada → lo borramos
    else if (r.status === 404 || r.status === 400) {
      await supabase.from("dispositivos").delete().eq("id", d.id);
    }
  }

  // 4. Marcar como enviada
  await supabase.from("notificaciones")
    .update({ enviada_push_en: new Date().toISOString() }).eq("id", record.id);

  return new Response(JSON.stringify({ enviados }), { headers: { "Content-Type": "application/json" } });
});
