// ==========================================
// Rules for the cards
// ==========================================

const SIZE_MIN = 150;
const SIZE_MAX = 400;
const SIZE_INCREMENT = 50;
const SIZE_DEFAULT = 250;

function getDynamicSeedUrl() {
  // Generates a random number between 1 and 2000
  const randomId = Math.floor(Math.random() * 2000) + 1;
  return `https://picsum.photos/seed/${randomId}/800/450`;
}

// random sizes for each card
const SEED_SIZES = [150, 200, 250, 300, 350, 400];

// ==========================================
// State of cards, drag and history
// ==========================================

let cards = [];
let nextId = 0;
let selectedId = null;

let dragId = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

let history = [];
let future = [];

// ==========================================
// Utilities + Helper(s)
// ==========================================

function makeId() {
  return nextId++;
}

// allows whatever user typed into the URL box -> cleans it up before using it
// if missing http at start, will return http + url pasted in.
function fixUrl(raw) {
  const url = raw.trim();
  if (!url) return null;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "http://" + url;
  }
  return url;
}

// clamp makes sure that value never goes over/AND under (max/min value)
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomItem(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

// ====================
// Undo/Redo (History)
// ====================

// saving a snapshot of the cards before making any changes
function saveHistory() {
  history.push(JSON.stringify(cards));
  // clearing the future since a new action was taken
  future = [];
}

// going back to the previous state
function undo() {
  if (history.length === 0) return;
  // saving current state, to be able to redo it
  future.push(JSON.stringify(cards));
  // restores the last saved state
  cards = JSON.parse(history.pop());
  render();
}

// going forward to a state that was undone
function redo() {
  if (future.length === 0) return;
  history.push(JSON.stringify(cards));
  cards = JSON.parse(future.pop());
  render();
}

// ==========================================
// Card Actions
// ==========================================

function addCard(src) {
  saveHistory();
  cards.push({
    id: makeId(),
    src,
    size: SIZE_DEFAULT,
    editing: false,
    poppedOut: false,
    x: 50,
    y: 50,
  });
  render();
}

function deleteCard(id) {
  saveHistory();
  cards = cards.filter((card) => card.id !== id);
  render();
}

function toggleEdit(id) {
  cards.forEach((card) => {
    // if the card is our target, we will flip its state, if not we will close it
    card.editing = card.id === id ? !card.editing : false;
  });
  render();
}

function moveCard(id, dir) {
  saveHistory();
  const idx = cards.findIndex((card) => card.id === id);
  const target = cards[idx];

  // skip the card if it is missing or popped out
  if (!target || target.poppedOut) return;

  const newIdx = clamp(idx + dir, 0, cards.length - 1);
  if (newIdx === idx) return;

  // swapping logic for two cards
  const temp = cards[idx];
  cards[idx] = cards[newIdx];
  cards[newIdx] = temp;

  render();
}

function resizeCard(id, delta) {
  saveHistory();
  const card = cards.find((card) => card.id === id);
  if (card) {
    card.size = clamp(card.size + delta, SIZE_MIN, SIZE_MAX);
    render();
  }
}

function popCard(id) {
  saveHistory();
  const card = cards.find((card) => card.id === id);
  if (!card) return;

  card.poppedOut = !card.poppedOut;

  if (card.poppedOut) {
    // start the card roughly centered on screen
    const cardWidthPercent = (card.size / window.innerWidth) * 100;
    const cardHeightPercent = ((card.size * 9) / 16 / window.innerHeight) * 100;
    card.x = 50 - cardWidthPercent / 2;
    card.y = 50 - cardHeightPercent / 2;
  } else {
    // popping it back in and move to end of list
    cards = cards.filter((card) => card.id !== id);
    cards.push(card);
  }
  render();
}

function movePoppedCard(id, dx, dy) {
  const card = cards.find((card) => card.id === id);
  if (card) {
    // moving card by the x and y direction, using clamp to stay on screen
    card.x = clamp(card.x + dx, 0, 90);
    card.y = clamp(card.y + dy, 0, 90);
    render();
  }
}

function clearCards() {
  saveHistory();
  cards = [];
  render();
}

function seedCard() {
  saveHistory();

  // generating a random num from 1 - 6
  const randomCount = Math.floor(Math.random() * 6) + 1;

  for (let i = 0; i < randomCount; i++) {
    const src = getDynamicSeedUrl();
    const size = randomItem(SEED_SIZES);
    cards.push({
      id: makeId(),
      src: src,
      size: size,
      editing: false,
      poppedOut: false,
      x: 50,
      y: 50,
    });
  }
  render();
}

// ==========================================
// Building Card Elements
// ==========================================

function buildButton(cls, label, title) {
  const btn = document.createElement("button");
  btn.className = cls;
  btn.textContent = label;
  btn.title = title;
  btn.type = "button";
  return btn;
}

// Returns a fully assembled card element, ready for render() to place on the board.
function buildCard(card) {
  // creating card container
  const article = document.createElement("article");
  article.dataset.id = card.id;
  article.style.setProperty("--card-size", card.size + "px");

  // setting the cards class based on its current state (editing/popped-out)
  article.className = `card ${card.editing ? "editing" : ""} ${card.poppedOut ? "popped-out" : ""}`;

  // creating the image
  const img = document.createElement("img");
  img.src = card.src;
  img.alt = "";
  img.draggable = false;

  // creating the control w/buttons
  const controls = document.createElement("div");
  controls.className = "card-controls";

  const topRow = document.createElement("div");
  topRow.className = "control-top";
  topRow.append(buildButton("btn-delete", "x"), buildButton("btn-pop", "□"));

  const midRow = document.createElement("div");
  midRow.className = "control-mid";
  midRow.append(buildButton("btn-size-up", "+"), buildButton("btn-size-down", "-"));

  const bottomRow = document.createElement("div");
  bottomRow.className = "controls-bottom";

  // Floating cards get directional arrows, non-floating cards get reorder arrows.
  card.poppedOut
    ? bottomRow.append(
        buildButton("btn-move-up", "↑"),
        buildButton("btn-move-down", "↓"),
        buildButton("btn-move-right", "→"),
        buildButton("btn-move-left", "←"),
      )
    : bottomRow.append(buildButton("btn-move-left", "<"), buildButton("btn-move-right", ">"));

  controls.append(topRow, midRow, bottomRow);
  article.append(img, controls);

  // card position when popped-out
  if (card.poppedOut) {
    article.classList.add("popped-out");
    article.style.left = card.x + "vw";
    article.style.top = card.y + "vh";
  }

  if (card.id === selectedId) {
    article.classList.add("selected");
  }
  return article;
}

// ==========================================
// Modal (popup (add image))
// ==========================================

const form = document.querySelector(".newPictureForm");
const urlInput = document.querySelector("#newPicUrl");

function openModal() {
  form.classList.remove("displayNone");
  urlInput.value = "";
  urlInput.focus();
}

function closeModal() {
  form.classList.add("displayNone");
}

function submitAdd(keepOpen) {
  const url = fixUrl(urlInput.value);
  if (!url) return;
  addCard(url);

  if (keepOpen) {
    urlInput.value = "";
    urlInput.focus();
  } else {
    closeModal();
  }
}

// =============================
// Event Listeners (Delegation)
// =============================

// card controls
document.querySelector(".cardholder").addEventListener("click", (e) => {
  const cardElement = e.target.closest(".card");
  const clicked = e.target;
  if (!cardElement) return;

  const id = Number(cardElement.dataset.id);
  const target = cards.find((card) => card.id === id);

  // handles the img being clicked on
  if (clicked.matches("img")) {
    toggleEdit(id);
    return;
  }

  switch (true) {
    case clicked.matches(".btn-delete"):
      deleteCard(id);
      break;

    case clicked.matches(".btn-pop"):
      popCard(id);
      break;

    case clicked.matches(".btn-size-up"):
      resizeCard(id, SIZE_INCREMENT);
      break;

    case clicked.matches(".btn-size-down"):
      resizeCard(id, -SIZE_INCREMENT);
      break;

    case clicked.matches(".btn-move-right"):
      target.poppedOut ? movePoppedCard(id, 5, 0) : moveCard(id, 1);
      break;

    case clicked.matches(".btn-move-left"):
      target.poppedOut ? movePoppedCard(id, -5, 0) : moveCard(id, -1);
      break;

    case clicked.matches(".btn-move-up"):
      movePoppedCard(id, 0, -5);
      break;

    case clicked.matches(".btn-move-down"):
      movePoppedCard(id, 0, 5);
      break;
  }
});

// Header Buttons (UI)
document.querySelector(".headerForm").addEventListener("click", (e) => {
  e.preventDefault();
  if (e.target.matches(".buttonAddImage")) openModal();
  else if (e.target.matches(".buttonClearCards")) clearCards();
  else if (e.target.matches(".buttonSeedCards")) seedCard();
  else if (e.target.matches(".buttonHelp")) openHelp();
  else if (e.target.matches(".buttonUndo")) undo();
  else if (e.target.matches(".buttonRedo")) redo();
});

// keybind actions
document.addEventListener("keydown", (e) => {
  // undo/redo
  if (e.key === "z") return undo();
  if (e.key === "x") return redo();

  if (cards.length === 0) return;

  // Tab Navigation
  if (e.key === "Tab") {
    e.preventDefault();
    selectedId = getNextCardId(selectedId, e.shiftKey);
    return render();
  }

  // Action Logic
  if (selectedId === null) return;
  handleCardAction(e.key, selectedId);
});

// Helper functions
function getNextCardId(currentId, reverse) {
  const currentIdx = cards.findIndex((card) => card.id === currentId);
  const direction = reverse ? -1 : 1;

  let nextIndex = (currentIdx + direction + cards.length) % cards.length;
  return cards[nextIndex].id;
}

function handleCardAction(key, id) {
  const target = cards.find((card) => card.id === id);
  const isPopped = target?.poppedOut;

  switch (key) {
    // Movement Up
    case "w":
    case "ArrowUp":
      movePoppedCard(id, 0, -5);
      break;

    // Movement Down
    case "s":
    case "ArrowDown":
      movePoppedCard(id, 0, 5);
      break;

    // Movement Left
    case "a":
    case "ArrowLeft":
      isPopped ? movePoppedCard(id, -5, 0) : moveCard(id, -1);
      break;

    // Movement Right
    case "d":
    case "ArrowRight":
      isPopped ? movePoppedCard(id, 5, 0) : moveCard(id, 1);
      break;

    // Extra Utilities
    case "+":
      resizeCard(id, SIZE_INCREMENT);
      break;
    case "-":
      resizeCard(id, -SIZE_INCREMENT);
      break;
    case "p":
      popCard(id);
      break;

    // if no key, exits out.
    default:
      return;
  }
  render();
}

// Modal (popup UI (add images)) Listeners
form.addEventListener("click", (e) => {
  e.preventDefault();
  const clicked = e.target;

  switch (true) {
    case clicked.matches(".buttonApproveAdd"):
      submitAdd(false);
      break;

    case clicked.matches(".buttonApproveAddMore"):
      submitAdd(true);
      break;

    case clicked.matches(".buttonCancelAdd"):
      closeModal();
      break;

    case clicked.matches(".buttonAddRandom"): {
      const count = Math.floor(Math.random() * 4) + 1; // picking random num, between 1 and 4
      for (let i = 0; i < count; i++) {
        addCard(getDynamicSeedUrl());
      }
      closeModal();
      break;
    }
  }
});

// closes modal (popup (add image)) if clicked outside
document.addEventListener("click", (e) => {
  const modalIsOpen = !form.classList.contains("displayNone");
  const clickedOutsideModal = !form.contains(e.target);
  const clickedAddButton = e.target.matches(".buttonAddImage");

  if (modalIsOpen && clickedOutsideModal && !clickedAddButton) {
    closeModal();
  }
});

// =============
// Help Overlay
// =============

function openHelp() {
  document.querySelector(".helpOverlay").classList.remove("displayNone");
}

function closeHelp() {
  document.querySelector(".helpOverlay").classList.add("displayNone");
}

document.querySelector(".helpClose").addEventListener("click", closeHelp);

// ======================================
// Drag and Drop (popped-out cards only)
// ======================================

// when mouse pressed, starts the dragging
document.querySelector(".cardholder").addEventListener("mousedown", (e) => {
  const cardElement = e.target.closest(".card.popped-out");
  if (!cardElement) return;

  dragId = Number(cardElement.dataset.id);

  const rect = cardElement.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
});

// While dragging, updating its current position
document.addEventListener("mousemove", (e) => {
  if (dragId === null) return;

  const card = cards.find((card) => card.id === dragId);
  if (!card) return;

  // figuring out where the mouse is on the screen as a percentage
  const mouseXPercent = ((e.clientX - dragOffsetX) / window.innerWidth) * 100;
  const mouseYPercent = ((e.clientY - dragOffsetY) / window.innerHeight) * 100;

  // calculating how much space the card takes up on users screen
  const cardWidthPercent = (card.size / window.innerWidth) * 100;
  const cardHeightPercent = ((card.size * 9) / 16 / window.innerHeight) * 100;

  // applying the position, using clamped so card never goes off screen
  card.x = clamp(mouseXPercent, 0, 100 - cardWidthPercent);
  card.y = clamp(mouseYPercent, 0, 100 - cardHeightPercent);

  render();
});

// when mouse is released, it stops dragging
document.addEventListener("mouseup", () => {
  if (dragId !== null) {
    saveHistory();
  }
  dragId = null;
});

// ===============================================
// Saves to browser memory and rebuilds all cards.
// ===============================================

function render() {
  localStorage.setItem("MoodJortsCards", JSON.stringify(cards));
  const board = document.querySelector(".cardholder");

  // update undo/redo button appearance
  document.querySelector(".buttonUndo").classList.toggle("can-undo", history.length > 0);
  document.querySelector(".buttonRedo").classList.toggle("can-redo", future.length > 0);

  // Clearing the board instantly
  board.innerHTML = "";

  for (let card of cards) {
    board.appendChild(buildCard(card));
  }
}

// loading saved cards from localstorage on page load
const saved = localStorage.getItem("MoodJortsCards");
if (saved) {
  cards = JSON.parse(saved);
  // every new card gets new (unique) ID, after page refresh.
  nextId = cards.length > 0 ? Math.max(...cards.map((card) => card.id)) + 1 : 0;
}
render();

console.log(`Mood Jorts Keybinds:
  Tab             - select next card
  Shift+Tab       - select previous card
  w / s           - move popped-out card up / down
  ArrowUp/Down    - alternative for W / S
  a / d           - reorder card (or move popped-out card left / right)
  ArrowLeft/Right - alternative for A / D
  Shift+          - grows selected card
  -               - shrink selected card
  p               - pop out / pop in selected card
  z               - undo changes
  x               - redo changes
`);
