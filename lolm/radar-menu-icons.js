// Menu illustrations identify categories even before a match starts. Map
// markers continue to use each device's runtime local-minimap image routes.
const TYPE_ART = Object.freeze({
  tower: 'fangyuta_blue', ward: 'ui_in_icon_falseeye_blue',
  trap: 'teemo_blue', health_fruit: 'fruitminimap'
});
const SYMBOL_ART = Object.freeze({
  tower: 'fangyuta_blue', eye: 'ui_in_icon_falseeye_blue',
  fruit: 'fruitminimap', jungle: 'bluebuff', clock: 'dragon_time'
});

export function createMenuSymbol(name, className = 'icon') {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const use = document.createElementNS(icon.namespaceURI, 'use');
  icon.setAttribute('class', className);
  icon.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', `#icon-${name}`);
  icon.append(use);
  return icon;
}

export function createMenuArt(name, type, className) {
  const art = document.createElement('span');
  art.className = `menu-art ${className || ''}`;
  art.setAttribute('aria-hidden', 'true');
  const source = type ? TYPE_ART[type] : SYMBOL_ART[name];
  const fallback = createMenuSymbol(name);
  if (source) {
    const image = document.createElement('img');
    image.alt = '';
    image.draggable = false;
    image.src = `/assets/minimap/${source}.png`;
    fallback.hidden = true;
    image.addEventListener('error', () => { image.hidden = true; fallback.hidden = false; }, {once: true});
    art.append(image);
  }
  art.append(fallback);
  return art;
}

export function applyMenuArt() {
  // Replace decorative illustrations, preserving button names and semantics.
  for (const icon of document.querySelectorAll('[data-menu-art]')) {
    icon.replaceWith(createMenuArt(icon.dataset.menuArt, null, icon.dataset.artClass));
  }
}
