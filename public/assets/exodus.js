/* ───────────────────────────────────────────────────────────
   Exodus Events Agency — interactions du site
   Intro cinématique · rideau entre les pages · logo en particules
   (souris, doigt, gyroscope, défilement) · curseur personnalisé ·
   boutons magnétiques · titres qui montent · texte qui s'allume ·
   bandeau lié au défilement · services en défilement horizontal ·
   aperçus flottants · confettis (secouer le téléphone) · formulaires.
   ─────────────────────────────────────────────────────────── */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var buzz = function (ms) { if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} } };

  /* ── Mouvement de l'appareil (partagé : particules, inclinaisons, secousse) ── */
  var tilt = { x: 0, y: 0, active: false };
  var shakeHandlers = [];
  (function () {
    var base = null, last = 0;
    function orient(e) {
      if (e.beta == null || e.gamma == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };
      tilt.x = clamp((e.gamma - base.g) / 22, -1, 1);
      tilt.y = clamp((e.beta - base.b) / 22, -1, 1);
      tilt.active = true;
    }
    function motion(e) {
      var a = e.accelerationIncludingGravity || e.acceleration;
      if (!a) return;
      var f = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
      var now = Date.now();
      if (f > 42 && now - last > 1500) { last = now; shakeHandlers.forEach(function (h) { h(); }); }
    }
    function brancher() {
      window.addEventListener("deviceorientation", orient);
      window.addEventListener("devicemotion", motion);
    }
    if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function") {
      // iPhone : autorisation demandée au premier toucher
      window.addEventListener("touchend", function () {
        Promise.all([
          DeviceOrientationEvent.requestPermission().catch(function () { return "denied"; }),
          window.DeviceMotionEvent && DeviceMotionEvent.requestPermission ? DeviceMotionEvent.requestPermission().catch(function () { return "denied"; }) : "granted"
        ]).then(function (r) { if (r[0] === "granted" || r[1] === "granted") brancher(); });
      }, { once: true });
    } else if (window.DeviceOrientationEvent) {
      brancher();
    }
  })();

  /* ── Intro cinématique (première visite de la session) ── */
  if (!reduceMotion && $("[data-hero]") && !store.get("exodus-intro")) {
    store.set("exodus-intro", "1");
    var intro = document.createElement("div");
    intro.className = "intro";
    intro.setAttribute("aria-hidden", "true");
    intro.innerHTML = '<div class="intro-word">' + "EXODUS".split("").map(function (l, i) { return '<span style="--i:' + i + '">' + l + "</span>"; }).join("") +
      '</div><div class="intro-sub">Events Agency · Est. 2026</div><div class="intro-bar"></div>';
    document.body.appendChild(intro);
    root.style.overflow = "hidden";
    var fini = false;
    var sortir = function () {
      if (fini) return; fini = true;
      intro.classList.add("out");
      root.style.overflow = "";
      document.dispatchEvent(new Event("exodus:ready"));
      setTimeout(function () { intro.remove(); }, 1000);
    };
    intro.addEventListener("click", sortir);
    setTimeout(sortir, 2100);
  } else {
    setTimeout(function () { document.dispatchEvent(new Event("exodus:ready")); }, 0);
  }

  /* ── Rideau entre les pages ─────────────────────────── */
  var curtain = document.createElement("div");
  curtain.className = "curtain";
  curtain.innerHTML = '<img src="/assets/logos/monogramme-blanc.png" alt="">';
  document.body.appendChild(curtain);
  if (!reduceMotion && store.get("exodus-curtain")) {
    store.set("exodus-curtain", "");
    curtain.classList.add("start");
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      curtain.classList.remove("start"); curtain.classList.add("leave");
      setTimeout(function () { curtain.classList.remove("leave"); }, 900);
    }); });
  }
  window.addEventListener("pageshow", function (e) { if (e.persisted) curtain.classList.remove("cover", "leave"); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || reduceMotion || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    var url = new URL(a.href, location.href);
    if (a.target || a.hasAttribute("download") || url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (/^(mailto|tel):/.test(a.getAttribute("href"))) return;
    e.preventDefault();
    buzz(8);
    store.set("exodus-curtain", "1");
    curtain.classList.add("cover");
    setTimeout(function () { location.href = url.href; }, 560);
  });

  /* ── En-tête & menu mobile ─────────────────────────── */
  var toggle = $(".menu-toggle");
  var menu = $(".mobile-menu");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      var t = $("i", toggle); if (t) t.textContent = open ? "Fermer" : "Menu";
    }
    if (menu) menu.setAttribute("aria-hidden", String(!open));
  }
  if (toggle) toggle.addEventListener("click", function () { buzz(6); setMenu(!document.body.classList.contains("menu-open")); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ── Année du pied de page ─────────────────────────── */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ── Titres : mots qui montent ──────────────────────── */
  function decouper(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement("span"); w.className = "w";
            var wi = document.createElement("span"); wi.className = "wi"; wi.style.setProperty("--i", i++);
            wi.textContent = p; w.appendChild(wi); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    })(el);
    el.classList.add("split-done");
  }
  if (!reduceMotion) $$(".display, .h2").forEach(function (el) { if (!el.closest(".hs-card, .feature-body")) decouper(el); });

  /* ── Apparitions au défilement ─────────────────────── */
  function observer() {
    var cibles = $$(".reveal, .reveal-line, .split-done");
    if ("IntersectionObserver" in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      cibles.forEach(function (el) { io.observe(el); });
    } else cibles.forEach(function (el) { el.classList.add("in"); });
  }
  document.addEventListener("exodus:ready", observer, { once: true });

  /* ── Curseur personnalisé & boutons magnétiques (ordinateur) ── */
  if (finePointer && !reduceMotion) {
    root.classList.add("has-cursor");
    var dot = document.createElement("div"); dot.className = "cursor";
    var ring = document.createElement("div"); ring.className = "cursor-ring"; ring.innerHTML = "<span></span>";
    document.body.appendChild(dot); document.body.appendChild(ring);
    var m = { x: innerWidth / 2, y: innerHeight / 2 }, r = { x: m.x, y: m.y };
    window.addEventListener("pointermove", function (e) {
      m.x = e.clientX; m.y = e.clientY;
      dot.style.transform = "translate(" + m.x + "px," + m.y + "px)";
    }, { passive: true });
    (function suivre() {
      r.x += (m.x - r.x) * 0.16; r.y += (m.y - r.y) * 0.16;
      ring.style.transform = "translate(" + r.x + "px," + r.y + "px)";
      requestAnimationFrame(suivre);
    })();
    document.addEventListener("mouseover", function (e) {
      var lab = e.target.closest("[data-cursor]");
      var hov = e.target.closest("a, button, input, select, textarea, label, summary");
      ring.classList.toggle("big", !!lab);
      ring.classList.toggle("hover", !lab && !!hov);
      $("span", ring).textContent = lab ? lab.getAttribute("data-cursor") : "";
    });
    document.addEventListener("mouseleave", function () { dot.style.opacity = ring.style.opacity = "0"; });
    document.addEventListener("mouseenter", function () { dot.style.opacity = ring.style.opacity = ""; });

    $$(".btn, [data-magnetic]").forEach(function (b) {
      b.addEventListener("pointermove", function (e) {
        var rc = b.getBoundingClientRect();
        var dx = e.clientX - (rc.left + rc.width / 2), dy = e.clientY - (rc.top + rc.height / 2);
        b.style.transform = "translate(" + dx * 0.22 + "px," + dy * 0.3 + "px)";
        b.style.setProperty("--bx", (e.clientX - rc.left) + "px");
        b.style.setProperty("--by", (e.clientY - rc.top) + "px");
      });
      b.addEventListener("pointerleave", function () { b.style.transform = ""; });
    });
  }
  $$(".btn").forEach(function (b) { b.addEventListener("pointerdown", function () { buzz(10); }); });

  /* ── Logo en particules ─────────────────────────────── */
  var cvs = $("[data-particles]");
  if (cvs && cvs.getContext && !reduceMotion) {
    var ctx = cvs.getContext("2d");
    var img = new Image();
    img.src = cvs.getAttribute("data-particles");
    var parts = [], W = 0, H = 0, dpr = Math.min(devicePixelRatio || 1, 2);
    var pointer = { x: -9999, y: -9999, down: false };
    var hero = $("[data-hero]");
    var hint = $("[data-hint]");
    if (hint && !finePointer) hint.textContent = "Touchez le logo · inclinez votre téléphone";

    function construire() {
      W = cvs.clientWidth; H = cvs.clientHeight;
      if (!W || !H) return;
      cvs.width = W * dpr; cvs.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var lw = Math.min(W * 0.92, 1000), lh = lw * img.naturalHeight / img.naturalWidth;
      if (lh > H * 0.9) { lh = H * 0.9; lw = lh * img.naturalWidth / img.naturalHeight; }
      var gap = W < 600 ? 3 : 4;
      var off = document.createElement("canvas");
      off.width = Math.round(lw); off.height = Math.round(lh);
      var o = off.getContext("2d");
      o.drawImage(img, 0, 0, off.width, off.height);
      var data = o.getImageData(0, 0, off.width, off.height).data;
      var ox = (W - lw) / 2, oy = (H - lh) / 2, anciens = parts;
      parts = [];
      for (var y = 0; y < off.height; y += gap) {
        for (var x = 0; x < off.width; x += gap) {
          var k = (y * off.width + x) * 4;
          if (data[k + 3] < 120) continue;
          var rr = data[k], gg = data[k + 1], bb = data[k + 2];
          var or = (rr - bb) > 50;                      // pixels dorés du logo
          var prev = anciens[parts.length];
          parts.push({
            hx: ox + x + (Math.random() - 0.5) * gap * 0.6, hy: oy + y + (Math.random() - 0.5) * gap * 0.6,
            x: prev ? prev.x : Math.random() * W, y: prev ? prev.y : (Math.random() < 0.5 ? -20 : H + 20) + (Math.random() - 0.5) * H,
            vx: 0, vy: 0, z: 0.35 + Math.random() * 0.9,
            s: gap * (0.45 + Math.random() * 0.45),
            c: or ? 1 : 0,
            a: Math.random() * Math.PI * 2
          });
        }
      }
    }

    function coords(e) { var rc = cvs.getBoundingClientRect(); pointer.x = e.clientX - rc.left; pointer.y = e.clientY - rc.top; }
    cvs.addEventListener("pointermove", coords);
    cvs.addEventListener("pointerdown", function (e) { coords(e); pointer.down = true; buzz(14); });
    window.addEventListener("pointerup", function () { pointer.down = false; });
    cvs.addEventListener("pointerleave", function () { pointer.x = pointer.y = -9999; pointer.down = false; });
    var souris = { x: 0, y: 0 };
    if (finePointer) window.addEventListener("pointermove", function (e) { souris.x = (e.clientX / innerWidth - 0.5) * 2; souris.y = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

    var visible = true, t = 0;
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(cvs);

    function frame() {
      requestAnimationFrame(frame);
      if (!visible || !parts.length) return;
      t += 0.016;
      var rc = hero.getBoundingClientRect();
      var scatter = clamp(-rc.top / (rc.height * 0.7), 0, 1);  // défilement : le logo s'envole
      var tx = tilt.active ? tilt.x : souris.x * 0.6, ty = tilt.active ? tilt.y : souris.y * 0.6;
      var R = pointer.down ? 170 : 110, R2 = R * R;
      ctx.clearRect(0, 0, W, H);
      var blancs = [], ors = [];
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var gx = p.hx + tx * 26 * p.z + Math.cos(p.a + t) * scatter * 260 * p.z;
        var gy = p.hy + ty * 18 * p.z - scatter * 420 * p.z + Math.sin(p.a + t) * scatter * 80;
        p.vx += (gx - p.x) * 0.055; p.vy += (gy - p.y) * 0.055;
        var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) { var f = (1 - d2 / R2) * (pointer.down ? 9 : 5); var d = Math.sqrt(d2) || 1; p.vx += dx / d * f; p.vy += dy / d * f; }
        p.vx *= 0.8; p.vy *= 0.8; p.x += p.vx; p.y += p.vy;
        (p.c ? ors : blancs).push(p);
      }
      ctx.globalAlpha = 1 - scatter * 0.85;
      ctx.fillStyle = "#ffffff";
      for (i = 0; i < blancs.length; i++) { p = blancs[i]; ctx.fillRect(p.x, p.y, p.s, p.s); }
      ctx.fillStyle = "#d4ad62";
      for (i = 0; i < ors.length; i++) { p = ors[i]; ctx.fillRect(p.x, p.y, p.s, p.s); }
    }
    img.onload = function () {
      root.classList.add("has-particles");
      document.body.classList.add("has-particles");
      construire(); frame();
      var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(construire, 150); });
    };
  }

  /* ── Inclinaison 3D d'éléments (souris ou téléphone) ── */
  $$("[data-tilt]").forEach(function (el) {
    if (reduceMotion) return;
    el.style.transition = "transform .6s cubic-bezier(.16,1,.3,1)";
    var mx = 0, my = 0;
    if (finePointer) {
      el.addEventListener("pointermove", function (e) { var rc = el.getBoundingClientRect(); mx = (e.clientX - rc.left) / rc.width - 0.5; my = (e.clientY - rc.top) / rc.height - 0.5; });
      el.addEventListener("pointerleave", function () { mx = my = 0; });
    }
    (function boucle() {
      var x = tilt.active ? tilt.x * 0.5 : mx, y = tilt.active ? tilt.y * 0.5 : my;
      el.style.transform = "perspective(900px) rotateY(" + (x * 12).toFixed(2) + "deg) rotateX(" + (-y * 10).toFixed(2) + "deg)";
      requestAnimationFrame(boucle);
    })();
  });

  /* ── Défilement : bandeau, texte qui s'allume, services horizontaux ── */
  var vm = $("[data-vmarquee] .vtrack"), vmX = 0, lastY = scrollY, vel = 0, dir = 1;
  var fills = $$("[data-fill]").map(function (el) {
    if (reduceMotion) return null;
    var mots = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var s = document.createElement("span"); s.className = "fw"; s.textContent = p; frag.appendChild(s); mots.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    return { el: el, mots: mots };
  }).filter(Boolean);

  var hsEl = $("[data-hscroll]"), hsTrack = hsEl && $(".hs-track", hsEl), hsBar = hsEl && $(".hs-progress", hsEl);
  var hsActif = false;
  function hsSetup() {
    if (!hsEl) return;
    hsActif = !reduceMotion && innerWidth > 900;
    hsEl.classList.toggle("hs--swipe", !hsActif);
    if (hsActif) {
      var dist = hsTrack.scrollWidth - innerWidth;
      hsEl.style.height = (innerHeight + Math.max(0, dist)) + "px";
    } else { hsEl.style.height = ""; hsTrack.style.transform = ""; }
  }
  hsSetup();
  window.addEventListener("resize", hsSetup);
  window.addEventListener("load", hsSetup);

  (function tick() {
    var y = scrollY, dy = y - lastY; lastY = y;
    vel += (dy - vel) * 0.1;
    if (dy) dir = dy > 0 ? 1 : -1;
    if (vm && !reduceMotion) {
      vmX -= (1.2 + Math.abs(vel) * 0.6) * dir;
      var w = vm.scrollWidth / 2;
      if (vmX <= -w) vmX += w; if (vmX > 0) vmX -= w;
      vm.style.transform = "translate3d(" + vmX.toFixed(1) + "px,0,0) skewX(" + clamp(-vel * 0.25, -10, 10).toFixed(2) + "deg)";
    }
    fills.forEach(function (f) {
      var rc = f.el.getBoundingClientRect();
      var prog = clamp((innerHeight * 0.85 - rc.top) / (rc.height + innerHeight * 0.35), 0, 1);
      var n = Math.round(prog * f.mots.length);
      for (var i = 0; i < f.mots.length; i++) f.mots[i].classList.toggle("on", i < n);
    });
    if (hsActif) {
      var rc = hsEl.getBoundingClientRect();
      var max = hsEl.offsetHeight - innerHeight;
      var p = clamp(-rc.top / (max || 1), 0, 1);
      hsTrack.style.transform = "translate3d(" + (-p * (hsTrack.scrollWidth - innerWidth)).toFixed(1) + "px,0,0)";
      if (hsBar) hsBar.style.setProperty("--p", p.toFixed(4));
    }
    requestAnimationFrame(tick);
  })();

  /* ── Liste des occasions : aperçu flottant ──────────── */
  var olist = $("[data-olist]");
  if (olist && finePointer && !reduceMotion) {
    var prev = document.createElement("div"); prev.className = "opreview";
    var pimg = document.createElement("img"); pimg.alt = "";
    var pcap = document.createElement("span"); pcap.className = "cap";
    prev.appendChild(pimg); prev.appendChild(pcap);
    document.body.appendChild(prev);
    var pm = { x: 0, y: 0 }, pp = { x: 0, y: 0 }, lastX = 0;
    olist.addEventListener("pointermove", function (e) { pm.x = e.clientX; pm.y = e.clientY; });
    $$(".orow", olist).forEach(function (row) {
      row.addEventListener("pointerenter", function () {
        var mono = row.getAttribute("data-logo") === "ee";
        prev.classList.toggle("light", mono);
        prev.classList.toggle("main", !mono);
        pimg.src = mono ? "/assets/logos/ee-noir.png" : "/assets/logos/exodus-script.png";
        pcap.textContent = row.getAttribute("data-cap") || "";
        prev.classList.add("on");
      });
    });
    olist.addEventListener("pointerleave", function () { prev.classList.remove("on"); });
    (function suivre() {
      pp.x += (pm.x - pp.x) * 0.12; pp.y += (pm.y - pp.y) * 0.12;
      var rot = clamp((pp.x - lastX) * 0.4, -12, 12); lastX = pp.x;
      prev.style.left = pp.x + "px"; prev.style.top = pp.y + "px";
      prev.style.rotate = rot.toFixed(2) + "deg";
      requestAnimationFrame(suivre);
    })();
  }

  /* ── Confettis : secouer le téléphone, bouton « Célébrer », succès ── */
  function celebrer() {
    if (reduceMotion) return;
    buzz([20, 40, 20]);
    var c = document.createElement("canvas"); c.className = "confetti";
    document.body.appendChild(c);
    var g = c.getContext("2d"), dp = Math.min(devicePixelRatio || 1, 2);
    c.width = innerWidth * dp; c.height = innerHeight * dp; g.scale(dp, dp);
    var couleurs = ["#ffffff", "#b8924a", "#e9d6a6", "#8a8a8a", "#111111"];
    var bits = [];
    for (var i = 0; i < 180; i++) bits.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 20 - 6,
      w: 5 + Math.random() * 7, h: 8 + Math.random() * 12, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: couleurs[i % couleurs.length]
    });
    var debut = performance.now();
    (function anim(now) {
      var age = now - debut;
      g.clearRect(0, 0, innerWidth, innerHeight);
      bits.forEach(function (b) {
        b.vy += 0.45; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.scale(1, Math.cos(b.r * 2));
        g.globalAlpha = clamp(1 - (age - 2200) / 800, 0, 1);
        g.fillStyle = b.c; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); g.restore();
      });
      if (age < 3000) requestAnimationFrame(anim); else c.remove();
    })(debut);
  }
  window.exodusCelebrate = celebrer;
  shakeHandlers.push(celebrer);
  $$("[data-celebrate]").forEach(function (b) { b.addEventListener("click", celebrer); });

  /* ── Compositeur de parfum ─────────────────────────── */
  var composer = $("[data-composer]");
  if (composer) {
    var ESS = {
      shemen: { nom: "Shemen", c: [138, 90, 43], mot: "Ambre", de: "Nuit", notes: "chaud, ambré, boisé" },
      hadassa: { nom: "Hadassa", c: [201, 138, 154], mot: "Pétale", de: "Reine", notes: "floral, délicat, royal" },
      eden: { nom: "Éden", c: [155, 191, 138], mot: "Rosée", de: "Jardin", notes: "frais, lumineux, pur" },
      ruah: { nom: "Ruah", c: [216, 207, 230], mot: "Souffle", de: "Ciel", notes: "aérien, musqué, doux" }
    };
    var sliders = $$("input[type=range]", composer);
    var nameEl = $("[data-blend-name]", composer);
    var notesEl = $("[data-blend-notes]", composer);
    var visual = $(".composer-visual", composer);
    var labelEl = $("[data-blend-label]", composer);
    var bookEl = $("[data-blend-book]", composer);
    var format = "Parfum liquide";

    function update() {
      var total = 0, vals = {};
      sliders.forEach(function (s) { vals[s.name] = +s.value; total += +s.value; });
      var pcts = {}, mix = [0, 0, 0];
      sliders.forEach(function (s) {
        var p = total ? Math.round((vals[s.name] / total) * 100) : 0;
        pcts[s.name] = p;
        s.style.setProperty("--v", s.value + "%");
        var out = $("[data-pct=" + s.name + "]", composer);
        if (out) out.textContent = p + "%";
        if (total) for (var k = 0; k < 3; k++) mix[k] += ESS[s.name].c[k] * (vals[s.name] / total);
      });
      var ranked = Object.keys(pcts).sort(function (a, b) { return pcts[b] - pcts[a]; });
      var d = ESS[ranked[0]], s2 = ESS[ranked[1]];
      var name, notes;
      if (!total) {
        name = "Votre signature";
        notes = "Faites glisser les essences pour composer votre parfum.";
      } else if (pcts[ranked[0]] >= 70) {
        name = d.mot + " de " + d.de;
        notes = "Une signature franche : " + d.notes + ".";
      } else {
        name = d.mot + " de " + s2.de;
        notes = "Cœur " + d.notes + ", relevé d'un accent " + s2.notes.split(",")[0] + ".";
      }
      var rgb = "rgb(" + mix.map(Math.round).join(",") + ")";
      if (nameEl) nameEl.textContent = name;
      if (notesEl) notesEl.textContent = notes;
      if (visual && total) {
        visual.style.setProperty("--blend-solid", rgb);
        visual.style.setProperty("--blend", "rgba(" + mix.map(Math.round).join(",") + ",0.45)");
      }
      if (labelEl) labelEl.innerHTML = "EXODUS<br>" + (format === "Parfum solide" ? "SOLIDE" : "EXTRAIT") + " · 30ML";
      if (bookEl) {
        var recette = ranked.filter(function (k) { return pcts[k] > 0; })
          .map(function (k) { return ESS[k].nom + " " + pcts[k] + "%"; }).join(", ");
        var msg = "Ma création « " + name + " » (" + format.toLowerCase() + ", 30 ml) : " + (recette || "à composer avec vous") + ".";
        bookEl.href = "/devis?service=parfum&message=" + encodeURIComponent(msg);
      }
    }
    sliders.forEach(function (s) { s.addEventListener("input", update); });
    $$(".format-toggle button", composer).forEach(function (b, _, all) {
      b.addEventListener("click", function () {
        all.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        format = b.getAttribute("data-format");
        update();
      });
    });
    var reset = $("[data-blend-random]", composer);
    if (reset) reset.addEventListener("click", function () {
      sliders.forEach(function (s) { s.value = Math.round(Math.random() * 100); });
      update();
    });
    update();
  }

  /* ── Formulaire de devis en étapes ─────────────────── */
  var form = $("#devis-form");
  if (form) {
    var steps = $$(".fstep", form);
    var bars = $$(".progress i", form);
    var label = $(".progress-label", form);
    var prev = $("[data-prev]", form), next = $("[data-next]", form), submit = $("[data-submit]", form);
    var errBox = $(".form-error", form);
    var titles = ["L'occasion", "Vos envies", "Les détails", "Vos coordonnées"];
    var current = 0;

    // Pré-remplissage depuis l'URL (?service=parfum&type=mariage&message=…)
    var params = new URLSearchParams(location.search);
    (params.get("service") || "").split(",").forEach(function (v) {
      var el = form.querySelector('input[name="services"][value="' + v + '"]');
      if (el) el.checked = true;
    });
    var t = params.get("type");
    if (t) { var te = form.querySelector('input[name="type"][value="' + t + '"]'); if (te) te.checked = true; }
    if (params.get("message")) form.elements.message.value = params.get("message");

    // Nombre d'invités
    var guests = form.elements.invites, guestsOut = $("output[for=invites]", form);
    function showGuests() {
      var v = +guests.value;
      guestsOut.textContent = v >= 500 ? "500+" : String(v);
      guests.style.setProperty("--v", ((v - 10) / 490) * 100 + "%");
    }
    if (guests) { guests.addEventListener("input", showGuests); showGuests(); }

    // Date minimale : aujourd'hui
    if (form.elements.date) form.elements.date.min = new Date().toISOString().slice(0, 10);

    function show(i) {
      current = i;
      steps.forEach(function (s, k) { s.classList.toggle("active", k === i); });
      bars.forEach(function (b, k) { b.classList.toggle("done", k <= i); });
      label.textContent = "Étape " + (i + 1) + " sur " + steps.length + " — " + titles[i];
      prev.hidden = i === 0;
      next.hidden = i === steps.length - 1;
      submit.hidden = i !== steps.length - 1;
      errBox.textContent = "";
      if (i === steps.length - 1) recap();
    }
    function valid(i) {
      if (i === 0 && !form.querySelector('input[name="type"]:checked')) return "Choisissez le type d'événement.";
      if (i === 1 && !form.querySelector('input[name="services"]:checked')) return "Sélectionnez au moins un service.";
      if (i === 3) {
        if (!form.elements.nom.value.trim()) return "Indiquez votre nom.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.courriel.value.trim())) return "Indiquez une adresse courriel valide.";
      }
      return "";
    }
    function data() {
      var type = form.querySelector('input[name="type"]:checked');
      return {
        type: type ? type.value : "",
        typeLabel: type ? type.getAttribute("data-label") : "",
        services: $$('input[name="services"]:checked', form).map(function (c) { return c.getAttribute("data-label"); }),
        date: form.elements.date.value,
        lieu: form.elements.lieu.value.trim(),
        invites: guests ? (+guests.value >= 500 ? "500+" : guests.value) : "",
        budget: form.elements.budget.value,
        nom: form.elements.nom.value.trim(),
        courriel: form.elements.courriel.value.trim(),
        telephone: form.elements.telephone.value.trim(),
        contact: form.elements.contact.value,
        message: form.elements.message.value.trim(),
        website: form.elements.website.value
      };
    }
    function recap() {
      var d = data(), box = $(".recap", form);
      if (!box) return;
      var rows = [
        ["Événement", d.typeLabel],
        ["Services", d.services.join(", ")],
        ["Date", d.date ? new Date(d.date + "T12:00").toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) : "À définir"],
        ["Invités", d.invites],
        ["Lieu", d.lieu || "À définir"],
        ["Budget", d.budget || "À discuter"]
      ];
      box.innerHTML = rows.map(function (r) {
        return "<div><dt>" + r[0] + "</dt><dd>" + escapeHtml(r[1]) + "</dd></div>";
      }).join("");
    }
    function escapeHtml(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

    next.addEventListener("click", function () {
      var e = valid(current);
      if (e) { errBox.textContent = e; return; }
      show(Math.min(current + 1, steps.length - 1));
      form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
    prev.addEventListener("click", function () { show(Math.max(current - 1, 0)); });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var e = valid(current);
      if (e) { errBox.textContent = e; return; }
      var d = data();
      submit.disabled = true;
      submit.querySelector("span").textContent = "Envoi…";
      fetch("/api/devis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Erreur"); return j; });
      }).then(function () {
        $(".devis-steps", form).hidden = true;
        var ok = $(".success", form);
        ok.hidden = false;
        celebrer();
        $("[data-success-name]", ok).textContent = d.nom.split(" ")[0];
        form.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }).catch(function (err) {
        var corps = "Type : " + d.typeLabel + "\nServices : " + d.services.join(", ") + "\nDate : " + (d.date || "à définir") +
          "\nInvités : " + d.invites + "\nLieu : " + (d.lieu || "à définir") + "\nBudget : " + (d.budget || "à discuter") +
          "\n\n" + d.message + "\n\n" + d.nom + "\n" + d.telephone;
        var mail = "mailto:info@exodusevents.org?subject=" + encodeURIComponent("Demande de consultation — " + d.typeLabel) + "&body=" + encodeURIComponent(corps);
        errBox.innerHTML = escapeHtml(err.message || "L'envoi n'a pas abouti.") +
          " Vous pouvez aussi <a href=\"" + mail + "\">nous écrire directement</a> ou appeler le (506) 588-9463.";
        submit.disabled = false;
        submit.querySelector("span").textContent = "Réserver ma consultation";
      });
    });
    show(0);
  }
  /* ── Formulaires simples (ex. partenaires) ─────────── */
  $$("form[data-simple-form]").forEach(function (f) {
    var err = $(".form-error", f), btn = $("button[type=submit]", f);
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.textContent = "";
      var manquant = $$("[required]", f).filter(function (el) { return !el.value.trim(); })[0];
      if (manquant) {
        var lab = f.querySelector('label[for="' + manquant.id + '"]');
        err.textContent = "Champ requis : " + (lab ? lab.textContent.replace(" *", "") : manquant.name) + ".";
        manquant.focus();
        return;
      }
      var d = {};
      $$("input, select, textarea", f).forEach(function (el) { if (el.name) d[el.name] = el.value.trim(); });
      btn.disabled = true;
      var txt = btn.querySelector("span"), avant = txt.textContent;
      txt.textContent = "Envoi…";
      fetch(f.getAttribute("data-simple-form"), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "Erreur"); return j; });
      }).then(function () {
        $(".form-body", f).hidden = true;
        var ok = $(".success", f);
        ok.hidden = false;
        celebrer();
        var n = $("[data-success-name]", ok);
        if (n) n.textContent = (d.nom || "").split(" ")[0];
        f.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }).catch(function (e) {
        var corps = Object.keys(d).filter(function (k) { return k !== "website" && d[k]; })
          .map(function (k) { return k + " : " + d[k]; }).join("\n");
        var mail = "mailto:info@exodusevents.org?subject=" + encodeURIComponent("Candidature partenaire — " + (d.entreprise || "")) + "&body=" + encodeURIComponent(corps);
        err.innerHTML = (e.message || "L'envoi n'a pas abouti.").replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) +
          " Vous pouvez aussi <a href=\"" + mail + "\">nous écrire directement</a>.";
        btn.disabled = false;
        txt.textContent = avant;
      });
    });
  });
})();
