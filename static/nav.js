// Shared nav bar — injected into <header id="main-nav"> on every page.
// Reads ora_auth_session_v2 from sessionStorage; redirects to / if missing.
// Hides nav items the user doesn't have unlocked.

(function () {
  var session = null;
  try {
    var raw = sessionStorage.getItem('ora_auth_session_v2');
    if (!raw) { window.location.replace('/'); return; }
    session = JSON.parse(raw);
  } catch (e) { window.location.replace('/'); return; }

  var isAdmin = session.role === 'admin' || session.role === 'manager';
  var currentPath = window.location.pathname;

  function buildNav(unlockedTabs) {
    var links = [
      { href: '/architecture', label: 'Architecture', key: 'architecture' },
      { href: '/sql',          label: 'SQL Converter', key: 'sql_converter' },
      { href: '/projects',     label: 'Projects',      key: 'projects' },
    ];

    var linksHtml = links.filter(function (l) {
      return isAdmin || unlockedTabs.indexOf(l.key) >= 0 || l.key === 'architecture';
    }).map(function (l) {
      var active = currentPath === l.href ? ' nav-item--active' : '';
      return '<a href="' + l.href + '" class="nav-item' + active + '">' + l.label + '</a>';
    }).join('');

    var header = document.getElementById('main-nav');
    if (!header) return;
    header.innerHTML = [
      '<div class="nav-inner">',
      '  <a href="/architecture" class="nav-logo">',
      '    <img src="/static/logo.svg" alt="sql2oracle" class="logo-svg">',
      '    <span class="logo-text">sql<strong>2oracle</strong></span>',
      '  </a>',
      '  <nav class="nav-links">' + linksHtml + '</nav>',
      '  <div class="nav-right">',
      '    <div class="nav-user-chip">',
      '      <span class="nav-user-dot"></span>',
      '      <span class="nav-user-name">' + (session.displayName || session.username) + '</span>',
      '    </div>',
      '    <button class="nav-signout-btn" onclick="navSignOut()">Sign Out</button>',
      '  </div>',
      '  <button class="nav-hamburger" id="nav-hamburger" onclick="navToggleMobile()" aria-label="Menu">&#9776;</button>',
      '</div>',
      '<div class="nav-mobile-panel" id="nav-mobile-panel">',
      linksHtml,
      '<button class="nav-signout-btn" onclick="navSignOut()">Sign Out</button>',
      '</div>',
    ].join('');
  }

  window.navSignOut = function () {
    sessionStorage.removeItem('ora_auth_session_v2');
    window.location.replace('/');
  };

  window.navToggleMobile = function () {
    var panel = document.getElementById('nav-mobile-panel');
    if (panel) panel.classList.toggle('open');
  };

  if (isAdmin) {
    buildNav(['architecture', 'sql_converter', 'projects']);
  } else {
    fetch('/api/tab-unlocks?username=' + encodeURIComponent(session.username))
      .then(function (r) { return r.ok ? r.json() : ['architecture']; })
      .catch(function () { return ['architecture']; })
      .then(buildNav);
  }
})();
