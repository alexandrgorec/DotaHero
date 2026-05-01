const galleryView = document.querySelector("#gallery-view");
const detailView = document.querySelector("#detail-view");
const heroGrid = document.querySelector("#hero-grid");
const randomButton = document.querySelector("#random-button");
const backButton = document.querySelector("#back-button");
const hintButton = document.querySelector("#hint-button");
const hardcoreButton = document.querySelector("#hardcore-button");
const hardcoreText = document.querySelector("#hardcore-text");
const selectedHero = document.querySelector("#selected-hero");
const heroCount = document.querySelector("#hero-count");
const statusMessage = document.querySelector("#status-message");

let heroes = [];
let selectedHeroData = null;
let hiddenAbilityIndexes = [];
let selectedHeroMedia = null;
let selectedHeroPreviewImage = null;
let selectedHeroDefaultImage = "";
let selectedHeroDefaultAlt = "";
let selectedPreviewAbilityIndex = null;
const RUSSIAN_ALPHABET = [
  "А",
  "Б",
  "В",
  "Г",
  "Д",
  "Е",
  "Ё",
  "Ж",
  "З",
  "И",
  "Й",
  "К",
  "Л",
  "М",
  "Н",
  "О",
  "П",
  "Р",
  "С",
  "Т",
  "У",
  "Ф",
  "Х",
  "Ц",
  "Ч",
  "Ш",
  "Щ",
  "Ъ",
  "Ы",
  "Ь",
  "Э",
  "Ю",
  "Я"
];

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#ffb3a8" : "";
}

function clearStatus() {
  statusMessage.textContent = "";
  statusMessage.style.color = "";
}

function resetHardcoreText() {
  hardcoreText.hidden = true;
  hardcoreText.textContent = "";
}

function updateHintButtonState() {
  const abilityCount = Array.isArray(selectedHeroData?.abilities) ? selectedHeroData.abilities.length : 0;
  const hasRevealableAbilities = hiddenAbilityIndexes.length > 0;

  hintButton.disabled = !hasRevealableAbilities;
  hintButton.hidden = abilityCount === 0;
  hintButton.textContent = hasRevealableAbilities
    ? "Подсказка"
    : abilityCount > 0
      ? "Все способности открыты"
      : "Нет способностей";
}

function getDefaultHeroObjectFit() {
  return window.matchMedia("(max-width: 720px)").matches ? "contain" : "cover";
}

function setActiveAbilityCard(index) {
  const abilityCards = selectedHero.querySelectorAll(".hero-ability");

  abilityCards.forEach((card) => {
    card.classList.toggle("is-active-preview", card.dataset.abilityIndex === String(index));
  });
}

function showSelectedHeroAbility(ability, index) {
  if (!selectedHeroPreviewImage || !selectedHeroMedia) {
    return;
  }

  selectedHeroPreviewImage.src = ability.image;
  selectedHeroPreviewImage.alt = ability.name;
  selectedHeroPreviewImage.style.objectFit = "contain";
  selectedHeroMedia.classList.add("is-previewing-ability");
  selectedPreviewAbilityIndex = index;
  setActiveAbilityCard(index);
}

function restoreSelectedHeroImage() {
  if (!selectedHeroPreviewImage || !selectedHeroMedia) {
    return;
  }

  selectedHeroPreviewImage.src = selectedHeroDefaultImage;
  selectedHeroPreviewImage.alt = selectedHeroDefaultAlt;
  selectedHeroPreviewImage.style.objectFit = getDefaultHeroObjectFit();
  selectedHeroMedia.classList.remove("is-previewing-ability");
  selectedPreviewAbilityIndex = null;
  setActiveAbilityCard(null);
}

function createImageOrFallback({ src, alt, fallbackText, className = "" }) {
  const wrapper = document.createElement("div");

  if (className) {
    wrapper.className = className;
  }

  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";

  image.addEventListener("error", () => {
    const fallback = document.createElement("div");
    fallback.className = "image-fallback";
    fallback.textContent = fallbackText;
    wrapper.replaceChildren(fallback);
  });

  wrapper.appendChild(image);
  return wrapper;
}

function renderGallery() {
  heroGrid.replaceChildren();

  heroes.forEach((hero) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "hero-card";
    card.setAttribute("aria-label", `Выбрать героя ${hero.nameRu}`);
    card.addEventListener("click", () => renderHeroDetail(hero));

    const media = createImageOrFallback({
      src: hero.image,
      alt: hero.nameRu,
      fallbackText: `Изображение героя ${hero.nameRu} недоступно`
    });

    const body = document.createElement("div");
    body.className = "hero-card-body";

    const title = document.createElement("h3");
    title.textContent = hero.nameRu;

    body.appendChild(title);
    card.append(media, body);
    heroGrid.appendChild(card);
  });

  galleryView.hidden = false;
  detailView.hidden = true;
  document.body.classList.remove("detail-mode");
  selectedHeroData = null;
  hiddenAbilityIndexes = [];
  selectedHeroMedia = null;
  selectedHeroPreviewImage = null;
  selectedHeroDefaultImage = "";
  selectedHeroDefaultAlt = "";
  selectedPreviewAbilityIndex = null;
  hintButton.disabled = true;
  hintButton.hidden = false;
  hintButton.textContent = "Подсказка";
  resetHardcoreText();
}

