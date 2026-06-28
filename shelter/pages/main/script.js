'use strict';

(() => {
  const PETS_URL = '../../assets/pets.json';
  const ANIM_MS = 280;

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

  // Fisher-Yates shuffle returning a new array.
  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
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

    // Close when clicking the backdrop
    nav.addEventListener('click', (event) => {
      if (panel && !panel.contains(event.target)) setState(false);
    });

    // or any navigation link inside the menu.
    if (panel) {
      panel.addEventListener('click', (event) => {
        if (event.target.closest('.nav__link')) setState(false);
      });
    }

    desktop.addEventListener('change', (event) => {
      if (event.matches && isOpen) setState(false);
    });
  }

  /* ---------------- infinite carousel ---------------- */

  function getVisibleCount() {
    if (window.matchMedia('(min-width: 1280px)').matches) return 3;
    if (window.matchMedia('(max-width: 600px)').matches) return 1;
    return 2;
  }

  function initSlider(pets, openPopup) {
    const track = document.querySelector('.pets__cards');
    const viewport = document.querySelector('.pets__viewport');
    const prevBtn = document.querySelector('.btn-arrow--prev');
    const nextBtn = document.querySelector('.btn-arrow--next');
    if (!track || !viewport || !prevBtn || !nextBtn) return;

    const allIndices = pets.map((_, i) => i);
    let visibleCount = getVisibleCount();
    let currentGroup = pickGroup([], visibleCount);
    let isAnimating = false;

    // Pick `count` unique pet indices not in `exclude`, in random order.
    function pickGroup(exclude, count) {
      const pool = allIndices.filter((i) => !exclude.includes(i));
      return shuffle(pool).slice(0, count);
    }

    function render(indices) {
      track.replaceChildren(...indices.map((i) => createCard(pets[i], i)));
    }

    function switchGroup(direction) {
      if (isAnimating) return;
      isAnimating = true;
      viewport.classList.add('is-sliding');

      const nextGroup = pickGroup(currentGroup, visibleCount);
      const outX = direction === 'next' ? -100 : 100;
      const inX = direction === 'next' ? 100 : -100;

      const out = track.animate(
        [{ transform: 'translateX(0)', opacity: 1 },
         { transform: `translateX(${outX}%)`, opacity: 0 }],
        { duration: ANIM_MS, easing: 'ease-in', fill: 'forwards' }
      );

      out.onfinish = () => {
        render(nextGroup);
        const slideIn = track.animate(
          [{ transform: `translateX(${inX}%)`, opacity: 0 },
           { transform: 'translateX(0)', opacity: 1 }],
          { duration: ANIM_MS, easing: 'ease-out', fill: 'forwards' }
        );
        slideIn.onfinish = () => {
          slideIn.cancel();
          out.cancel();
          viewport.classList.remove('is-sliding');
          currentGroup = nextGroup;
          isAnimating = false;
        };
      };
    }

    nextBtn.addEventListener('click', () => switchGroup('next'));
    prevBtn.addEventListener('click', () => switchGroup('prev'));

    track.addEventListener('click', (event) => {
      const card = event.target.closest('.card');
      if (!card) return;
      openPopup(pets[Number(card.dataset.index)]);
    });

    // Re-fit the group when the breakpoint (card count) changes.
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const next = getVisibleCount();
        if (next !== visibleCount && !isAnimating) {
          visibleCount = next;
          currentGroup = pickGroup([], visibleCount);
          render(currentGroup);
        }
      }, 150);
    });

    render(currentGroup);
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
      initSlider(pets, openPopup);
    })
    .catch((error) => console.error('Failed to load pets:', error));
})();
