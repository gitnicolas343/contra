(() => {
  const button = document.getElementById("btn-conectar");
  const statusText = document.getElementById("status-text");
  const statusDot = document.getElementById("status-dot");
  const statusLog = document.getElementById("status-log");

  if (!button || !statusText || !statusDot || !statusLog) return;

  button.addEventListener("click", () => {
    button.disabled = true;
    button.textContent = "Conectando...";
    statusText.textContent = "Conectando";
    statusDot.classList.add("pulse");
    statusLog.textContent = "Estamos validando tu solicitud y abriendo el canal seguro.";

    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = "Solicitar agente";
      statusText.textContent = "En cola";
      statusDot.classList.remove("pulse");
      statusDot.classList.add("warn");
      statusLog.textContent = "Solicitud registrada. Un agente se unira en breve para continuar.";
    }, 1400);
  });
})();

