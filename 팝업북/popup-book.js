const root = document.documentElement;
const control = document.querySelector('#book-control');
const scene = document.querySelector('.scene');
const spreads = [...document.querySelectorAll('.book-spread')];
const previousButton = document.querySelector('.previous-page');
const nextButton = document.querySelector('.next-page');
const pageStatus = document.querySelector('#page-status');
const pageTurner = document.querySelector('.page-turner');
const bookInstruction = document.querySelector('#book-instruction');

let openness = 0;
let currentPage = 1;
let rotationX = 0;
let rotationY = 0;
let bookLaidDown = false;
let startX = 0;
let startY = 0;
let startRotationX = 0;
let startRotationY = 0;
let dragging = false;
let moved = false;
let dragAxis = null;
let animationFrame = 0;
let tiltAnimationFrame = 0;
let turning = false;
let showingBackCover = false;

const clamp = value => Math.min(1, Math.max(0, value));

const renderBook = () => {
  root.style.setProperty('--open', openness.toFixed(3));
  root.style.setProperty('--view-x', rotationX.toFixed(2));
  root.style.setProperty('--view-y', rotationY.toFixed(2));
  scene.classList.toggle('is-book-open', openness > .92);
  scene.classList.toggle('is-book-laid', bookLaidDown);
  bookInstruction.textContent = openness > .92
    ? 'DRAG TO ROTATE / TILT · CLICK LEFT / RIGHT TO TURN'
    : bookLaidDown
      ? 'CLICK AGAIN TO OPEN'
      : showingBackCover
        ? 'CLICK BACK COVER TO LAY DOWN'
        : 'CLICK COVER TO LAY DOWN';
};

const animateTilt = target => {
  cancelAnimationFrame(tiltAnimationFrame);
  const from = rotationX;
  const startedAt = performance.now();
  const duration = 520;

  const tick = now => {
    const elapsed = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    rotationX = from + (target - from) * eased;
    renderBook();
    if (elapsed < 1) tiltAnimationFrame = requestAnimationFrame(tick);
  };

  tiltAnimationFrame = requestAnimationFrame(tick);
};

const layDownBook = () => {
  if (bookLaidDown) return;
  bookLaidDown = true;
  animateTilt(60);
};

const renderPage = () => {
  control.dataset.page = String(currentPage);
  control.classList.toggle('page-one-current', currentPage === 1);
  spreads.forEach(spread => {
    spread.classList.toggle('is-active', Number(spread.dataset.spread) === currentPage);
  });
  pageStatus.textContent = `${String(currentPage).padStart(2, '0')} / 04`;
  previousButton.disabled = turning;
  nextButton.disabled = turning;
};

const animateOpen = target => {
  cancelAnimationFrame(animationFrame);
  const from = openness;
  const startedAt = performance.now();
  const duration = 420;

  const tick = now => {
    const elapsed = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 3);
    openness = clamp(from + (target - from) * eased);
    renderBook();
    if (elapsed < 1) animationFrame = requestAnimationFrame(tick);
  };

  animationFrame = requestAnimationFrame(tick);
};

const finishClosing = () => {
  window.setTimeout(() => {
    turning = false;
    renderPage();
    renderBook();
  }, 980);
};

const closeToFront = () => {
  if (turning || openness < .92) return;
  turning = true;
  showingBackCover = false;
  control.classList.remove('show-back-cover');
  renderPage();
  animateOpen(0);

  window.setTimeout(() => {
    bookLaidDown = false;
    rotationY = 0;
    animateTilt(0);
  }, 430);

  finishClosing();
};

const closeToBack = () => {
  if (turning || openness < .92) return;
  turning = true;
  renderPage();
  animateOpen(0);

  window.setTimeout(() => {
    showingBackCover = true;
    control.classList.add('show-back-cover');
    bookLaidDown = false;
    rotationY = 0;
    animateTilt(0);
  }, 430);

  finishClosing();
};

const openFromBack = () => {
  showingBackCover = false;
  control.classList.remove('show-back-cover');
  currentPage = 4;
  renderPage();
  animateOpen(1);
};

const goToPage = page => {
  if (turning || openness < .92) return;
  if (page < 1) {
    closeToFront();
    return;
  }
  if (page > 4) {
    closeToBack();
    return;
  }

  const nextPage = page;
  if (nextPage === currentPage) return;

  const direction = nextPage > currentPage ? 'next' : 'previous';
  turning = true;
  renderPage();
  pageTurner.classList.remove('turn-next', 'turn-previous');
  pageTurner.classList.add(direction === 'next' ? 'turn-next' : 'turn-previous');

  window.setTimeout(() => {
    currentPage = nextPage;
    renderPage();
  }, 270);

  window.setTimeout(() => {
    pageTurner.classList.remove('turn-next', 'turn-previous');
    turning = false;
    renderPage();
  }, 580);
};

control.addEventListener('pointerdown', event => {
  dragging = true;
  moved = false;
  dragAxis = null;
  startX = event.clientX;
  startY = event.clientY;
  startRotationX = rotationX;
  startRotationY = rotationY;
  control.classList.add('is-dragging');
  control.setPointerCapture(event.pointerId);
});

control.addEventListener('pointermove', event => {
  if (!dragging) return;
  const deltaX = event.clientX - startX;
  const deltaY = event.clientY - startY;
  if (Math.hypot(deltaX, deltaY) > 6) {
    moved = true;
    if (!dragAxis) dragAxis = Math.abs(deltaX) >= Math.abs(deltaY) ? 'horizontal' : 'vertical';
  }
  if (dragAxis === 'horizontal' && openness > .92) {
    rotationY = startRotationY + deltaX * .18;
  }
  if (dragAxis === 'vertical' && openness > .92) {
    rotationX = Math.min(75, Math.max(45, startRotationX - deltaY * .12));
  }
  renderBook();
});

control.addEventListener('pointerup', event => {
  if (!dragging) return;
  dragging = false;
  control.classList.remove('is-dragging');
  control.releasePointerCapture(event.pointerId);
  if (!moved) {
    if (!bookLaidDown) layDownBook();
    else if (openness < .92) {
      if (showingBackCover) openFromBack();
      else animateOpen(1);
    }
    else {
      const bounds = control.getBoundingClientRect();
      if (event.clientX >= bounds.left + bounds.width / 2) goToPage(currentPage + 1);
      else goToPage(currentPage - 1);
    }
  }
});

control.addEventListener('pointercancel', () => {
  dragging = false;
  control.classList.remove('is-dragging');
});

control.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!bookLaidDown) layDownBook();
    else if (openness < .92) {
      if (showingBackCover) openFromBack();
      else animateOpen(1);
    }
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    if (event.shiftKey) {
      rotationY += event.key === 'ArrowRight' ? 15 : -15;
      renderBook();
    } else {
      goToPage(currentPage + (event.key === 'ArrowRight' ? 1 : -1));
    }
  }
});

previousButton.addEventListener('click', () => goToPage(currentPage - 1));
nextButton.addEventListener('click', () => goToPage(currentPage + 1));

renderPage();
renderBook();
