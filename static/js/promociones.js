(() => {
  const plans = {
    basico: {
      name: "Basico",
      tag: "Inicio",
      price: "$0 / mes",
      total: "$0",
      benefits: ["Resumen de contratos", "Alertas semanales", "Soporte por correo"],
    },
    pro: {
      name: "Pro",
      tag: "Mas popular",
      price: "$29 / mes",
      total: "$29",
      benefits: [
        "Alertas diarias y por entidad",
        "Analisis de elegibilidad",
        "Soporte prioritario",
      ],
    },
    premium: {
      name: "Premium",
      tag: "Analitica avanzada",
      price: "$59 / mes",
      total: "$59",
      benefits: ["Modelos predictivos y scoring", "Exportaciones ilimitadas", "Agente dedicado"],
    },
  };

  const stepSections = Array.from(document.querySelectorAll(".step-section"));
  const stepperItems = Array.from(document.querySelectorAll(".stepper-item"));

  const summaryPlan = document.getElementById("summary-plan");
  const summaryTag = document.getElementById("summary-tag");
  const summaryPrice = document.getElementById("summary-price");
  const summaryTotal = document.getElementById("summary-total");
  const summaryBenefits = document.getElementById("summary-benefits");
  const planCards = document.querySelectorAll(".plan-card");
  const planButtons = document.querySelectorAll("[data-plan-select]");

  let step2Unlocked = false;
  let step3Unlocked = false;

  const updateStepper = () => {
    stepperItems.forEach((item) => {
      const step = item.dataset.step;
      const isDisabled = (step === "2" && !step2Unlocked) || (step === "3" && !step3Unlocked);
      item.classList.toggle("is-disabled", isDisabled);
      item.disabled = isDisabled;
      item.setAttribute("aria-disabled", String(isDisabled));

      const isComplete = (step === "1" && step2Unlocked) || (step === "2" && step3Unlocked);
      item.classList.toggle("is-complete", isComplete);
    });
  };

  const showStep = (step) => {
    if (step === "2" && !step2Unlocked) return;
    if (step === "3" && !step3Unlocked) return;

    stepSections.forEach((section) => {
      section.classList.toggle("is-active", section.dataset.step === step);
    });
    stepperItems.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.step === step);
    });
  };

  const unlockStep2 = () => {
    step2Unlocked = true;
    updateStepper();
  };

  const unlockStep3 = () => {
    step3Unlocked = true;
    updateStepper();
  };

  const setPlan = (key) => {
    const plan = plans[key];
    if (!plan) return;

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

  document.querySelectorAll("[data-next-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextStep = btn.dataset.nextStep;
      if (nextStep === "2") unlockStep2();
      if (nextStep === "3") unlockStep3();
      showStep(nextStep);
    });
  });

  document.querySelectorAll("[data-prev-step]").forEach((btn) => {
    btn.addEventListener("click", () => showStep(btn.dataset.prevStep));
  });

  stepperItems.forEach((item) => {
    item.addEventListener("click", () => showStep(item.dataset.step));
  });

  planButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPlan(button.dataset.planSelect);
      unlockStep3();
      showStep("3");
    });
  });

  updateStepper();
  showStep("1");
  setPlan("pro");
})();
