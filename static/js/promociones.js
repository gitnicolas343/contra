(() => {
  const plans = {
    basico: {
      name: "Basico",
      tag: "Inicio",
      price: "$0 / mes",
      total: "$0",
      benefits: [
        "Resumen de contratos",
        "Alertas semanales",
        "Soporte por correo"
      ]
    },
    pro: {
      name: "Pro",
      tag: "Mas popular",
      price: "$29 / mes",
      total: "$29",
      benefits: [
        "Alertas diarias y por entidad",
        "Analisis de elegibilidad",
        "Soporte prioritario"
      ]
    },
    premium: {
      name: "Premium",
      tag: "Analitica avanzada",
      price: "$59 / mes",
      total: "$59",
      benefits: [
        "Modelos predictivos y scoring",
        "Exportaciones ilimitadas",
        "Agente dedicado"
      ]
    }
  };

  const summaryPlan = document.getElementById("summary-plan");
  const summaryTag = document.getElementById("summary-tag");
  const summaryPrice = document.getElementById("summary-price");
  const summaryTotal = document.getElementById("summary-total");
  const summaryBenefits = document.getElementById("summary-benefits");
  const planCards = document.querySelectorAll(".plan-card");
  const planButtons = document.querySelectorAll("[data-plan-select]");
  const btnVerPlanes = document.getElementById("btn-ver-planes");
  const checkout = document.getElementById("checkout");
  const checkoutPlaceholder = document.getElementById("checkout-placeholder");
  const btnOcultarPago = document.getElementById("btn-ocultar-pago");

  const setPlan = (key) => {
    const plan = plans[key];
    if (!plan) return;

    planCards.forEach((card) => {
      card.classList.toggle("active", card.dataset.plan === key);
    });

    summaryPlan.textContent = plan.name;
    summaryTag.textContent = plan.tag;
    summaryPrice.textContent = plan.price;
    summaryTotal.textContent = plan.total;

    summaryBenefits.innerHTML = "";
    plan.benefits.forEach((benefit) => {
      const li = document.createElement("li");
      li.textContent = benefit;
      summaryBenefits.appendChild(li);
    });
  };

  const showCheckout = () => {
    if (!checkout) return;
    checkout.classList.remove("is-hidden");
    checkout.classList.add("is-visible");
    checkout.setAttribute("aria-hidden", "false");
    if (checkoutPlaceholder) {
      checkoutPlaceholder.classList.add("is-hidden");
    }
    checkout.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const hideCheckout = () => {
    if (!checkout) return;
    checkout.classList.remove("is-visible");
    checkout.classList.add("is-hidden");
    checkout.setAttribute("aria-hidden", "true");
    if (checkoutPlaceholder) {
      checkoutPlaceholder.classList.remove("is-hidden");
    }
  };

  planButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPlan(button.dataset.planSelect);
      showCheckout();
    });
  });

  if (btnOcultarPago) {
    btnOcultarPago.addEventListener("click", hideCheckout);
  }

  if (btnVerPlanes) {
    btnVerPlanes.addEventListener("click", () => {
      const planes = document.getElementById("planes");
      if (planes) planes.scrollIntoView({ behavior: "smooth" });
    });
  }

  setPlan("pro");
})();

