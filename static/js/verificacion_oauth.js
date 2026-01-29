const SUPABASE_URL = "https://ndsyaetglshulaqadvzl.supabase.co";
const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kc3lhZXRnbHNodWxhcWFkdnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Mzk0NzEsImV4cCI6MjA4MDAxNTQ3MX0.Z2URIwgvLfpV6fdOv_fgIS-X-es2Zvlwq7QnB1Oo0Js";

// URL de tu backend FastAPI
const API_BASE = window.location.origin;




// No dependemos del auto-detect; lo haremos a mano
const supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY,
{
  auth: { detectSessionInUrl: false },
}
);

const statusMain   = document.getElementById("status-main");
const statusDetail = document.getElementById("status-detail");
const hintEl       = document.getElementById("hint");
const btnVolver    = document.getElementById("btn-volver");

(async () => {
  try {
    // 0) Parsear el hash de la URL: #access_token=...&refresh_token=...
    const hash = window.location.hash.startsWith("#")
    ? window.location.hash.substring(1)
    : window.location.hash;
    const params = new URLSearchParams(hash);

    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token"); // por si quieres usarlo luego

    console.log("URL actual:", window.location.href);
    console.log("Fragmento parseado:", Object.fromEntries(params.entries()));

    if (!accessToken) {
      statusMain.textContent   = "No se encontró el token de acceso.";
      statusDetail.textContent = "Vuelve a iniciar sesión con Google desde la página de inscripción.";
      hintEl.textContent       = "Te redirigiremos a inscripción.";
      btnVolver.style.display  = "inline-block";

      setTimeout(() => {
        window.location.href = "/static/inscripcion.html";
      }, 4500);
      return;
    }

    statusMain.textContent   = "Verificando tu inicio de sesión con Google…";
    statusDetail.textContent = "Obteniendo tus datos desde Supabase.";

    // 1) Pedir el usuario usando explícitamente el access_token
    const { data, error } = await supabaseClient.auth.getUser(accessToken);
    console.log("Resultado getUser(accessToken):", { data, error });

    if (error || !data?.user) {
      console.error("Error en getUser OAuth:", error);
      statusMain.textContent   = "No pudimos confirmar tu inicio de sesión.";
      statusDetail.textContent = "El enlace puede haber expirado o no es válido. Vuelve a iniciar sesión con Google.";
      hintEl.textContent       = "Te redirigiremos a la página de inscripción.";
      btnVolver.style.display  = "inline-block";

      setTimeout(() => {
        window.location.href = "/static/inscripcion.html";
      }, 4500);
      return;
    }

    const user     = data.user;
    const email    = user.email;
    const provider = user.app_metadata?.provider || "google";
    const auth_id  = user.id;

    console.log("Datos del usuario de Google:", { email, provider, auth_id });

    statusMain.textContent   = "Cuenta de Google verificada.";
    statusDetail.textContent = "Registrando tu usuario en ContractRed…";

    // 2) Registrar/actualizar en tu tabla 'usuarios' vía backend
    const res = await fetch(API_BASE + "/registrar_oauth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, provider, auth_id }),
    });

    const json = await res.json().catch(() => ({}));
    console.log("Respuesta /registrar_oauth (oauth):", json);

    // 🟣 CASO ESPECIAL: el correo ya estaba registrado CON CONTRASEÑA
    if (json && json.ya_existia && json.motivo === "registrado_con_contrasena") {
      statusMain.textContent   = "Este correo ya está registrado con contraseña.";
      statusDetail.textContent = "Para proteger tu cuenta, inicia sesión usando tu correo y contraseña.";
      hintEl.textContent       = "Te llevaremos a la pantalla de inicio de sesión.";

      btnVolver.style.display = "inline-block";

      setTimeout(() => {
        window.location.href = "/static/login.html";
      }, 4000);
      return;
    }

    // Otros errores genéricos
    if (!res.ok || !json.ok) {
      const detalle = (json && json.error) ? json.error : (res.status + " " + res.statusText);

      statusMain.textContent   = "Hubo un problema registrando tu cuenta.";
      statusDetail.textContent = "Detalle: " + detalle;
      statusDetail.textContent = "Intenta nuevamente iniciar sesión con Google o usa tu correo.";
      hintEl.textContent       = "Te redirigiremos a inscripción.";
      btnVolver.style.display  = "inline-block";

      setTimeout(() => {
        window.location.href = "/static/inscripcion.html";
      }, 25000);
      return;
    }

    // 3) Guardar usuario_id si vino en la respuesta
    let fila = null;
    if (json.data && Array.isArray(json.data.data) && json.data.data[0]) {
      fila = json.data.data[0];
    } else if (Array.isArray(json.data) && json.data[0]) {
      fila = json.data[0];
    }

    if (fila && fila.id) {
      localStorage.setItem("usuario_id", fila.id);
    }

    // 4) Flujo según si ya existía o no
    if (json.ya_existia) {
      statusMain.textContent   = "Este correo ya estaba registrado en ContractRed.";
      statusDetail.textContent = "Te llevaremos a la pantalla de inicio de sesión.";
      hintEl.textContent       = "Si no recuerdas tu contraseña, podrás recuperarla desde el login.";

      setTimeout(() => {
        window.location.href = "/static/login.html";
      }, 3500);
    } else {
      statusMain.textContent   = "Tu cuenta se ha creado correctamente.";
      statusDetail.textContent = "Ahora completa tus datos personales para terminar el registro.";
      hintEl.textContent       = "No cierres esta ventana.";

      setTimeout(() => {
        window.location.href = "/static/verificacion.html";
      }, 3500);
    }
  } catch (e) {
    console.error("Error inesperado en verificacion_oauth:", e);
    statusMain.textContent   = "Error inesperado durante la verificación.";
    statusDetail.textContent = "Intenta iniciar sesión nuevamente con Google.";
    hintEl.textContent       = "Te redirigiremos a inscripción.";
    btnVolver.style.display  = "inline-block";

    setTimeout(() => {
      window.location.href = "/static/inscripcion.html";
    }, 4500);
  }
})();
