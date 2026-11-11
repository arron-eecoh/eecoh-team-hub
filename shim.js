/* EECOH Team Hub: Supabase backend that stands in for the claude.ai artifact runtime.
   Gives the hub the same window.claude.use("db" | "user" | "room") calls it was written for. */
(function () {
  const SB_URL = "https://dbehrnapvfopqyxucidz.supabase.co";
  const SB_KEY = "sb_publishable_5TIH5W1Q5tjwKFZHTDx6wQ_MxGREb58";
  const PEOPLE = [
    { name: "Arron", email: "arron@eecoh.ca", label: "Arron" },
    { name: "Lucia", email: "lucia@eecoh.ca", label: "Lucia" },
    { name: "Florencia", email: "florencia@eecoh.ca", label: "Flor" },
    { name: "Luciana", email: "luciana@eecoh.ca", label: "Luciana" },
    { name: "Jo", email: "joanna@eecoh.ca", label: "Jo" }
  ];
  const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "eecoh-hub-auth" } });
  window.HUB_SB = sb;

  let person = null;
  let readyResolve; const ready = new Promise(r => { readyResolve = r; });

  /* ---------- sign in ---------- */
  const personOf = session => {
    if (!session || !session.user) return null;
    const e = (session.user.email || "").toLowerCase();
    const p = PEOPLE.find(x => x.email === e);
    return p ? p.name : ((session.user.user_metadata || {}).person || null);
  };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function showLogin(msg) {
    let el = document.getElementById("loginRoot");
    if (!el) { el = document.createElement("div"); el.id = "loginRoot"; document.body.appendChild(el); }
    let picked = null; try { picked = localStorage.getItem("eecoh-hub-last") || null; } catch (e) {}
    const draw = err => {
      el.innerHTML = '<div class="scrim" style="z-index:40;background:var(--bg)"></div><div class="modal" role="dialog" aria-modal="true" aria-labelledby="lgT" style="z-index:41">' +
        '<h2 id="lgT">EECOH Team Hub</h2><p class="small muted" style="margin:4px 0 14px">Tap your name, then enter your password.</p>' +
        '<div class="row" style="gap:8px;margin-bottom:14px">' + PEOPLE.map(p => '<button class="btn" type="button" data-lg="' + p.name + '" aria-pressed="' + (picked === p.name) + '" style="padding:9px 14px;' + (picked === p.name ? "border-color:var(--accent);background:var(--accent-soft);color:var(--accent)" : "") + '"><span class="av av-' + p.name + '" style="display:inline-grid;width:22px;height:22px;margin-right:6px;vertical-align:middle">' + p.label[0] + "</span>" + esc(p.label) + "</button>").join("") + "</div>" +
        '<form id="lgF" class="fgrid"><label class="f">Password<input id="lgP" type="password" autocomplete="current-password" required ' + (picked ? "" : "disabled") + "></label>" +
        (err ? '<p class="small" style="color:var(--bad);margin:0">' + esc(err) + "</p>" : "") +
        '<button class="btn pri" type="submit" ' + (picked ? "" : "disabled") + ' style="padding:10px">Sign in' + (picked ? " as " + esc((PEOPLE.find(p => p.name === picked) || {}).label || picked) : "") + "</button></form></div>";
      const pw = document.getElementById("lgP"); if (picked && pw) pw.focus();
    };
    el.onclick = e => { const b = e.target.closest("[data-lg]"); if (!b) return; picked = b.dataset.lg; draw(); };
    el.onsubmit = async e => {
      e.preventDefault(); const p = PEOPLE.find(x => x.name === picked); if (!p) return;
      const btn = el.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Signing in…";
      const { data, error } = await sb.auth.signInWithPassword({ email: p.email, password: document.getElementById("lgP").value });
      if (error) { draw(error.message === "Invalid login credentials" ? "That password doesn't match. Check it and try again." : "Couldn't sign in: " + error.message); return; }
      try { localStorage.setItem("eecoh-hub-last", p.name); } catch (e2) {}
      el.remove(); start(data.session);
    };
    draw(msg);
  }
  function start(session) {
    person = personOf(session);
    try { const k = "eecoh-hub-v3"; const o = JSON.parse(localStorage.getItem(k) || "{}") || {}; o.me = person; localStorage.setItem(k, JSON.stringify(o)); } catch (e) {}
    addAccountButton();
    readyResolve();
  }

  /* ---------- account: change your own password; Arron and Lucia can reset anyone's ---------- */
  const ADMINS = ["Arron", "Lucia"];
  function addAccountButton() {
    if (document.getElementById("acctBtn")) return;
    const out = document.querySelector('button[onclick="HUB_SIGNOUT()"]');
    if (!out) return;
    const b = document.createElement("button");
    b.id = "acctBtn"; b.type = "button"; b.className = "btn sm"; b.textContent = "Account";
    b.onclick = openAccount;
    out.parentNode.insertBefore(b, out);
  }
  function openAccount() {
    const root = document.getElementById("modalRoot") || document.body;
    const admin = ADMINS.includes(person);
    root.innerHTML = '<div class="scrim" data-acclose></div><div class="modal" role="dialog" aria-modal="true" aria-labelledby="acT">' +
      '<h2 id="acT">Your account</h2><p class="small muted" style="margin:4px 0 12px">Signed in as ' + esc(person === "Florencia" ? "Flor" : person) + '.</p>' +
      '<form id="acPw" class="fgrid"><div class="sec" style="margin:0">Change your password</div>' +
      '<label class="f">New password<input id="acN1" type="password" autocomplete="new-password" minlength="8" required></label>' +
      '<label class="f">Type it again<input id="acN2" type="password" autocomplete="new-password" minlength="8" required></label>' +
      '<p id="acMsg" class="small" style="margin:0"></p><button class="btn pri" type="submit">Save new password</button></form>' +
      (admin ? '<form id="acReset" class="fgrid" style="margin-top:18px;padding-top:14px;border-top:1px solid var(--line)"><div class="sec" style="margin:0">Reset a teammate\'s password</div>' +
        '<p class="small muted" style="margin:0">For someone who is locked out. Give them the new password, and they can change it from Account once they\'re in.</p>' +
        '<label class="f">Person<select id="acWho">' + PEOPLE.filter(p => p.name !== person).map(p => '<option value="' + p.email + '">' + esc(p.label) + "</option>").join("") + "</select></label>" +
        '<label class="f">New password for them<input id="acRP" type="text" autocomplete="off" minlength="8" required></label>' +
        '<p id="acRMsg" class="small" style="margin:0"></p><button class="btn" type="submit">Reset password</button></form>' : "") +
      '<div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" type="button" data-acclose>Close</button></div></div>';
    const close = () => { root.innerHTML = ""; };
    root.querySelectorAll("[data-acclose]").forEach(x => x.onclick = close);
    const say = (id, txt, bad) => { const m = document.getElementById(id); m.textContent = txt; m.style.color = bad ? "var(--bad)" : "var(--ok)"; };
    document.getElementById("acPw").onsubmit = async e => {
      e.preventDefault();
      const a = document.getElementById("acN1").value, b2 = document.getElementById("acN2").value;
      if (a.length < 8) return say("acMsg", "Use at least 8 characters.", true);
      if (a !== b2) return say("acMsg", "The two passwords don't match.", true);
      const { error } = await sb.auth.updateUser({ password: a });
      if (error) return say("acMsg", error.message.includes("different") ? "That's already your password. Pick a new one." : "Couldn't save: " + error.message, true);
      e.target.reset(); say("acMsg", "Saved. Use your new password next time you sign in.");
    };
    const rf = document.getElementById("acReset");
    if (rf) rf.onsubmit = async e => {
      e.preventDefault();
      const email = document.getElementById("acWho").value, pw = document.getElementById("acRP").value;
      const who = (PEOPLE.find(p => p.email === email) || {}).label || email;
      if (pw.length < 8) return say("acRMsg", "Use at least 8 characters.", true);
      const { data: s } = await sb.auth.getSession();
      try {
        const r = await fetch(SB_URL + "/functions/v1/admin-reset", { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + (s && s.session ? s.session.access_token : "") }, body: JSON.stringify({ email, password: pw }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return say("acRMsg", j.error || "Couldn't reset it.", true);
        say("acRMsg", "Done. " + who + " can now sign in with: " + pw);
      } catch (err) { say("acRMsg", "Couldn't reach the server. Check your connection.", true); }
    };
  }
  window.HUB_SIGNOUT = async () => { try { await sb.auth.signOut(); } catch (e) {} try { const k = "eecoh-hub-v3"; const o = JSON.parse(localStorage.getItem(k) || "{}") || {}; delete o.me; localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} location.reload(); };
  const boot = async () => {
    const { data } = await sb.auth.getSession();
    if (data && data.session && personOf(data.session)) start(data.session); else showLogin();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  /* ---------- live document store ---------- */
  const rows = new Map(); // "col\u0000id" -> data
  const K = (c, i) => c + "\u0000" + i;
  const listeners = new Set();
  let loaded = false;
  const split = path => { const p = path.split("/"); return { col: p.slice(0, -1).join("/"), id: p[p.length - 1] }; };
  const err = (code, message) => Object.assign(new Error(message || code), { code });

  async function loadAll() {
    const next = new Map(); let from = 0;
    for (;;) {
      const { data, error } = await sb.from("docs").select("col,id,data").range(from, from + 999);
      if (error) throw err("unavailable", error.message);
      data.forEach(r => next.set(K(r.col, r.id), r.data));
      if (data.length < 1000) break; from += 1000;
    }
    rows.clear(); next.forEach((v, k) => rows.set(k, v)); loaded = true; notifyAll();
  }
  function notifyAll() { listeners.forEach(l => l.fire()); }
  function notifyCol(col) { listeners.forEach(l => { if (l.col === col) l.fire(); }); }

  function makeQuery(col, opts) {
    const q = {
      orderBy: (field, dir) => makeQuery(col, Object.assign({}, opts, { order: { field, dir: dir || "asc" } })),
      limit: n => makeQuery(col, Object.assign({}, opts, { limit: n })),
      where: () => makeQuery(col, opts),
      doc: id => docRef(col + "/" + id),
      add: async data => { const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); await docRef(col + "/" + id).set(data); return { id }; },
      onSnapshot: (cb, onError) => {
        let prev = null;
        const l = { col, fire: () => {
          if (!loaded) return;
          let list = [];
          rows.forEach((v, k) => { const i = k.indexOf("\u0000"); if (k.slice(0, i) === col) list.push({ id: k.slice(i + 1), v }); });
          if (opts.order) { const f = opts.order.field, s = opts.order.dir === "desc" ? -1 : 1; list.sort((a, b) => { const x = a.v && a.v[f], y = b.v && b.v[f]; return (x == null ? "" : String(x)).localeCompare(y == null ? "" : String(y)) * s; }); }
          if (opts.limit) list = list.slice(0, opts.limit);
          const ids = new Set(list.map(x => x.id));
          const changes = prev ? list.filter(x => !prev.has(x.id)).map(x => ({ type: "added", doc: { id: x.id, data: () => x.v } })) : list.map(x => ({ type: "added", doc: { id: x.id, data: () => x.v } }));
          prev = ids;
          try { cb({ docs: list.map(x => ({ id: x.id, exists: true, data: () => JSON.parse(JSON.stringify(x.v)) })), size: list.length, empty: !list.length, metadata: { fromCache: false, hasPendingWrites: false }, docChanges: () => changes }); } catch (e) { console.error(e); }
        } };
        listeners.add(l); if (loaded) setTimeout(l.fire, 0);
        return () => listeners.delete(l);
      },
      get: async () => new Promise(res => { const un = q.onSnapshot(s => { un(); res(s); }); })
    };
    return q;
  }
  function docRef(path) {
    const { col, id } = split(path);
    return {
      id,
      set: async data => {
        const clean = JSON.parse(JSON.stringify(data));
        const had = rows.has(K(col, id)), old = rows.get(K(col, id));
        rows.set(K(col, id), clean); notifyCol(col);
        const { error } = await sb.from("docs").upsert({ col, id, data: clean });
        if (error) { if (had) rows.set(K(col, id), old); else rows.delete(K(col, id)); notifyCol(col); throw err(error.code === "42501" ? "invalid_argument" : "unavailable", error.message); }
      },
      update: async patch => { const cur = rows.get(K(col, id)) || {}; return docRef(path).set(Object.assign({}, cur, patch)); },
      delete: async () => {
        const old = rows.get(K(col, id)); rows.delete(K(col, id)); notifyCol(col);
        const { error } = await sb.from("docs").delete().eq("col", col).eq("id", id);
        if (error) { if (old !== undefined) rows.set(K(col, id), old); notifyCol(col); throw err("unavailable", error.message); }
      },
      get: async () => { const v = rows.get(K(col, id)); return { id, exists: v !== undefined, data: () => (v === undefined ? undefined : JSON.parse(JSON.stringify(v))) }; },
      onSnapshot: (cb, onError) => {
        const l = { col, fire: () => { if (!loaded) return; const v = rows.get(K(col, id)); try { cb({ id, exists: v !== undefined, data: () => (v === undefined ? undefined : JSON.parse(JSON.stringify(v))) }); } catch (e) { console.error(e); } } };
        listeners.add(l); if (loaded) setTimeout(l.fire, 0);
        return () => listeners.delete(l);
      }
    };
  }

  let channel = null, connecting = false;
  async function connect() {
    if (connecting) return; connecting = true;
    try {
      if (channel) { try { await sb.removeChannel(channel); } catch (e) {} channel = null; }
      const { data } = await sb.auth.getSession();
      if (data && data.session) sb.realtime.setAuth(data.session.access_token);
      channel = sb.channel("docs-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, p => {
          if (p.eventType === "DELETE") { const o = p.old || {}; if (o.col != null) { rows.delete(K(o.col, o.id)); notifyCol(o.col); } }
          else { const n = p.new; rows.set(K(n.col, n.id), n.data); notifyCol(n.col); }
        })
        .subscribe(status => {
          if (status === "SUBSCRIBED") loadAll().catch(() => {});
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setTimeout(() => { connecting = false; connect(); }, 3000);
        });
      await loadAll();
    } finally { connecting = false; }
  }
  /* phones pause the connection in the background: catch up as soon as the app is visible again */
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && person) { loadAll().catch(() => connect()); } });
  window.addEventListener("online", () => { if (person) connect(); });

  const db = { collection: c => makeQuery(c, {}), doc: p => docRef(p) };

  /* ---------- who is signed in ---------- */
  const user = {
    isOwner: async () => person === "Arron",
    canEdit: async () => person === "Arron",
    can: async () => true,
    id: async () => person,
    me: async () => ({ id: person, name: person })
  };

  /* ---------- who else has the app open right now ---------- */
  let room = null;
  function makeRoom() {
    const key = Math.random().toString(36).slice(2);
    const ch = sb.channel("presence-hub", { config: { presence: { key } } });
    let peersCb = null, subscribed = false, pending = null;
    const emit = () => {
      if (!peersCb) return;
      const st = ch.presenceState(); const peers = [];
      Object.keys(st).forEach(k => (st[k] || []).forEach(m => peers.push({ sameTab: k === key, kind: "viewer", presence: m.presence || {}, updatedAt: m.updatedAt || Date.now() })));
      peersCb({ peers });
    };
    ch.on("presence", { event: "sync" }, emit).subscribe(async s => { if (s === "SUBSCRIBED") { subscribed = true; if (pending) { await ch.track(pending); } } });
    return {
      presence: async state => { const p = { presence: state, updatedAt: Date.now() }; pending = p; if (subscribed) await ch.track(p); },
      onPeers: (cb) => { peersCb = cb; emit(); return () => { peersCb = null; }; }
    };
  }

  window.claude = {
    use: async name => {
      await ready;
      if (name === "user") return user;
      if (name === "db") { await connect(); return db; }
      if (name === "room") { if (!room) room = makeRoom(); return room; }
      return null;
    }
  };
})();
