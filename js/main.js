// Wenatchee Visitor Guide: small helper script (no libraries).

// 1) Highlight the nav link for the current page.
//    Each <body> has data-page="home|events|outdoors|food".
const page = document.body.dataset.page;
document.querySelectorAll('[data-nav]').forEach((link) => {
  if (link.dataset.nav === page) link.classList.add('active');
});

// 2) Mobile menu toggle.
const toggle = document.querySelector('.nav-toggle');
const links = document.getElementById('nav-links');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

// 3) Keep the footer year current.
document.getElementById('year').textContent = new Date().getFullYear();
