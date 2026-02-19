window.addEventListener("load", () => {
  const cards = document.querySelectorAll(
    ".kpi-card, .info-card, .table-card, .insight-card, .side-card, .hero-card, .plan"
  );
  cards.forEach((card, i) => {
    card.style.animation = `fadeUp 0.5s ease ${i * 0.05}s both`;
  });
});

(() => {
  const toggle = document.getElementById("side-toggle");
  const overlay = document.getElementById("side-overlay");
  const body = document.body;

  if (!toggle || !overlay) return;

  const closeSide = () => {
    body.classList.remove("side-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = body.classList.toggle("side-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  overlay.addEventListener("click", closeSide);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSide();
  });
})();
