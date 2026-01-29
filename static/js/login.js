/* =========================================================
       3) CONFIGURACIÓN (ajusta SOLO estos 3 valores)
       ========================================================= */

    const SUPABASE_URL = "https://ndsyaetglshulaqadvzl.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kc3lhZXRnbHNodWxhcWFkdnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0Mzk0NzEsImV4cCI6MjA4MDAxNTQ3MX0.Z2URIwgvLfpV6fdOv_fgIS-X-es2Zvlwq7QnB1Oo0Js";

    // Backend API
    const API_BASE = window.location.origin;

    /* =========================================================
       4) INICIALIZACIÓN SUPABASE
       ========================================================= */
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { detectSessionInUrl: true },
    });

    /* =========================================================
       5) REFERENCIAS DOM
       ========================================================= */
    const btnGoogle = document.getElementById("btnGoogle");
    const btnLogin = document.getElementById("btnLogin");
    const emailEl = document.getElementById("email");
    const passEl = document.getElementById("password");
    const errorBox = document.getElementById("errorBox");
    const forgotLink = document.getElementById("forgotLink");

    const modalListas = document.getElementById("modal-listas");
    const modalTitulo = document.getElementById("modal-titulo");
    const modalMensaje = document.getElementById("modal-mensaje");
    const modalDetalle = document.getElementById("modal-detalle");
    const modalContinuar = document.getElementById("modal-continuar");

    const modalLoading = document.getElementById("modal-loading");
    const loadingTitle = document.getElementById("loading-title");
    const loadingText = document.getElementById("loading-text");

    /* =========================================================
       6) HELPERS UI
       ========================================================= */
    function showError(msg) {
      errorBox.textContent = msg;
      errorBox.style.display = "block";
    }

    function clearError() {
      errorBox.textContent = "";
      errorBox.style.display = "none";
    }

    function setLoading(show, title, text) {
      if (title) loadingTitle.textContent = title;
      if (text) loadingText.textContent = text;
      modalLoading.style.display = show ? "flex" : "none";
    }

    function nextFrame() {
      return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    /* =========================================================
       7) HELPERS “negocio”
       ========================================================= */

    // (1) Resuelve usuario_id interno desde tu backend
    async function resolveUsuarioIdByEmail(email) {
      const url = API_BASE + "/usuarios/existe?email=" + encodeURIComponent(email);
      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const json = await res.json().catch(() => ({}));

      // Normaliza a la forma que usa tu flujo:
      // { ok, usuario_id, tiene_detalle }
      const ok = !!json.existe;
      return { ok, usuario_id: json.usuario_id || null, tiene_detalle: !!json.tiene_detalle };
    }

    // (1.1) Verifica si usuarios_detalle existe y está completo
    // Requiere endpoint /usuarios/detalle_estado (recomendado).
    // Si el endpoint no existe o falla, por seguridad redirigimos a verificación.
    async function detalleEstado(usuarioId) {
      const url = API_BASE + "/usuarios/detalle_estado?usuario_id=" + encodeURIComponent(usuarioId);
      try {
        const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
        const json = await res.json().catch(() => ({}));
        return { ok: res.ok, existe: !!json.existe, completo: !!json.completo };
      } catch (_) {
        return { ok: false, existe: false, completo: false };
      }
    }

    // (2) Revalida listas negras en tiempo real
    async function consultarListasNegras(usuarioId) {
      const url = API_BASE + "/listas_negras/resumen?usuario_id=" + encodeURIComponent(usuarioId);
      const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data: json };
    }

    // (3) Renderiza el modal de sanciones con tabla
    function showListasModal(resumenListas) {
      const estaEnListaNegra = !!(resumenListas && resumenListas.en_lista_negra);

      modalTitulo.textContent = estaEnListaNegra
        ? "Atención: encontramos sanciones registradas"
        : "Verificación completada";

      modalMensaje.textContent = (resumenListas && resumenListas.resumen)
        ? resumenListas.resumen
        : (estaEnListaNegra
            ? "Se encontraron sanciones asociadas a este registro. Revisa el detalle antes de continuar."
            : "No se encontraron sanciones vigentes asociadas a este registro.");

      let tablaHtml = "";
      const sanciones = Array.isArray(resumenListas?.sanciones) ? resumenListas.sanciones : [];

      if (sanciones.length > 0) {
        const filasHtml = sanciones.slice(0, 10).map((s, idx) => {
          const fuente = s.fuente || "-";
          const tipo = s.tipo_detalle || s.tipo_registro || "-";
          const nombre = s.nombre_sancionado || "-";
          const ident = s.identificador || "-";
          const estado = s.estado || "-";
          const fecha = s.fecha_evento || "-";

          let valorTexto = "-";
          if (s.valor_multa !== null && s.valor_multa !== undefined) {
            try {
              valorTexto = Number(s.valor_multa).toLocaleString("es-CO", { style: "currency", currency: "COP" });
            } catch (_) {}
          }

          const enlace = s.url_detalle ? `<a href="${s.url_detalle}" target="_blank" rel="noopener">Ver</a>` : "-";

          return `
            <tr>
              <td>${idx + 1}</td>
              <td>${fuente}</td>
              <td>${tipo}</td>
              <td>${nombre}</td>
              <td>${ident}</td>
              <td>${valorTexto}</td>
              <td>${fecha}</td>
              <td>${estado}</td>
              <td>${enlace}</td>
            </tr>
          `;
        }).join("");

        tablaHtml = `
          <div class="modal-detalle-title">Detalle de sanciones encontradas</div>
          <table class="modal-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fuente</th>
                <th>Tipo</th>
                <th>Sancionado / Proveedor</th>
                <th>Identificador</th>
                <th>Valor</th>
                <th>Fecha evento</th>
                <th>Estado</th>
                <th>Enlace</th>
              </tr>
            </thead>
            <tbody>${filasHtml}</tbody>
          </table>
          <p class="modal-note">
            Mostrando hasta 10 sanciones. Para más detalle revisa las fuentes oficiales (Procuraduría, SECOP I y SECOP II).
          </p>
        `;
      }

      modalDetalle.innerHTML = tablaHtml;
      modalListas.style.display = "flex";

      modalContinuar.textContent = estaEnListaNegra ? "Ir a ayuda" : "Continuar";

      modalContinuar.onclick = async () => {
        modalListas.style.display = "none";
        setLoading(true, "Cargando…", "Estamos preparando tu panel. Por favor espera.");
        await nextFrame();
        window.location.href = estaEnListaNegra ? "/static/ayuda.html" : "/static/lobby.html";
      };
    }

    /* =========================================================
       8) FLUJO PRINCIPAL POST-LOGIN
       ========================================================= */
    async function postLoginFlow(email) {
      clearError();

      setLoading(true, "Validando cuenta…", "Verificando tu registro interno en ContractRed.");
      await nextFrame();

      const resolved = await resolveUsuarioIdByEmail(email);

      // 1) Si NO existe en tabla usuarios -> verificación
      if (!resolved || !resolved.ok || !resolved.usuario_id) {
        // guardamos señales para verificacion.html (sin cambiar UI)
        try { localStorage.removeItem("usuario_id"); } catch (_) {}
        try { localStorage.setItem("pendiente_verificacion", "1"); } catch (_) {}
        try { localStorage.setItem("pending_email", email); } catch (_) {}

        setLoading(true, "Falta un paso…", "Necesitamos completar tu registro en ContractRed para continuar.");
        await nextFrame();
        window.location.href = "/static/verificacion.html";
        return;
      }

      const usuarioId = resolved.usuario_id;
      try { localStorage.setItem("usuario_id", usuarioId); } catch (_) {}

      // 2) Si NO tiene fila en usuarios_detalle -> verificación
      if (!resolved.tiene_detalle) {
        try { localStorage.setItem("pendiente_verificacion", "1"); } catch (_) {}
        setLoading(true, "Falta un paso…", "Necesitamos tus datos (documento, NIT, empresa) para validar listas negras.");
        await nextFrame();
        window.location.href = "/static/verificacion.html";
        return;
      }

      // 3) Si tiene usuarios_detalle, pero está INCOMPLETO -> verificación
      setLoading(true, "Validando perfil…", "Verificando que tu información esté completa.");
      await nextFrame();

      const det = await detalleEstado(usuarioId);
      if (!det.ok || !det.existe || !det.completo) {
        try { localStorage.setItem("pendiente_verificacion", "1"); } catch (_) {}
        setLoading(true, "Falta un paso…", "Necesitamos completar o actualizar tus datos para continuar.");
        await nextFrame();
        window.location.href = "/static/verificacion.html";
        return;
      }

      // 4) Consultar listas negras en cada login
      setLoading(true, "Consultando listas negras…", "Validando Procuraduría, SECOP I y SECOP II. No cierres esta ventana.");
      await nextFrame();

      const listas = await consultarListasNegras(usuarioId);
      setLoading(false);

      // Si backend dice que falta detalle -> verificación (consistencia)
      if (!listas.ok && listas.status === 404) {
        try { localStorage.setItem("pendiente_verificacion", "1"); } catch (_) {}
        window.location.href = "/static/verificacion.html";
        return;
      }

      if (!listas.ok) {
        showError("Ingresaste correctamente, pero no pudimos validar listas negras en este momento. Intenta más tarde.");
        return;
      }

      showListasModal(listas.data);
    }

    /* =========================================================
       9) EVENTO: Login con Google
       ========================================================= */
    btnGoogle.onclick = async () => {
      clearError();

      setLoading(true, "Conectando con Google…", "Serás redirigido para autenticarte.");
      await nextFrame();

      const redirectTo = window.location.origin + "/static/login.html";

      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        setLoading(false);
        showError("No se pudo iniciar sesión con Google: " + error.message);
      }
    };

    /* =========================================================
       10) EVENTO: Login con correo/contraseña
       ========================================================= */
    btnLogin.onclick = async () => {
      clearError();

      const email = (emailEl.value || "").trim();
      const password = passEl.value || "";

      if (!email || !password) {
        showError("Ingresa tu correo y tu contraseña.");
        return;
      }

      btnLogin.disabled = true;
      setLoading(true, "Iniciando sesión…", "Validando tus credenciales.");
      await nextFrame();

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error || !data?.user) {
          setLoading(false);
          showError("Credenciales inválidas o usuario no confirmado. Revisa tu correo o intenta de nuevo.");
          return;
        }

        const userEmail = data.user.email;

        // Guardar contexto (para verificacion.html si hace falta)
        try { localStorage.setItem("auth_id", data.user.id); } catch (_) {}
        try { localStorage.setItem("provider", "propio"); } catch (_) {}
        try { localStorage.setItem("pending_email", userEmail || email); } catch (_) {}

        setLoading(false);

        await postLoginFlow(userEmail);

      } catch (e) {
        setLoading(false);
        showError("Error inesperado al iniciar sesión.");
      } finally {
        btnLogin.disabled = false;
      }
    };

    /* =========================================================
       10.5) RECUPERAR CONTRASEÑA (básico)
       ========================================================= */
    forgotLink.onclick = async (e) => {
      e.preventDefault();
      clearError();

      const email = (emailEl.value || "").trim();
      if (!email) {
        showError("Escribe tu correo arriba para enviarte el enlace de recuperación.");
        return;
      }

      setLoading(true, "Enviando enlace…", "Revisa tu correo (y spam) para restablecer tu contraseña.");
      await nextFrame();

      try {
        const redirectTo = window.location.origin + "/static/reset_password.html";
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });

        setLoading(false);

        if (error) {
          showError("No se pudo enviar el enlace: " + error.message);
          return;
        }

        modalTitulo.textContent = "Revisa tu correo";
        modalMensaje.textContent = "Te enviamos un enlace para restablecer tu contraseña. Si no lo ves, revisa spam.";
        modalDetalle.innerHTML = "";
        modalContinuar.textContent = "Entendido";
        modalContinuar.onclick = () => (modalListas.style.display = "none");
        modalListas.style.display = "flex";

      } catch (err) {
        setLoading(false);
        showError("Error inesperado enviando el enlace de recuperación.");
      }
    };

    /* =========================================================
       11) AUTO-FLOW: callback Google -> postLoginFlow
       ========================================================= */
    (async () => {
      const hasHash = !!(window.location.hash && window.location.hash.includes("access_token"));
      const hasCode = !!(window.location.search && window.location.search.includes("code="));

      if (!hasHash && !hasCode) return;

      setLoading(true, "Finalizando inicio de sesión…", "Confirmando tu sesión.");
      await nextFrame();

      try {
        let user = null;

        const { data: u1, error: e1 } = await supabaseClient.auth.getUser();
        if (!e1 && u1?.user) user = u1.user;

        if (!user && hasHash) {
          const hash = window.location.hash.startsWith("#")
            ? window.location.hash.substring(1)
            : window.location.hash;
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");

          if (accessToken) {
            const { data: u2, error: e2 } = await supabaseClient.auth.getUser(accessToken);
            if (!e2 && u2?.user) user = u2.user;
          }
        }

        if (!user || !user.email) {
          setLoading(false);
          showError("No pudimos confirmar tu sesión. Intenta nuevamente.");
          return;
        }

        // Guardar contexto (para verificacion.html si hace falta)
        try { localStorage.setItem("auth_id", user.id); } catch (_) {}
        try { localStorage.setItem("provider", "google"); } catch (_) {}
        try { localStorage.setItem("pending_email", user.email); } catch (_) {}

        setLoading(false);

        // Limpia URL para evitar re-ejecutar el flujo al refrescar
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (_) {}

        await postLoginFlow(user.email);

      } catch (e) {
        setLoading(false);
        showError("Error confirmando tu sesión. Intenta nuevamente.");
      }
    })();
