// Carrusel: las imágenes las genera Django con {% for %}; aquí solo se alternan.
// Fase 6: esta lógica se reemplaza por un componente React.
document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.carrusel-slide');
  if (slides.length < 2) return;

  let indice = 0;
  let temporizador;

  function mostrar(nuevo) {
    slides[indice].classList.remove('activa');
    indice = (nuevo + slides.length) % slides.length;
    slides[indice].classList.add('activa');
  }

  function iniciar() { temporizador = setInterval(() => mostrar(indice + 1), 3000); }
  function reiniciar() { clearInterval(temporizador); iniciar(); }

  document.getElementById('carrusel-sig').addEventListener('click', () => { mostrar(indice + 1); reiniciar(); });
  document.getElementById('carrusel-ant').addEventListener('click', () => { mostrar(indice - 1); reiniciar(); });
  iniciar();
});
