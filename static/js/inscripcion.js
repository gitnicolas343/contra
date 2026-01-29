const SUPABASE_URL = "https://ndsyaetglshulaqadvzl.supabase.co";
const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kc3lhZXRnbHNodWxhcWFkdnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Mzk0NzEsImV4cCI6MjA4MDAxNTQ3MX0.Z2URIwgvLfpV6fdOv_fgIS-X-es2Zvlwq7QnB1Oo0Js";

const API_BASE = window.location.origin;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Supabase cargado:", !!window.supabase);

// ---------- LOGIN CON GOOGLE ----------
async function continueWithProvider(provider) {
  if (provider === "google") {
    try {
      const redirectTo = window.location.origin + "/static/verificacion_oauth.html";
      console.log("Redirect Google OAuth a:", redirectTo);

      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      console.log("Resultado signInWithOAuth:", { data, error });

      if (error) {
        console.error("Error en Google OAuth:", error);
        alert(
        "No se pudo iniciar sesión con Google:\n" +
        (error.message || JSON.stringify(error))
        );
      }
    } catch (err) {
      console.error("Excepción en Google OAuth:", err);
      alert(
      "Error inesperado con Google OAuth (JS):\n" +
      (err && err.message ? err.message : String(err))
      );
    }
    return;
  }

  if (provider === "linkedin") {
    alert("Inicio con LinkedIn estará disponible más adelante. Usa Google o correo por ahora.");
    return;
  }
}

// ---------- REGISTRO EMAIL + CONTRASEÑA ----------
async function handleRegister(event) {
  event.preventDefault();

  // Limpiar errores
  document.getElementById("error-email").textContent = "";
  document.getElementById("error-password").textContent = "";
  document.getElementById("error-password2").textContent = "";
  document.getElementById("error-terms").textContent = "";

  const email = document.getElementById("email").value.trim();
  const pass1 = document.getElementById("password").value;
  const pass2 = document.getElementById("password2").value;
  const terms = document.getElementById("terms").checked;

  let ok = true;

  if (!email.includes("@")) {
    document.getElementById("error-email").textContent = "Correo inválido.";
    ok = false;
  }

  if (pass1.length < 6) {
    document.getElementById("error-password").textContent =
    "La contraseña debe tener al menos 6 caracteres.";
    ok = false;
  }

  if (pass1 !== pass2) {
    document.getElementById("error-password2").textContent =
    "Las contraseñas no coinciden.";
    ok = false;
  }

  if (!terms) {
    document.getElementById("error-terms").textContent = "Debes aceptar los términos.";
    ok = false;
  }

  if (!ok) return false;

  try {
    // 1) Consultar en tu tabla 'usuarios' si el correo YA existe
    let yaRegistrado = false;

    try {
      const resCheck = await fetch(
      API_BASE + "/usuarios/existe?email=" + encodeURIComponent(email)
      );

      if (resCheck.ok) {
        const jsonCheck = await resCheck.json();
        yaRegistrado = !!jsonCheck.existe;
        console.log("Resultado /usuarios/existe:", jsonCheck);
      } else {
        console.warn("No se pudo comprobar /usuarios/existe. Status:", resCheck.status);
      }
    } catch (errCheck) {
      console.warn("Error consultando /usuarios/existe:", errCheck);
    }

    // Caso A: YA existe en tu tabla usuarios → directo a login
    if (yaRegistrado) {
      alert(
      "Este correo ya tiene una cuenta en ContractRed.\n" +
      "Te llevaremos al inicio de sesión."
      );
      window.location.href = "/static/login.html";
      return false;
    }

    // Caso B: NO existe en tu tabla → intentamos crear usuario en Supabase Auth
    const redirectTo = window.location.origin + "/static/verificacion_email.html";
    console.log("Llamando signUp con redirectTo:", redirectTo);

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: pass1,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    console.log("Resultado signUp:", { data, error });

    if (error) {
      const msg  = (error.message || "").toLowerCase();
      const code = error.code || "";

      // 🟣 Caso especial: usuario YA existe en Auth pero (probablemente) sin verificar
      if (
      code === "user_already_exists" ||
      msg.includes("user already registered") ||
      msg.includes("already registered")
      ) {
        try {
          console.log("Usuario ya existe en Auth. Reenviando correo de verificación...");

          const { data: resendData, error: resendError } =
          await supabaseClient.auth.resend({
            type: "signup",
            email: email,
          });

          console.log("Resultado auth.resend:", { resendData, resendError });

          if (resendError) {
            alert(
            "Tu correo ya tenía una cuenta creada, pero no pudimos reenviar el enlace de verificación.\n\n" +
            "Intenta más tarde o usa la opción de recuperar cuenta desde el login."
            );
            return false;
          }

          alert(
          "Este correo ya tenía una cuenta pendiente de verificación.\n" +
          "Te hemos reenviado el enlace de verificación. Revisa bandeja de entrada y spam."
          );
          return false;

        } catch (errResend) {
          console.error("Error en auth.resend:", errResend);
          alert(
          "No pudimos reenviar el correo de verificación.\n\n" +
          "Intenta más tarde o usa la opción de recuperar cuenta desde el login."
          );
          return false;
        }
      }

      // Otros errores de Supabase
      alert(
      "debes esperar antes de solicitar un nuevo correo\n\n" +
      (error.message || JSON.stringify(error, null, 2))
      );
      return false;
    }

    // Caso C: Usuario nuevo → correo de verificación enviado correctamente
    alert(
    "Hemos enviado un enlace de verificación a tu correo.\n" +
    "Revisa bandeja de entrada y spam para continuar."
    );

  } catch (err) {
    console.error("Excepción en handleRegister:", err);
    alert(
    "Error inesperado creando la cuenta (JS):\n\n" +
    (err && err.message ? err.message : String(err))
    );
  }

  return false;
}

// ---------- MODAL TÉRMINOS ----------
document.getElementById("ver-terminos").addEventListener("click", function (e) {
  e.preventDefault();
  document.getElementById("modal-terminos").style.display = "flex";
});

document.getElementById("cerrar-modal").addEventListener("click", function () {
  document.getElementById("modal-terminos").style.display = "none";
});

document.getElementById("modal-terminos").addEventListener("click", function (e) {
  if (e.target === this) {
    this.style.display = "none";
  }
});
