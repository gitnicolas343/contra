const API_BASE = window.location.origin;
const usuarioId = localStorage.getItem("usuario_id");

if (!usuarioId) {
  alert(
  "No encontramos tu sesión de registro.\n" +
  "Por favor, vuelve a crear tu cuenta desde la página de inscripción."
  );
  window.location.href = "/static/inscripcion.html";
}

function setLoading(show) {
  const modalLoading = document.getElementById("modal-loading");
  if (modalLoading) modalLoading.style.display = show ? "flex" : "none";
}

function nextFrame() {
  return new Promise((resolve) =>
  requestAnimationFrame(() => requestAnimationFrame(resolve))
  );
}

async function handleVerificacion(event) {
  event.preventDefault();

  const errorIds = [
    "error-nombre",
    "error-tipo-doc",
    "error-num-doc",
    "error-nit",
    "error-empresa",
    "error-actividad",
    "error-departamento",
    "error-ciudad",
    "error-telefono",
    "error-politica",
  ];

  errorIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });

  const nombre = document.getElementById("nombre").value.trim();
  const tipoDocumento = document.getElementById("tipo_documento").value;
  const numeroDocumento = document.getElementById("numero_documento").value.trim();
  const nit = document.getElementById("nit").value.trim();
  const empresa = document.getElementById("empresa").value.trim();
  const actividadComercial = document.getElementById("actividad_comercial").value.trim();
  const departamento = document.getElementById("departamento").value;
  const ciudad = document.getElementById("ciudad").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const aceptaPolitica = document.getElementById("acepta_politica").checked;

  let ok = true;

  if (!nombre) {
    document.getElementById("error-nombre").textContent = "Ingresa tu nombre completo.";
    ok = false;
  }

  if (!tipoDocumento) {
    document.getElementById("error-tipo-doc").textContent = "Selecciona el tipo de documento.";
    ok = false;
  }

  if (!numeroDocumento) {
    document.getElementById("error-num-doc").textContent = "Ingresa tu número de documento.";
    ok = false;
  }

  if (!empresa) {
    document.getElementById("error-empresa").textContent = "Ingresa el nombre de la empresa.";
    ok = false;
  }

  if (!telefono) {
    document.getElementById("error-telefono").textContent = "Ingresa un teléfono de contacto.";
    ok = false;
  }

  if (!aceptaPolitica) {
    document.getElementById("error-politica").textContent =
    "Debes confirmar que estás autorizado para registrar esta empresa.";
    ok = false;
  }

  if (!ok) return false;

  let ubicacion = "";
  if (ciudad && departamento) ubicacion = `${ciudad}, ${departamento}`;
  else if (ciudad) ubicacion = ciudad;
  else if (departamento) ubicacion = departamento;

  const payload = {
    usuario_id: usuarioId,
    nombre_completo: nombre,
    tipo_documento: tipoDocumento,
    numero_documento: numeroDocumento,
    nit: nit || null,
    empresa: empresa,
    telefono: telefono,
    actividad_comercial: actividadComercial || null,
    ubicacion_geografica: ubicacion || null,
  };

  try {
    // 1) Guardar datos
    const res = await fetch(API_BASE + "/completar_registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      alert(
      "No pudimos guardar tus datos.\n\n" +
      (json && json.detail ? json.detail : "Revisa tu conexión o intenta más tarde.")
      );
      return false;
    }

    // 2) Consultar listas negras con loader
    let mensajeFinal = "";
    let tituloFinal = "";
    let resumenListas = null;

    setLoading(true);
    await nextFrame();

    try {
      const respListas = await fetch(
      API_BASE + "/listas_negras/resumen?usuario_id=" + encodeURIComponent(usuarioId),
      { method: "GET", headers: { Accept: "application/json" } }
      );

      if (respListas.ok) {
        resumenListas = await respListas.json();

        if (resumenListas.en_lista_negra) {
          tituloFinal = "Atención: encontramos sanciones registradas";
          mensajeFinal =
          resumenListas.resumen ||
          "Se encontraron sanciones asociadas a este registro. Revisa el detalle antes de continuar.";
        } else {
          tituloFinal = "Verificación completada";
          mensajeFinal =
          resumenListas.resumen ||
          "No se encontraron sanciones vigentes asociadas a este registro.";
        }
      } else {
        tituloFinal = "Verificación parcial";
        mensajeFinal =
        "Tus datos se guardaron correctamente, pero no pudimos verificar las listas negras en este momento.";
      }
    } catch (e) {
      console.error("Error llamando a /listas_negras/resumen:", e);
      tituloFinal = "Verificación parcial";
      mensajeFinal =
      "Tus datos se guardaron correctamente, pero ocurrió un error de conexión al verificar las listas negras.";
    } finally {
      setLoading(false);
    }

    // 3) Mostrar modal con resultado
    const modal = document.getElementById("modal-listas");
    const tituloModal = document.getElementById("modal-titulo");
    const mensajeModal = document.getElementById("modal-mensaje");
    const detalleModal = document.getElementById("modal-detalle");
    const btnContinuar = document.getElementById("modal-continuar");

    if (!modal || !tituloModal || !mensajeModal || !detalleModal || !btnContinuar) {
      alert(mensajeFinal || "Tus datos se guardaron correctamente.");
      window.location.href = "/static/index.html";
      return false;
    }

    tituloModal.textContent = tituloFinal || "Resultado de la verificación";
    mensajeModal.textContent = mensajeFinal || "";

    let tablaHtml = "";

    if (resumenListas && Array.isArray(resumenListas.sanciones) && resumenListas.sanciones.length > 0) {
      const filasHtml = resumenListas.sanciones
      .slice(0, 10)
      .map((sancion, idx) => {
        const fuente = sancion.fuente || "-";
        const tipo = sancion.tipo_detalle || sancion.tipo_registro || "-";
        const nombreSan = sancion.nombre_sancionado || "-";
        const identificador = sancion.identificador || "-";
        const estado = sancion.estado || "-";
        const fecha = sancion.fecha_evento || "-";

        let valorTexto = "-";
        if (sancion.valor_multa !== null && sancion.valor_multa !== undefined) {
          try {
            valorTexto = Number(sancion.valor_multa).toLocaleString("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            });
          } catch (_) {
            valorTexto = String(sancion.valor_multa);
          }
        }

        let linkHtml = "-";
        if (sancion.url_detalle) {
          linkHtml = `<a href="${sancion.url_detalle}" target="_blank" rel="noopener noreferrer">Ver proceso</a>`;
        }

        return `
        <tr>
        <td>${idx + 1}</td>
        <td>${fuente}</td>
        <td>${tipo}</td>
        <td>${nombreSan}</td>
        <td>${identificador}</td>
        <td>${valorTexto}</td>
        <td>${fecha}</td>
        <td>${estado}</td>
        <td>${linkHtml}</td>
        </tr>
        `;
      })
      .join("");

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
      <tbody>
      ${filasHtml}
      </tbody>
      </table>
      <p class="modal-note">
      Mostrando hasta 10 sanciones. Para más detalle revisa las fuentes oficiales (Procuraduría, SECOP I y SECOP II).
      </p>
      `;
    }

    detalleModal.innerHTML = tablaHtml;
    modal.style.display = "flex";

    const estaEnListaNegra = !!(resumenListas && resumenListas.en_lista_negra);

    // si está en listas negras, NO puede continuar: solo ayuda
    btnContinuar.textContent = estaEnListaNegra ? "Ir a ayuda" : "Continuar";

    btnContinuar.onclick = async () => {
      btnContinuar.disabled = true;
      modal.style.display = "none";

      setLoading(true);
      await nextFrame();

      window.location.href = estaEnListaNegra ? "/static/ayuda.html" : "/static/lobby.html";
    };

    return false;
  } catch (err) {
    console.error("Error en completar_registro:", err);
    alert(
    "Ocurrió un error inesperado guardando tus datos.\n\n" +
    (err && err.message ? err.message : String(err))
    );
    return false;
  }
}
