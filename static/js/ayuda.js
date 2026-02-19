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

(() => {
  const items = Array.from(document.querySelectorAll(".help-item"));
  if (!items.length) return;

  const closeItem = (item) => {
    const panel = item.querySelector(".help-panel");
    const toggle = item.querySelector(".help-toggle");
    item.classList.remove("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (panel) panel.style.maxHeight = "0px";
  };

  const openItem = (item, scrollIntoView) => {
    items.forEach((other) => {
      if (other !== item) closeItem(other);
    });

    const panel = item.querySelector(".help-panel");
    const toggle = item.querySelector(".help-toggle");
    item.classList.add("is-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    if (panel) panel.style.maxHeight = `${panel.scrollHeight}px`;

    if (scrollIntoView) {
      item.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const openSection = (key) => {
    const target = items.find((item) => item.dataset.section === key);
    if (target) openItem(target, true);
  };

  items.forEach((item) => {
    const panel = item.querySelector(".help-panel");
    const toggle = item.querySelector(".help-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        if (item.classList.contains("is-open")) {
          closeItem(item);
        } else {
          openItem(item, true);
        }
      });
    }

    if (item.classList.contains("is-open") && panel) {
      panel.style.maxHeight = `${panel.scrollHeight}px`;
    }
  });

  window.addEventListener("resize", () => {
    items.forEach((item) => {
      if (!item.classList.contains("is-open")) return;
      const panel = item.querySelector(".help-panel");
      if (panel) panel.style.maxHeight = `${panel.scrollHeight}px`;
    });
  });

  document.querySelectorAll("[data-open-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-open-section");
      if (target) openSection(target);
    });
  });

  window.HelpOpenSection = openSection;
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

    if (planCards.length) {
      planCards.forEach((card) => {
        card.classList.toggle("active", card.dataset.plan === key);
      });
    }

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
      if (typeof window.HelpOpenSection === "function") {
        window.HelpOpenSection("pago");
      }
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
