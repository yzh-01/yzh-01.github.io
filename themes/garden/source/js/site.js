(function () {
  'use strict';

  var nav = document.getElementById('g-nav');
  var backTop = document.querySelector('.g-back-top');
  var ticking = false;

  function updateScrollState() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
    if (backTop) backTop.classList.toggle('visible', window.scrollY > 400);
    ticking = false;
  }

  updateScrollState();
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScrollState);
  }, { passive: true });

  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
