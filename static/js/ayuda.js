(() => {
  const bindConnector = (buttonId, dotId, textId, logId) => {
    const button = document.getElementById(buttonId);
    const statusDot = document.getElementById(dotId);
    const statusText = document.getElementById(textId);
    const statusLog = logId ? document.getElementById(logId) : null;

    if (!button || !statusDot || !statusText) return;

    button.addEventListener("click", () => {
      button.disabled = true;
      button.textContent = "Conectando...";
      statusText.textContent = "Conectando";
      statusDot.classList.add("pulse");
      if (statusLog) {
        statusLog.textContent = "Estamos validando tu solicitud y abriendo el canal seguro.";
      }

      window.setTimeout(() => {
        button.disabled = false;
        button.textContent = "Solicitar agente";
        statusText.textContent = "En cola";
        statusDot.classList.remove("pulse");
        statusDot.classList.add("warn");
        if (statusLog) {
          statusLog.textContent = "Solicitud registrada. Un agente se unira en breve para continuar.";
        }
      }, 1400);
    });
  };

  bindConnector("btn-conectar", "status-dot", "status-text", "status-log");
  bindConnector("btn-conectar-alt", "status-dot-alt", "status-text-alt", null);
})();

(() => {
  const chatBody = document.getElementById("chat-body");
  const topicButtons = document.querySelectorAll("[data-topic]");

  if (!chatBody || !topicButtons.length) return;

  const topics = {
    listas_negras: {
      prompt: "Estoy en lista negra, que debo hacer?",
      response:
        "Solucion: validamos el detalle, reunimos soporte y preparamos la solicitud con la entidad para actualizar tu estado.",
    },
    elegibilidad: {
      prompt: "Necesito saber si soy elegible para una convocatoria.",
      response:
        "Solucion: revisamos requisitos, comparamos tu perfil y te damos la lista exacta de ajustes para cumplir al 100%.",
    },
    reportes: {
      prompt: "Necesito generar un reporte con mis convocatorias.",
      response:
        "Solucion: te guiamos en la seleccion de filtros y te damos el formato listo para exportar en PDF o Excel.",
    },
    pagos: {
      prompt: "Tengo dudas sobre el pago y la activacion del plan.",
      response:
        "Solucion: revisamos el plan elegido, el estado del pago y dejamos la pasarela lista para activacion.",
    },
    promociones: {
      prompt: "Que diferencia hay entre Estandar y Premium?",
      response:
        "Solucion: comparamos beneficios, alertas y scoring para recomendar el plan ideal para tu empresa.",
    },
  };

  const addBubble = (role, text, extraClass) => {
    const bubble = document.createElement("div");
    bubble.className = `bubble ${role}` + (extraClass ? ` ${extraClass}` : "");
    bubble.textContent = text;
    chatBody.appendChild(bubble);
    chatBody.scrollTop = chatBody.scrollHeight;
    return bubble;
  };

  const respondWith = (topicKey) => {
    const topic = topics[topicKey];
    if (!topic) return;

    addBubble("user", topic.prompt);
    const pending = addBubble("bot", "Respuesta en proceso...", "pending");

    window.setTimeout(() => {
      pending.textContent = topic.response;
      pending.classList.remove("pending");
    }, 900 + Math.random() * 900);
  };

  topicButtons.forEach((btn) => {
    btn.addEventListener("click", () => respondWith(btn.dataset.topic));
  });
})();

(() => {
  const stepSections = Array.from(document.querySelectorAll(".step-section"));
  const stepperItems = Array.from(document.querySelectorAll(".stepper-item"));

  if (!stepSections.length) return;

  const showStep = (step) => {
    stepSections.forEach((section) => {
      section.classList.toggle("is-active", section.dataset.step === step);
    });
    stepperItems.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.step === step);
    });
  };

  document.querySelectorAll("[data-next-step]").forEach((btn) => {
    btn.addEventListener("click", () => showStep(btn.dataset.nextStep));
  });

  document.querySelectorAll("[data-prev-step]").forEach((btn) => {
    btn.addEventListener("click", () => showStep(btn.dataset.prevStep));
  });

  stepperItems.forEach((item) => {
    item.addEventListener("click", () => showStep(item.dataset.step));
  });

  showStep("1");
})();

(() => {
  const STORAGE_KEY = "help_plan";
  const plans = {
    estandar: {
      name: "Estandar",
      tag: "Basico",
      price: "$0 / mes",
      total: "$0",
      benefits: ["Resumen diario", "Alertas semanales", "Soporte por correo"],
    },
    premium: {
      name: "Premium",
      tag: "Recomendado",
      price: "$59 / mes",
      total: "$59",
      benefits: ["Scoring de elegibilidad", "Convocatorias filtradas", "Agente dedicado"],
    },
  };

  const summaryPlan = document.getElementById("summary-plan");
  const summaryTag = document.getElementById("summary-tag");
  const summaryPrice = document.getElementById("summary-price");
  const summaryTotal = document.getElementById("summary-total");
  const summaryBenefits = document.getElementById("summary-benefits");
  const planCards = document.querySelectorAll(".promo-card");
  const planButtons = document.querySelectorAll("[data-plan-select]");

  const setPlan = (key, persist) => {
    const plan = plans[key];
    if (!plan) return;

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, key);
      } catch (_) {}
    }

    planCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.plan === key);
    });

    if (summaryPlan) summaryPlan.textContent = plan.name;
    if (summaryTag) summaryTag.textContent = plan.tag;
    if (summaryPrice) summaryPrice.textContent = plan.price;
    if (summaryTotal) summaryTotal.textContent = plan.total;

    if (summaryBenefits) {
      summaryBenefits.innerHTML = "";
      plan.benefits.forEach((benefit) => {
        const li = document.createElement("li");
        li.textContent = benefit;
        summaryBenefits.appendChild(li);
      });
    }
  };

  planButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPlan(button.dataset.planSelect, true);
      const goToStep = document.querySelector(".stepper-item[data-step='3']");
      if (goToStep) goToStep.click();
    });
  });

  let initial = "premium";
  try {
    initial = window.localStorage.getItem(STORAGE_KEY) || initial;
  } catch (_) {}

  setPlan(initial, false);
})();

(() => {
  const items = Array.from(document.querySelectorAll(".reveal"));
  if (!items.length) return;

  const revealItem = (item) => {
    item.classList.add("is-visible");
  };

  if (!("IntersectionObserver" in window)) {
    items.forEach(revealItem);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealItem(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  items.forEach((item, index) => {
    item.style.setProperty("--delay", `${index * 0.08}s`);
    observer.observe(item);
  });
})();
