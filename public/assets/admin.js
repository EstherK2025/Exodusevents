/* Tableau de bord Exodus Events : lecture des demandes (Neon) via /api/admin. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var KEY = "exodus-admin";
  var pass = "";
  try { pass = sessionStorage.getItem(KEY) || ""; } catch (e) {}
  var tab = "devis", data = { devis: [], partenaires: [] };
  var LIB = { nouveau: "Nouveau", en_cours: "En cours", traite: "Traité", archive: "Archivé" };
  var CHAMPS = {
    devis: [["type", "Événement"], ["services", "Services"], ["date_evenement", "Date"], ["invites", "Invités"], ["lieu", "Lieu"], ["budget", "Budget"], ["telephone", "Téléphone"], ["contact", "Contact préféré"]],
    partenaires: [["entreprise", "Entreprise"], ["domaine", "Domaine"], ["ville", "Ville"], ["telephone", "Téléphone"], ["lien", "Site / Instagram"]]
  };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  function api(method, q, body) {
    return fetch("/api/admin" + (q || ""), {
      method: method,
      headers: { Authorization: "Bearer " + pass, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || "Erreur " + r.status); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  function charger() {
    return Promise.all(["devis", "partenaires"].map(function (t) {
      return api("GET", "?table=" + t).then(function (j) { data[t] = j.lignes; });
    })).then(function () {
      $("#admin-login").hidden = true;
      $("#admin-app").hidden = false;
      try { sessionStorage.setItem(KEY, pass); } catch (e) {}
      afficher();
    });
  }

  function afficher() {
    ["devis", "partenaires"].forEach(function (t) {
      var n = data[t].filter(function (l) { return l.statut === "nouveau"; }).length;
      $('[data-count="' + t + '"]').textContent = n ? n + " nouveau" + (n > 1 ? "x" : "") : "";
    });
    var q = $("[data-search]").value.trim().toLowerCase(), f = $("[data-filter]").value;
    var lignes = data[tab].filter(function (l) {
      return (!f || l.statut === f) && (!q || JSON.stringify(l).toLowerCase().indexOf(q) >= 0);
    });
    var liste = $("[data-list]");
    if (!lignes.length) { liste.innerHTML = '<p class="muted" style="padding:40px 0">Aucune demande pour le moment.</p>'; return; }
    liste.innerHTML = lignes.map(function (l) {
      var titre = tab === "devis" ? (l.type || "Demande") + " — " + (l.nom || "") : (l.entreprise || "") + " — " + (l.domaine || "");
      var details = CHAMPS[tab].filter(function (c) { return l[c[0]]; })
        .map(function (c) { return "<div><dt>" + c[1] + "</dt><dd>" + esc(l[c[0]]) + "</dd></div>"; }).join("");
      var options = Object.keys(LIB).map(function (s) { return '<option value="' + s + '"' + (s === l.statut ? " selected" : "") + ">" + LIB[s] + "</option>"; }).join("");
      return '<article class="admin-card" data-statut="' + esc(l.statut) + '">' +
        '<header><div><small>' + (tab === "devis" ? "D-" : "P-") + l.id + " · " + new Date(l.cree_le).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" }) + "</small>" +
        "<h3>" + esc(titre) + "</h3></div>" +
        '<select data-id="' + l.id + '" aria-label="Statut">' + options + "</select></header>" +
        '<dl class="recap">' + details + "</dl>" +
        (l.message ? '<p class="admin-msg">' + esc(l.message) + "</p>" : "") +
        '<div class="btn-row"><a class="link" href="mailto:' + esc(l.courriel) + '">Écrire à ' + esc(l.nom || l.courriel) + " →</a>" +
        (l.telephone ? '<a class="link" href="tel:' + esc(l.telephone) + '">Appeler →</a>' : "") + "</div></article>";
    }).join("");
  }

  $("#admin-login").addEventListener("submit", function (e) {
    e.preventDefault();
    pass = $("#a-pass").value;
    var err = $("#admin-login .form-error");
    err.textContent = "";
    charger().catch(function (x) { err.textContent = x.message; });
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tab]");
    if (t) {
      tab = t.getAttribute("data-tab");
      document.querySelectorAll("[data-tab]").forEach(function (b) { b.setAttribute("aria-selected", String(b === t)); });
      afficher();
    }
    if (e.target.closest("[data-logout]")) {
      try { sessionStorage.removeItem(KEY); } catch (x) {}
      location.reload();
    }
    if (e.target.closest("[data-csv]")) exporter();
  });
  document.addEventListener("change", function (e) {
    var s = e.target.closest("select[data-id]");
    if (s) {
      var id = +s.getAttribute("data-id"), statut = s.value;
      api("POST", "", { table: tab, id: id, statut: statut }).then(function () {
        data[tab].forEach(function (l) { if (l.id === id) l.statut = statut; });
        afficher();
      }).catch(function (x) { $("[data-app-error]").textContent = x.message; });
    }
    if (e.target.matches("[data-filter]")) afficher();
  });
  $("[data-search]").addEventListener("input", afficher);

  function exporter() {
    var lignes = data[tab];
    if (!lignes.length) return;
    var cols = Object.keys(lignes[0]);
    var csv = [cols.join(";")].concat(lignes.map(function (l) {
      return cols.map(function (c) { return '"' + String(l[c] == null ? "" : l[c]).replace(/"/g, '""') + '"'; }).join(";");
    })).join("\r\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "exodus-" + tab + "-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
  }

  if (pass) charger().catch(function () { pass = ""; try { sessionStorage.removeItem(KEY); } catch (e) {} });
})();
