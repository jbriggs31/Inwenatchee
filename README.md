# Wenatchee Visitor Guide

A simple static website: plain HTML, CSS and a little vanilla JavaScript. There's no build step.

## Hosting

The live site is published with **GitHub Pages** from the `main` branch of this repository, using the repository root (not a `docs/` folder or a build step). The custom domain is **inwenatchee.com**, set by the `CNAME` file. An empty `.nojekyll` file tells GitHub Pages to serve these files as-is.

After a change is merged to `main`, GitHub rebuilds the site. It is meant to be viewed at [https://inwenatchee.com](https://inwenatchee.com). GitHub also provides a `https://jbriggs31.github.io/Inwenatchee/` address. The domain's DNS still has to point at GitHub Pages (apex `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`, or a `www` CNAME to `jbriggs31.github.io`) before the custom domain loads in a browser.

## Files
- `index.html`: home page (hero, intro, cards)
- `events.html`, `outdoors.html`, `food.html`: content pages
- `css/style.css`: shared styles. The color palette lives at the top in `:root`.
- `js/main.js`: highlights the current nav link, runs the mobile menu and sets the footer year
- `CNAME`: custom domain (`inwenatchee.com`)
- `.nojekyll`: disables Jekyll processing on GitHub Pages

## Open in Cursor
1. In Cursor, choose **File → Open Folder…** and open this repository (`Inwenatchee`).
2. Click any `.html` file in the sidebar to edit it.

## Preview
- **Quickest:** double-click `index.html` to open it in your browser.
- **Local server:** in Cursor's terminal (**View → Terminal**), run
  `python3 -m http.server 8000`, then go to http://localhost:8000.
- **Live reload:** install the "Live Server" extension, right-click `index.html`, and choose **Open with Live Server**.

## Editing tips
- Edit the HTML, CSS, or JavaScript in this repository, then commit and push to `main`. GitHub Pages publishes that branch; there is nothing to compile.
- Each page repeats the same header, nav and footer. If you add a page, copy an existing one, change `data-page` on `<body>`, and add a nav link to every page.
- To add an event, restaurant or trail, copy an `<article class="item">` block.
- To change colors, edit the CSS variables in `css/style.css`.
- Facts and links were checked in October 2026. Hours change, so confirm details on the official sites.
- Images: the site uses only CSS gradients and inline SVG. If you add photos, save them locally and credit them.