function createAbilityCard(ability, index) {
  const abilityCard = document.createElement("div");
  abilityCard.className = "hero-ability";
  abilityCard.dataset.abilityIndex = String(index);
  abilityCard.setAttribute("aria-label", "Скрытая способность");

  const abilityInner = document.createElement("div");
  abilityInner.className = "hero-ability-inner";

  const abilityBack = document.createElement("div");
  abilityBack.className = "hero-ability-face hero-ability-back";
  abilityBack.setAttribute("aria-hidden", "true");
  abilityBack.textContent = "?";

  const abilityFront = createImageOrFallback({
    src: ability.image,
    alt: ability.name,
    fallbackText: ability.name,
    className: "hero-ability-face hero-ability-front"
  });

  abilityInner.append(abilityBack, abilityFront);
  abilityCard.appendChild(abilityInner);

  abilityCard.addEventListener("click", () => {
    if (!abilityCard.classList.contains("is-revealed")) {
      return;
    }

    if (selectedPreviewAbilityIndex === index) {
      restoreSelectedHeroImage();
      return;
    }

    showSelectedHeroAbility(ability, index);
  });

  return abilityCard;
}

function revealRandomAbility() {
  if (!selectedHeroData || hiddenAbilityIndexes.length === 0) {
    updateHintButtonState();
    return;
  }

  const randomPosition = Math.floor(Math.random() * hiddenAbilityIndexes.length);
  const [abilityIndex] = hiddenAbilityIndexes.splice(randomPosition, 1);
  const ability = selectedHeroData.abilities[abilityIndex];
  const abilityCard = selectedHero.querySelector(`[data-ability-index="${abilityIndex}"]`);

  if (abilityCard) {
    abilityCard.classList.add("is-revealed");
    abilityCard.title = ability.name;
    abilityCard.setAttribute("aria-label", `Способность: ${ability.name}`);
  }

  updateHintButtonState();
}

function addHardcoreChallenge() {
  const randomIndex = Math.floor(Math.random() * RUSSIAN_ALPHABET.length);
  const letter = RUSSIAN_ALPHABET[randomIndex];
  hardcoreText.textContent = `Объясняй на букву ${letter}`;
  hardcoreText.hidden = false;
}

function renderHeroDetail(hero) {
  selectedHeroData = hero;
  hiddenAbilityIndexes = Array.isArray(hero.abilities) ? hero.abilities.map((_, index) => index) : [];
  selectedHero.replaceChildren();
  resetHardcoreText();

  const media = createImageOrFallback({
    src: hero.image,
    alt: hero.nameRu,
    fallbackText: `Изображение героя ${hero.nameRu} недоступно`,
    className: "selected-hero-media"
  });
  const mediaImage = media.querySelector("img");
  media.addEventListener("click", () => {
    if (selectedPreviewAbilityIndex !== null) {
      restoreSelectedHeroImage();
    }
  });

  const copy = document.createElement("div");
  copy.className = "selected-hero-copy";

  const title = document.createElement("h2");
  title.textContent = hero.nameRu;

  copy.appendChild(title);

  if (Array.isArray(hero.abilities) && hero.abilities.length) {
    const abilitiesRow = document.createElement("div");
    abilitiesRow.className = "hero-abilities-row";

    const abilitiesList = document.createElement("div");
    abilitiesList.className = "hero-abilities";
    abilitiesList.setAttribute("aria-label", `Способности героя ${hero.nameRu}`);

    hero.abilities.forEach((ability, index) => {
      abilitiesList.appendChild(createAbilityCard(ability, index));
    });

    abilitiesRow.append(abilitiesList, hintButton);
    copy.appendChild(abilitiesRow);
  }

  selectedHero.append(media, copy);

  selectedHeroMedia = media;
  selectedHeroPreviewImage = mediaImage;
  selectedHeroDefaultImage = hero.image;
  selectedHeroDefaultAlt = hero.nameRu;
  selectedHeroPreviewImage.style.objectFit = getDefaultHeroObjectFit();
  selectedPreviewAbilityIndex = null;

  galleryView.hidden = true;
  detailView.hidden = false;
  document.body.classList.add("detail-mode");
  updateHintButtonState();
}

function pickRandomHero() {
  if (!heroes.length) {
    return;
  }

  const randomIndex = Math.floor(Math.random() * heroes.length);
  renderHeroDetail(heroes[randomIndex]);
}

async function loadHeroes() {
  showStatus("Загружаю героев...");

  try {
    const response = await fetch("/api/heroes");

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || !data.length) {
      throw new Error("Hero list is empty");
    }

    heroes = data;
    heroCount.textContent = `Всего героев: ${heroes.length}`;
    randomButton.disabled = false;
    clearStatus();
    renderGallery();
  } catch (error) {
    heroCount.textContent = "Не удалось загрузить героев";
    showStatus("Ошибка загрузки списка героев. Проверь, что сервер запущен и данные синхронизированы.", true);
    console.error(error);
  }
}

randomButton.addEventListener("click", pickRandomHero);
backButton.addEventListener("click", renderGallery);
hintButton.addEventListener("click", revealRandomAbility);
hardcoreButton.addEventListener("click", addHardcoreChallenge);

loadHeroes();
