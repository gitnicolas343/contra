const SUPABASE_URL = "https://ndsyaetglshulaqadvzl.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kc3lhZXRnbHNodWxhcWFkdnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Mzk0NzEsImV4cCI6MjA4MDAxNTQ3MX0.Z2URIwgvLfpV6fdOv_fgIS-X-es2Zvlwq7QnB1Oo0Js";
    const API_BASE = window.location.origin;

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { detectSessionInUrl: true },
    });

    const statusMain   = document.getElementById("status-main");
    const statusDetail = document.getElementById("status-detail");
    const hintEl       = document.getElementById("hint");
    const btnVolver    = document.getElementById("btn-volver");

    (async () => {
      try {
        statusMain.textContent = "Verificando el enlace de tu correo...";
        statusDetail.textContent = "";

        // 1) Obtener el usuario de Supabase a partir del enlace
        const { data, error } = await supabaseClient.auth.getUser();
        console.log("getUser verificación email:", { data, error });

        if (error) {
          statusMain.textContent = "No pudimos confirmar tu correo.";
          statusDetail.textContent = "El enlace puede haber expirado o no es válido. Intenta registrarte de nuevo con un correo real.";
          hintEl.textContent = "Te redirigiremos a la página de inscripción.";
          btnVolver.style.display = "inline-block";
          setTimeout(() => { window.location.href = "/static/inscripcion.html"; }, 4000);
          return;
        }

        const user = data?.user;
        if (!user) {
          statusMain.textContent = "No pudimos confirmar tu correo.";
          statusDetail.textContent = "No hay una sesión válida asociada al enlace. Intenta registrarte de nuevo.";
          hintEl.textContent = "Te redirigiremos a la página de inscripción.";
          btnVolver.style.display = "inline-block";
          setTimeout(() => { window.location.href = "/static/inscripcion.html"; }, 4000);
          return;
        }

        const email    = user.email;
        const provider = user.app_metadata?.provider || "email";
        const auth_id  = user.id;

        statusMain.textContent = "Correo verificado correctamente.";
        statusDetail.textContent = "Guardando tu registro en ContractRed...";

        // 2) Registrar en tu backend /registrar_oauth
        const res = await fetch(API_BASE + "/registrar_oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, provider, auth_id }),
        });


        const json = await res.json();
        console.log("Respuesta /registrar_oauth (email):", json);

        if (!res.ok || !json.ok) {
          statusMain.textContent = "Hubo un problema registrando tu cuenta.";
          statusDetail.textContent = "Intenta registrarte de nuevo o usa otro correo.";
          hintEl.textContent = "Te redirigiremos a inscripción.";
          btnVolver.style.display = "inline-block";
          setTimeout(() => { window.location.href = "/static/inscripcion.html"; }, 4500);
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
          // Usuario YA estaba en la tabla usuarios → login
          statusMain.textContent = "Este correo ya está registrado en ContractRed.";
          statusDetail.textContent = "Te llevaremos a la pantalla de inicio de sesión.";
          hintEl.textContent = "Si no recuerdas tu contraseña, podrás recuperarla desde el login.";

          setTimeout(() => {
            window.location.href = "/static/login.html";
          }, 3500);
        } else {
          // Usuario NUEVO → completar datos en verificacion.html
          statusMain.textContent = "Tu correo ha sido verificado y tu cuenta ha sido registrada.";
          statusDetail.textContent = "Te redirigiremos para completar tus datos personales (nombre, cédula, NIT, etc.).";
          hintEl.textContent = "No cierres esta ventana.";

          setTimeout(() => {
            window.location.href = "/static/verificacion.html";
          }, 3500);
        }
      } catch (e) {
        console.error("Error en verificacion_email:", e);
        statusMain.textContent = "Error inesperado durante la verificación.";
        statusDetail.textContent = "Detalle técnico: " + (e && e.message ? e.message : e);
        hintEl.textContent = "Te redirigiremos a inscripción.";
        btnVolver.style.display = "inline-block";
        setTimeout(() => { window.location.href = "/static/inscripcion.html"; }, 4500);
      }
    })();
