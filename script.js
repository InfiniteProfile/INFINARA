"use strict";

/*
 * INFINARA uses deterministic, generated profiles.
 * IDs have no preset maximum. Profiles are generated on demand,
 * not stored in a giant database. This is not a real-user directory.
 */

const grid = document.getElementById("profileGrid");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const notice = document.getElementById("notice");
const counter = document.getElementById("counter");
const sectionTitle = document.getElementById("sectionTitle");
const moreBtn = document.getElementById("moreBtn");
const loader = document.getElementById("loader");
const dialog = document.getElementById("profileDialog");
const details = document.getElementById("profileDetails");

const PAGE_SIZE = 18;
let nextId = 1n;
let displayed = 0;
let busy = false;
let mode = "browse";
let searchResults = [];
let searchIndex = 0;
let observer = null;

const firstNames = [
  "Astra", "Nova", "Riven", "Kael", "Mira", "Zeno", "Lyra", "Orion",
  "Vega", "Nyx", "Arden", "Ciel", "Echo", "Sora", "Rune", "Kairo",
  "Elara", "Onyx", "Aeris", "Sol", "Vesper", "Ren", "Aven", "Zuri"
];
const lastNames = [
  "Vale", "Noctis", "Wren", "Ashford", "Solace", "Ever", "Quill",
  "Hollow", "Dusk", "Rayne", "Winter", "Storm", "Aster", "Morrow",
  "Grey", "North", "Blake", "Frost", "Sable", "Rowan", "Drift", "Kestrel"
];
const bios = [
  "Collecting ideas from distant corners of the universe.",
  "A quiet mind with an endless curiosity.",
  "Building small things that lead to bigger discoveries.",
  "Somewhere between imagination and reality.",
  "Exploring new paths, one step at a time.",
  "A unique signal in a universe of possibilities.",
  "Here to learn, create, and keep moving forward.",
  "Every ending can become another beginning."
];

function hashId(id) {
  // Stable hash for arbitrary-length non-negative integer IDs.
  let hash = 2166136261;
  const text = id.toString();
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function profileFor(id) {
  const n = BigInt(id);
  const hash = hashId(n);
  const pick = (arr, shift = 0) => arr[((hash >>> (shift % 24)) + shift) % arr.length];
  const a = pick(firstNames, 1);
  const b = pick(lastNames, 9);
  return {
    id: n.toString(),
    name: `${a} ${b}`,
    bio: pick(bios, 17),
    symbol: (a[0] + b[0]).toUpperCase()
  };
}

function makeCard(profile) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "profile-card";
  card.setAttribute("aria-label", `Open ${profile.name}, profile ${profile.id}`);

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = profile.symbol;

  const name = document.createElement("h3");
  name.className = "profile-name";
  name.textContent = profile.name;

  const id = document.createElement("p");
  id.className = "profile-id";
  id.textContent = `PROFILE #${profile.id}`;

  const bio = document.createElement("p");
  bio.className = "profile-bio";
  bio.textContent = profile.bio;

  card.append(avatar, name, id, bio);
  card.addEventListener("click", () => openProfile(profile));
  return card;
}

function updateCounter() {
  counter.textContent = `${displayed.toLocaleString()} LOADED`;
}

function addProfiles(amount = PAGE_SIZE) {
  if (busy) return;
  busy = true;
  loader.hidden = false;
  moreBtn.disabled = true;

  // Break work into a small asynchronous batch to keep the page responsive.
  setTimeout(() => {
    const fragment = document.createDocumentFragment();
    let added = 0;

    while (added < amount) {
      let profile;

      if (mode === "search") {
        if (searchIndex >= searchResults.length) break;
        profile = profileFor(searchResults[searchIndex++]);
      } else {
        profile = profileFor(nextId);
        nextId += 1n;
      }

      fragment.appendChild(makeCard(profile));
      added++;
    }

    grid.appendChild(fragment);
    displayed += added;
    updateCounter();

    busy = false;
    loader.hidden = true;
    moreBtn.disabled = false;

    if (mode === "search" && searchIndex >= searchResults.length) {
      moreBtn.hidden = true;
      notice.textContent = `${displayed} generated profile(s) shown for this search.`;
    } else {
      moreBtn.hidden = false;
    }
  }, 0);
}

