import { BUSINESS } from "./config.js";

const storageKey = "sesamie-map-consent-v1";
const preferenceLifetime = 180 * 24 * 60 * 60 * 1000;
const copy = {
  de: {
    settings: "Cookie-Einstellungen",
    description: "Wir speichern Ihre Auswahl in diesem Browser. Wenn Sie Google Maps erlauben, kann Google Ihre IP-Adresse und Browserdaten verarbeiten und Cookies setzen.",
    policy: "Datenschutzerklärung",
    decline: "Nur notwendige",
    accept: "Google Maps erlauben",
    mapPlaceholder: "Die Karte von Google Maps wird erst nach Ihrer Einwilligung geladen.",
    mapTitle: "Standort von SESAMIE auf Google Maps"
  },
  en: {
    settings: "Cookie settings",
    description: "We save your choice in this browser. If you allow Google Maps, Google may process your IP address and browser data and set cookies.",
    policy: "Privacy policy (German)",
    decline: "Essential only",
    accept: "Allow Google Maps",
    mapPlaceholder: "The Google Maps embed loads once you give your consent.",
    mapTitle: "SESAMIE location on Google Maps"
  }
};

document.body.insertAdjacentHTML("beforeend", `
  <section class="cookie-banner" aria-labelledby="cookie-banner-title" hidden>
    <h2 id="cookie-banner-title" data-privacy-copy="settings" tabindex="-1"></h2>
    <p data-privacy-copy="description"></p>
    <a href="./datenschutz.html" data-privacy-copy="policy"></a>
    <div class="cookie-banner__actions">
      <button class="privacy-button" type="button" data-map-choice="decline" data-privacy-copy="decline"></button>
      <button class="privacy-button" type="button" data-map-choice="allow" data-privacy-copy="accept"></button>
    </div>
  </section>
`);

const banner = document.querySelector(".cookie-banner");
const bannerTitle = document.querySelector("#cookie-banner-title");
const settingsButtons = [...document.querySelectorAll("[data-cookie-settings]")];
const textNodes = document.querySelectorAll("[data-privacy-copy]");
const map = document.querySelector("[data-site-map]");
const mapPlaceholder = map?.querySelector("[data-map-placeholder]");
let mapFrame = null;
let settingsOpener = null;

function currentCopy() {
  return document.documentElement.lang === "en" ? copy.en : copy.de;
}

function updateCopy() {
  const translation = currentCopy();
  settingsButtons.forEach((button) => { button.textContent = translation.settings; });
  textNodes.forEach((node) => { node.textContent = translation[node.dataset.privacyCopy]; });
  if (mapFrame) mapFrame.title = translation.mapTitle;
}

function getPreference() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.expiresAt > Date.now() && ["allow", "decline"].includes(saved.choice)) {
      return saved.choice;
    }
    if (saved) localStorage.removeItem(storageKey);
  } catch {
    // A blocked store or invalid value leaves Google Maps disabled.
  }
  return null;
}

function updateMap(choice) {
  if (!map) return;
  const allowed = choice === "allow";
  mapPlaceholder.hidden = allowed;

  if (allowed && !mapFrame) {
    mapFrame = document.createElement("iframe");
    mapFrame.title = currentCopy().mapTitle;
    mapFrame.loading = "lazy";
    mapFrame.referrerPolicy = "no-referrer";
    mapFrame.allowFullscreen = true;
    mapFrame.src = BUSINESS.mapEmbedUrl;
    map.append(mapFrame);
  } else if (!allowed && mapFrame) {
    mapFrame.remove();
    mapFrame = null;
  }
}

function syncPreference() {
  const choice = getPreference();
  banner.hidden = Boolean(choice);
  updateMap(choice);
}

settingsButtons.forEach((button) => {
  button.hidden = false;
  button.addEventListener("click", () => {
    settingsOpener = button;
    banner.hidden = false;
    bannerTitle.focus();
  });
});

banner.querySelectorAll("[data-map-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    const choice = button.dataset.mapChoice;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ choice, expiresAt: Date.now() + preferenceLifetime }));
    } catch {
      // Apply the choice on this page even when browser storage is unavailable.
    }
    banner.hidden = true;
    updateMap(choice);
    if (settingsOpener) {
      const focusTarget = settingsOpener.closest("[hidden]") ? mapFrame : settingsOpener;
      focusTarget?.focus();
      settingsOpener = null;
    }
  });
});

window.addEventListener("storage", (event) => {
  if (event.key === storageKey || event.key === null) syncPreference();
});

new MutationObserver(updateCopy).observe(document.documentElement, { attributeFilter: ["lang"] });
updateCopy();
syncPreference();
