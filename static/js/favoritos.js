// Favoritos guardados en el navegador (localStorage) hasta tener modelo en la BD.
document.addEventListener('DOMContentLoaded', () => {
  const clave = 'vinlume_favoritos';
  let favoritos = [];
  try { favoritos = JSON.parse(localStorage.getItem(clave)) || []; } catch (e) { favoritos = []; }

  document.querySelectorAll('.fav-btn').forEach(btn => {
    const id = btn.dataset.id;
    if (favoritos.includes(id)) btn.classList.add('active');
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      favoritos = btn.classList.contains('active')
        ? [...new Set([...favoritos, id])]
        : favoritos.filter(f => f !== id);
      localStorage.setItem(clave, JSON.stringify(favoritos));
    });
  });
});
