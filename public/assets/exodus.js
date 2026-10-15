/* ───────────────────────────────────────────────────────────
   Exodus Events Agency — interactions du site
   (menu, apparitions, poussière d'or, compositeur de parfum,
   formulaire de devis en étapes)
   ─────────────────────────────────────────────────────────── */
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── En-tête & menu mobile ─────────────────────────── */
  var header = $(".site-header");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 30); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var toggle = $(".menu-toggle");
  var menu = $(".mobile-menu");
  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    }
    if (menu) menu.setAttribute("aria-hidden", String(!open));
  }
  if (toggle) toggle.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
  if (menu) $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* ── Année du pied de page ─────────────────────────── */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ── Apparitions au défilement ─────────────────────── */
  var reveals = $$(".reveal, .reveal-line");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ── Halo qui suit le curseur sur les cartes services ─ */
  $$(".service").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  });

  /* ── Poussière d'or (héros) ────────────────────────── */
  var canvas = $("#gold-dust");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var parts = [], W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), running = true, raf;
    function size() {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(90, (W * H) / 14000));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(spawn(true));
    }
    function spawn(anywhere) {
      return {
        x: Math.random() * W,
        y: anywhere ? Math.random() * H : H + 10,
        r: Math.random() * 1.6 + 0.3,
        vy: Math.random() * 0.35 + 0.08,
        vx: (Math.random() - 0.5) * 0.15,
        a: Math.random() * 0.6 + 0.2,
        t: Math.random() * Math.PI * 2
      };
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.t += 0.02; p.y -= p.vy; p.x += p.vx + Math.sin(p.t) * 0.12;
        if (p.y < -10) parts[i] = p = spawn(false);
        var tw = p.a * (0.6 + 0.4 * Math.sin(p.t * 1.7));
        ctx.beginPath();
        ctx.fillStyle = "rgba(233,207,150," + tw.toFixed(3) + ")";
        ctx.shadowColor = "rgba(212,175,110,0.8)";
        ctx.shadowBlur = p.r * 4;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (running && !reduceMotion) raf = requestAnimationFrame(draw);
    }
    size(); draw();
    window.addEventListener("resize", function () { size(); if (reduceMotion) draw(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        var vis = en[0].isIntersecting;
        if (vis && !running) { running = true; if (!reduceMotion) draw(); }
        else if (!vis) { running = false; cancelAnimationFrame(raf); }
      }).observe(canvas);
    }
  }

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
  /* ── Logo animé : suit le défilement, la souris et l'inclinaison du téléphone ── */
  var logoBox = $("[data-logo-motion]");
  if (logoBox && !reduceMotion) {
    var float = $(".logo-float", logoBox);
    var cible = { x: 0, y: 0 }, pos = { x: 0, y: 0 }, anime = false;
    var borne = function (v) { return Math.max(-1, Math.min(1, v)); };
    function boucle() {
      pos.x += (cible.x - pos.x) * 0.08;
      pos.y += (cible.y - pos.y) * 0.08;
      var r = logoBox.getBoundingClientRect();
      var defile = Math.max(0, -r.top + 120);            // pixels défilés depuis le haut du logo
      float.style.setProperty("--px", pos.x.toFixed(4));
      float.style.setProperty("--py", pos.y.toFixed(4));
      float.style.setProperty("--sy", (defile * 0.35).toFixed(1));
      float.style.setProperty("--ss", Math.min(defile / 2400, 0.12).toFixed(4));
      if (Math.abs(cible.x - pos.x) > 0.001 || Math.abs(cible.y - pos.y) > 0.001 || anime) requestAnimationFrame(boucle);
      else enCours = false;
    }
    var enCours = false;
    function relancer() { if (!enCours) { enCours = true; requestAnimationFrame(boucle); } }

    // Souris (ordinateur)
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      cible.x = borne((e.clientX / innerWidth - 0.5) * 2);
      cible.y = borne((e.clientY / innerHeight - 0.5) * 2);
      relancer();
    }, { passive: true });
    document.addEventListener("mouseleave", function () { cible.x = 0; cible.y = 0; relancer(); });

    // Défilement (téléphone et ordinateur)
    window.addEventListener("scroll", relancer, { passive: true });

    // Inclinaison du téléphone (gyroscope)
    var base = null;
    function orientation(e) {
      if (e.beta == null || e.gamma == null) return;
      if (!base) base = { b: e.beta, g: e.gamma };       // position de départ = neutre
      cible.x = borne((e.gamma - base.g) / 25);
      cible.y = borne((e.beta - base.b) / 25);
      relancer();
    }
    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        // iPhone : l'autorisation doit être demandée lors d'un premier toucher
        var demander = function () {
          DeviceOrientationEvent.requestPermission().then(function (etat) {
            if (etat === "granted") window.addEventListener("deviceorientation", orientation);
          }).catch(function () {});
          window.removeEventListener("touchend", demander);
        };
        window.addEventListener("touchend", demander, { once: true });
      } else {
        window.addEventListener("deviceorientation", orientation);
      }
    }
    relancer();
  }
})();
