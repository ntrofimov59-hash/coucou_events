// Плавное появление секций при скролле
document.addEventListener('DOMContentLoaded', () => {
  // Важно: :not(.no-fade-anim) исключает секции, содержащие sticky-элементы
  // (например .summary-col в конфигураторе). Заданный на предке transform
  // создаёт новый containing block и ломает position: sticky у потомков,
  // поэтому такие секции анимировать нельзя.
  const elements = document.querySelectorAll(
    '.glass:not(.no-fade-anim), section:not(.no-fade-anim), .process-section:not(.no-fade-anim)'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        // transform: 'none', а не 'translateY(0)' — иначе свойство transform
        // остаётся объявленным навсегда и продолжает создавать containing
        // block для дочерних sticky/fixed элементов даже после анимации.
        entry.target.style.transform = 'none';
        observer.unobserve(entry.target);

        window.setTimeout(() => {
          entry.target.style.transition = '';
        }, 850);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)';
    observer.observe(el);
  });
});