function resetGrid() {
  grid.replaceChildren();
  displayed = 0;
  updateCounter();
  moreBtn.hidden = false;
}

function cleanId(value) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  try {
    return BigInt(trimmed).toString();
  } catch {
    return null;
  }
}

function searchById(value) {
  const id = cleanId(value);
  if (id === null) {
    notice.textContent = "Enter a non-negative whole-number profile ID.";
    return;
  }

  mode = "search";
  searchResults = [id];
  searchIndex = 0;
  resetGrid();
  sectionTitle.textContent = "Search result";
  notice.textContent = `Showing generated identity #${id}.`;
  addProfiles(1);

  const url = new URL(window.location.href);
  url.searchParams.set("id", id);
  history.replaceState({}, "", url);
}

function openProfile(profile) {
  details.replaceChildren();

  const avatar = document.createElement("div");
  avatar.className = "detail-avatar";
  avatar.textContent = profile.symbol;

  const name = document.createElement("h2");
  name.className = "detail-name";
  name.textContent = profile.name;

  const id = document.createElement("p");
  id.className = "detail-id";
  id.textContent = `PROFILE ID: ${profile.id}`;

  const bio = document.createElement("p");
  bio.className = "detail-bio";
  bio.textContent = profile.bio;

  const share = document.createElement("button");
  share.className = "copy-link";
  share.type = "button";
  share.textContent = "Copy profile link";
  share.addEventListener("click", async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("id", profile.id);
    try {
      await navigator.clipboard.writeText(url.toString());
      notice.textContent = "Profile link copied.";
      share.textContent = "Copied!";
    } catch {
      window.prompt("Copy this profile link:", url.toString());
    }
  });

  details.append(avatar, name, id, bio, share);
  if (typeof dialog.showModal === "function") dialog.showModal();
  else alert(`${profile.name}\nProfile ID: ${profile.id}\n${profile.bio}`);
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchById(searchInput.value);
});

document.getElementById("randomBtn").addEventListener("click", () => {
  // Creates a very large positive integer without imposing a maximum ID.
  const digits = 20 + Math.floor(Math.random() * 20);
  let value = String(1 + Math.floor(Math.random() * 9));
  for (let i = 1; i < digits; i++) value += Math.floor(Math.random() * 10);
  searchInput.value = value;
  searchById(value);
});

document.getElementById("homeBtn").addEventListener("click", () => {
  mode = "browse";
  nextId = 1n;
  searchResults = [];
  searchIndex = 0;
  sectionTitle.textContent = "Explore identities";
  notice.textContent = "Browsing generated profiles from ID 1 onward.";
  const url = new URL(window.location.href);
  url.searchParams.delete("id");
  history.replaceState({}, "", url);
  resetGrid();
  addProfiles();
  window.scrollTo({ top: document.querySelector(".directory").offsetTop, behavior: "smooth" });
});

moreBtn.addEventListener("click", () => addProfiles());
document.getElementById("closeDialog").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

// Infinite-scroll sentinel: load another batch near the bottom.
if ("IntersectionObserver" in window) {
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.height = "1px";
  moreBtn.insertAdjacentElement("afterend", sentinel);
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting) && !busy && !moreBtn.hidden) {
      addProfiles();
    }
  }, { rootMargin: "500px" });
  observer.observe(sentinel);
}

// Deep links such as ?id=123456789012345678901234567890
const initialId = new URLSearchParams(window.location.search).get("id");
if (initialId !== null) {
  searchInput.value = initialId;
  searchById(initialId);
} else {
  addProfiles();
}
