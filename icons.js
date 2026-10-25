/*
 * Lucide アイコン (ISC License, https://lucide.dev) を内蔵したもの。
 * build/build.py で build/icons/*.svg から自動生成しています。直接編集しないでください。
 * 古いブラウザ向けに ES5 で lucide.createIcons() と同じ使い方ができます。
 */
(function () {
  var ICONS = {
    'arrow-down': '<path d="M12 5v14" /> <path d="m19 12-7 7-7-7" />',
    'arrow-right-left': '<path d="m16 3 4 4-4 4" /> <path d="M20 7H4" /> <path d="m8 21-4-4 4-4" /> <path d="M4 17h16" />',
    'arrow-right': '<path d="M5 12h14" /> <path d="m12 5 7 7-7 7" />',
    'bell': '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /> <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />',
    'check-check': '<path d="M18 6 7 17l-5-5" /> <path d="m22 10-7.5 7.5L13 16" />',
    'check-circle-2': '<circle cx="12" cy="12" r="10" /> <path d="m9 12 2 2 4-4" />',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /> <path d="m9 11 3 3L22 4" />',
    'clipboard-check': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1" /> <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /> <path d="m9 14 2 2 4-4" />',
    'clock': '<circle cx="12" cy="12" r="10" /> <polyline points="12 6 12 12 16 14" />',
    'eraser': '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" /> <path d="M22 21H7" /> <path d="m5 11 9 9" />',
    'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /> <polyline points="14 2 14 8 20 8" /> <line x1="16" x2="8" y1="13" y2="13" /> <line x1="16" x2="8" y1="17" y2="17" /> <line x1="10" x2="8" y1="9" y2="9" />',
    'inbox': '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /> <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />',
    'keyboard': '<rect width="20" height="16" x="2" y="4" rx="2" ry="2" /> <path d="M6 8h.001" /> <path d="M10 8h.001" /> <path d="M14 8h.001" /> <path d="M18 8h.001" /> <path d="M8 12h.001" /> <path d="M12 12h.001" /> <path d="M16 12h.001" /> <path d="M7 16h10" />',
    'message-square': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />',
    'palette': '<circle cx="13.5" cy="6.5" r=".5" /> <circle cx="17.5" cy="10.5" r=".5" /> <circle cx="8.5" cy="7.5" r=".5" /> <circle cx="6.5" cy="12.5" r=".5" /> <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />',
    'pen-tool': '<path d="m12 19 7-7 3 3-7 7-3-3z" /> <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /> <path d="m2 2 7.586 7.586" /> <circle cx="11" cy="11" r="2" />',
    'plus-circle': '<circle cx="12" cy="12" r="10" /> <path d="M8 12h8" /> <path d="M12 8v8" />',
    'plus': '<path d="M5 12h14" /> <path d="M12 5v14" />',
    'radio': '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" /> <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" /> <circle cx="12" cy="12" r="2" /> <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" /> <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /> <path d="M3 3v5h5" />',
    'search': '<circle cx="11" cy="11" r="8" /> <path d="m21 21-4.3-4.3" />',
    'send': '<path d="m22 2-7 20-4-9-9-4Z" /> <path d="M22 2 11 13" />',
    'trash-2': '<path d="M3 6h18" /> <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /> <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /> <line x1="10" x2="10" y1="11" y2="17" /> <line x1="14" x2="14" y1="11" y2="17" />',
    'volume-2': '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /> <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /> <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />',
    'volume-x': '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /> <line x1="22" x2="16" y1="9" y2="15" /> <line x1="16" x2="22" y1="9" y2="15" />',
    'x': '<path d="M18 6 6 18" /> <path d="m6 6 12 12" />'
  };
  var NS = 'http://www.w3.org/2000/svg';

  function render(el) {
    var name = el.getAttribute('data-lucide');
    if (el.getAttribute('data-lucide-rendered') === name) return;
    var body = ICONS[name];
    if (!body) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = '<svg xmlns="' + NS + '" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
    var svg = wrap.firstChild;
    var attrs = el.attributes;
    for (var i = 0; i < attrs.length; i++) {
      var a = attrs[i];
      if (a.name === 'class' || a.name === 'data-lucide-rendered') continue;
      svg.setAttribute(a.name, a.value);
    }
    var cls = (el.getAttribute('class') || '').replace(/\blucide(-[a-z0-9-]+)?\b/g, '').replace(/\s+/g, ' ').trim();
    svg.setAttribute('class', 'lucide lucide-' + name + (cls ? ' ' + cls : ''));
    svg.setAttribute('data-lucide-rendered', name);
    el.parentNode.replaceChild(svg, el);
  }

  window.lucide = {
    createIcons: function () {
      var list = document.querySelectorAll('[data-lucide]');
      for (var i = 0; i < list.length; i++) render(list[i]);
    }
  };
})();
