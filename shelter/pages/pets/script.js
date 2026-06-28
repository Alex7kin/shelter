'use strict';

(() => {
  const PETS_URL = '../../assets/pets.json';
  const TOTAL_CARDS = 48;
  const ANIM_MS = 200;

  /* ---------------- shared helpers ---------------- */

  let scrollLocks = 0;
  function lockScroll() {
    scrollLocks += 1;
    document.documentElement.classList.add('no-scroll');
  }
  function unlockScroll() {
    scrollLocks = Math.max(0, scrollLocks - 1);
    if (scrollLocks === 0) document.documentElement.classList.remove('no-scroll');
  }

  // Builds one pet card with the same markup as the static Part 1-2 cards.
  function createCard(pet, index) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.index = String(index);

    const photo = document.createElement('img');
    photo.className = 'card__photo';
    photo.src = pet.img;
    photo.alt = pet.name;
    photo.loading = 'lazy';

    const name = document.createElement('h3');
    name.className = 'card__name';
    name.textContent = pet.name;

    const button = document.createElement('button');
    button.className = 'btn btn--outline card__btn';
    button.type = 'button';
    button.textContent = 'Learn more';

    card.append(photo, name, button);
    return card;
  }

  function formatList(values) {
    if (!Array.isArray(values) || values.length === 0) return 'none';
    return values.join(', ');
  }

  /* ---------------- popup (pet details) ---------------- */

  function initPopup() {
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = `
      <div class="popup__dialog" role="dialog" aria-modal="true" aria-labelledby="popup-name">
        <img class="popup__img" src="" alt="">
        <div class="popup__content">
          <h3 class="popup__name" id="popup-name"></h3>
          <h4 class="popup__type"></h4>
          <p class="popup__desc"></p>
          <ul class="popup__info">
            <li class="popup__info-item"><span class="popup__info-label">Age:</span> <span data-field="age"></span></li>
            <li class="popup__info-item"><span class="popup__info-label">Inoculations:</span> <span data-field="inoculations"></span></li>
            <li class="popup__info-item"><span class="popup__info-label">Diseases:</span> <span data-field="diseases"></span></li>
            <li class="popup__info-item"><span class="popup__info-label">Parasites:</span> <span data-field="parasites"></span></li>
          </ul>
        </div>
        <button class="popup__close" type="button" aria-label="Close">&times;</button>
      </div>`;
    document.body.append(popup);

    const dialog = popup.querySelector('.popup__dialog');
    const img = popup.querySelector('.popup__img');
    const name = popup.querySelector('.popup__name');
    const type = popup.querySelector('.popup__type');
    const desc = popup.querySelector('.popup__desc');
    const fields = {
      age: popup.querySelector('[data-field="age"]'),
      inoculations: popup.querySelector('[data-field="inoculations"]'),
      diseases: popup.querySelector('[data-field="diseases"]'),
      parasites: popup.querySelector('[data-field="parasites"]'),
    };
    const closeBtn = popup.querySelector('.popup__close');

    function open(pet) {
      img.src = pet.img;
      img.alt = pet.name;
      name.textContent = pet.name;
      type.textContent = `${pet.type} - ${pet.breed}`;
      desc.textContent = pet.description;
      fields.age.textContent = pet.age;
      fields.inoculations.textContent = formatList(pet.inoculations);
      fields.diseases.textContent = formatList(pet.diseases);
      fields.parasites.textContent = formatList(pet.parasites);

      popup.classList.add('is-open');
      lockScroll();
      document.addEventListener('keydown', onKeydown);
    }

    function close() {
      popup.classList.remove('is-open');
      unlockScroll();
      document.removeEventListener('keydown', onKeydown);
    }

    function onKeydown(event) {
      if (event.key === 'Escape') close();
    }

    popup.addEventListener('click', (event) => {
      if (!dialog.contains(event.target)) close();
    });
    closeBtn.addEventListener('click', close);

    return open;
  }

  /* ---------------- burger menu ---------------- */

  function initBurger() {
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav');
    if (!burger || !nav) return;

    const panel = nav.querySelector('.nav__list');
    const desktop = window.matchMedia('(min-width: 768px)');
    let isOpen = false;

    function setState(open) {
      isOpen = open;
      nav.classList.toggle('is-open', open);
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      burger.setAttribute('aria-expanded', String(open));
      if (open) {
        lockScroll();
        document.addEventListener('keydown', onKeydown);
      } else {
        unlockScroll();
        document.removeEventListener('keydown', onKeydown);
      }
    }

    function onKeydown(event) {
      if (event.key === 'Escape') setState(false);
    }

    burger.addEventListener('click', () => setState(!isOpen));

    nav.addEventListener('click', (event) => {
      if (panel && !panel.contains(event.target)) setState(false);
    });

    if (panel) {
      panel.addEventListener('click', (event) => {
        if (event.target.closest('.nav__link')) setState(false);
      });
    }

    desktop.addEventListener('change', (event) => {
      if (event.matches && isOpen) setState(false);
    });
  }

  /* ---------------- pagination ---------------- */

  function getPageSize() {
    if (window.matchMedia('(min-width: 1280px)').matches) return 8;
    if (window.matchMedia('(max-width: 480px)').matches) return 3;
    return 6;
  }

  // Each pet repeated `copies` times, never two of the same pet adjacent.
  // Greedy "most remaining first" with random tie-breaks for variety per load.
  function buildSequence(petCount, copies) {
    const counts = new Array(petCount).fill(copies);
    const sequence = [];
    let prev = -1;

    for (let placed = 0; placed < petCount * copies; placed += 1) {
      let best = [];
      let bestCount = 0;
      for (let i = 0; i < petCount; i += 1) {
        if (i === prev || counts[i] === 0) continue;
        if (counts[i] > bestCount) {
          bestCount = counts[i];
          best = [i];
        } else if (counts[i] === bestCount) {
          best.push(i);
        }
      }
      const choice = best[Math.floor(Math.random() * best.length)];
      sequence.push(choice);
      counts[choice] -= 1;
      prev = choice;
    }
    return sequence;
  }

  function initPagination(pets, openPopup) {
    const grid = document.querySelector('.cards-grid');
    const nav = document.querySelector('.pagination');
    if (!grid || !nav) return;

    const controls = {
      first: nav.querySelector('[aria-label="First page"]'),
      prev: nav.querySelector('[aria-label="Previous page"]'),
      indicator: nav.querySelector('.paginator--active'),
      next: nav.querySelector('[aria-label="Next page"]'),
      last: nav.querySelector('[aria-label="Last page"]'),
    };

    const sequence = buildSequence(pets.length, TOTAL_CARDS / pets.length);
    let pageSize = getPageSize();
    let totalPages = TOTAL_CARDS / pageSize;
    let currentPage = 1;
    let isAnimating = false;

    function renderPage() {
      const start = (currentPage - 1) * pageSize;
      const slice = sequence.slice(start, start + pageSize);
      grid.replaceChildren(...slice.map((i) => createCard(pets[i], i)));
      updateControls();
    }

    function setDisabled(button, disabled) {
      button.disabled = disabled;
      button.classList.toggle('paginator--inactive', disabled);
    }

    function updateControls() {
      controls.indicator.textContent = String(currentPage);
      controls.indicator.setAttribute('aria-label', `Page ${currentPage}`);
      setDisabled(controls.first, currentPage === 1);
      setDisabled(controls.prev, currentPage === 1);
      setDisabled(controls.next, currentPage === totalPages);
      setDisabled(controls.last, currentPage === totalPages);
    }

    function goTo(page) {
      const target = Math.min(Math.max(page, 1), totalPages);
      if (target === currentPage || isAnimating) return;
      isAnimating = true;

      const out = grid.animate(
        [{ opacity: 1, transform: 'translateY(0)' },
         { opacity: 0, transform: 'translateY(12px)' }],
        { duration: ANIM_MS, easing: 'ease-in' }
      );
      out.onfinish = () => {
        currentPage = target;
        renderPage();
        const slideIn = grid.animate(
          [{ opacity: 0, transform: 'translateY(-12px)' },
           { opacity: 1, transform: 'translateY(0)' }],
          { duration: ANIM_MS, easing: 'ease-out' }
        );
        slideIn.onfinish = () => { isAnimating = false; };
      };
    }

    controls.first.addEventListener('click', () => goTo(1));
    controls.prev.addEventListener('click', () => goTo(currentPage - 1));
    controls.next.addEventListener('click', () => goTo(currentPage + 1));
    controls.last.addEventListener('click', () => goTo(totalPages));

    grid.addEventListener('click', (event) => {
      const card = event.target.closest('.card');
      if (!card) return;
      openPopup(pets[Number(card.dataset.index)]);
    });

    // Recompute paging when the breakpoint changes the cards-per-page.
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const nextSize = getPageSize();
        if (nextSize === pageSize) return;
        const firstCardIndex = (currentPage - 1) * pageSize;
        pageSize = nextSize;
        totalPages = TOTAL_CARDS / pageSize;
        currentPage = Math.floor(firstCardIndex / pageSize) + 1;
        renderPage();
      }, 150);
    });

    renderPage();
  }

  /* ---------------- start the app ---------------- */

  initBurger();

  fetch(PETS_URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load pets.json (${response.status})`);
      return response.json();
    })
    .then((pets) => {
      const openPopup = initPopup();
      initPagination(pets, openPopup);
    })
    .catch((error) => console.error('Failed to load pets:', error));
})();
