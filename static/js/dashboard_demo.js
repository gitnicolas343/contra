window.addEventListener('load', () => {
  const cards = document.querySelectorAll('.kpi-card, .info-card, .table-card');
  cards.forEach((card, i) => {
    card.style.animation = `fadeUp 0.5s ease ${i * 0.05}s both`;
  });
});
