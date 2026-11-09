/* Interface compartilhada: ícones de linha, modais, toasts, tema, PWA. Desenvolvido por Nexosys */
(function (g) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];

  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4M18.5 14.8c1.6.7 2.6 2.4 3 5.2"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="3"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.8" cy="6" r=".9"/><circle cx="3.8" cy="12" r=".9"/><circle cx="3.8" cy="18" r=".9"/>',
    tag: '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.4"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="m15 5-7 7 7 7"/>', right: '<path d="m9 5 7 7-7 7"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    phone: '<path d="M5 3.5h3.5l1.8 4.5-2.3 1.5a11 11 0 0 0 6.5 6.5l1.5-2.3 4.5 1.8V19a1.6 1.6 0 0 1-1.7 1.6A16.5 16.5 0 0 1 3.4 5.2 1.6 1.6 0 0 1 5 3.5Z"/>',
    whats: '<path d="M4 20l1.2-3.8A8 8 0 1 1 8 19Z"/><path d="M9.2 8.7c.3 2.5 2.4 4.8 5 5.4l1.1-1.1 1.6.7c-.2 1.3-1.2 1.9-2.3 1.8-3.4-.4-6.4-3.4-6.8-6.8-.1-1.1.5-2.1 1.8-2.3l.7 1.6Z"/>',
    insta: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r=".8"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2H4.5Z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20.5c1-4 4.2-6 8-6s7 2 8 6"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    out: '<path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4"/><path d="M10 16.5 5.5 12 10 7.5M5.5 12H15"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    down: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
    file: '<path d="M6 3h8l4.5 4.5V21H6Z"/><path d="M14 3v5h4.5M9 13h6M9 17h6"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
    heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z"/>',
    spark: '<path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7Z"/>',
    brow: '<path d="M3 15c3.5-5 9-7 14.5-5.5 1.3.4 2.5 1 3.5 2"/><path d="M5.5 13.5c3-2.4 7-3.3 11-2.3"/>',
    drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z"/>',
    wave: '<path d="M3 9c3-3 6 3 9 0s6 3 9 0M3 15c3-3 6 3 9 0s6 3 9 0"/>',
    pen: '<path d="m14.5 4.5 5 5L9 20H4v-5Z"/><path d="M12.5 6.5l5 5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z"/><path d="M5 19 13 11"/>',
    camera: '<path d="M4 8h3l1.8-2.5h6.4L17 8h3v11H4Z"/><circle cx="12" cy="13" r="3.4"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8Z"/>',
    drag: '<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>',
    google: '<path d="M20 12.2c0-.6-.1-1.2-.2-1.7H12v3.3h4.5a3.9 3.9 0 0 1-1.7 2.5v2.1h2.7c1.6-1.5 2.5-3.6 2.5-6.2Z"/><path d="M12 20.5c2.3 0 4.2-.8 5.5-2.1l-2.7-2.1c-.8.5-1.7.8-2.8.8a4.9 4.9 0 0 1-4.6-3.4H4.6v2.2A8.5 8.5 0 0 0 12 20.5Z"/><path d="M7.4 13.7a5 5 0 0 1 0-3.4V8.1H4.6a8.5 8.5 0 0 0 0 7.8Z"/><path d="M12 6.9c1.3 0 2.4.4 3.3 1.3l2.4-2.4A8.5 8.5 0 0 0 4.6 8.1l2.8 2.2A4.9 4.9 0 0 1 12 6.9Z"/>'
  };
  const ic = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  /* Logo: sobrancelha em traço contínuo */
  const logoSVG = (size, cls) => `<svg class="logo-mark ${cls || ''}" width="${size || 40}" height="${size || 40}" viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="var(--logo-bg)"/><path d="M12 38c6-9.5 15.5-14.5 26-13.5 6.5.6 11.5 3.5 14 7.5-4-2.6-9-3.6-14-3.2-8.6.7-15.5 4.6-20 9.7" stroke="var(--logo-fg)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="47" cy="17" r="1.6" fill="var(--logo-acc)"/></svg>`;
  const logoStudio = (db, size) => db.studio.logo ? `<img class="logo-img" src="${esc(db.studio.logo)}" width="${size || 40}" height="${size || 40}" alt="">` : logoSVG(size);

  /* Toast */
  function toast(msg, tipo) {
    let w = $('#toasts'); if (!w) { w = document.createElement('div'); w.id = 'toasts'; w.setAttribute('aria-live', 'polite'); document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = 'toast ' + (tipo || ''); t.innerHTML = `${ic(tipo === 'erro' ? 'x' : 'check')}<span>${esc(msg)}</span>`;
    w.appendChild(t); setTimeout(() => { t.classList.add('sai'); setTimeout(() => t.remove(), 300); }, 3200);
  }

  /* Modal / folha inferior */
  let pilha = [];
  function modal(html, opt) {
    opt = opt || {};
    const m = document.createElement('div'); m.className = 'modal-bg' + (opt.cheia ? ' cheia' : '');
    m.innerHTML = `<div class="modal ${opt.largo ? 'largo' : ''}" role="dialog" aria-modal="true">${opt.titulo ? `<header class="modal-h"><h3>${esc(opt.titulo)}</h3><button class="btn-ic" data-fechar aria-label="Fechar">${ic('x')}</button></header>` : ''}<div class="modal-c">${html}</div></div>`;
    document.body.appendChild(m); pilha.push(m); document.body.classList.add('travado');
    const fechar = () => { m.classList.add('sai'); setTimeout(() => { m.remove(); pilha = pilha.filter(x => x !== m); if (!pilha.length) document.body.classList.remove('travado'); }, 180); if (opt.aoFechar) opt.aoFechar(); };
    m.addEventListener('click', e => { if ((e.target === m && !opt.fixo) || e.target.closest('[data-fechar]')) fechar(); });
    m.fechar = fechar;
    setTimeout(() => { const f = m.querySelector('[autofocus]'); if (f) f.focus(); }, 60);
    return m;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pilha.length && !pilha[pilha.length - 1].classList.contains('cheia')) pilha[pilha.length - 1].fechar(); });
  function fecharModais() { pilha.slice().forEach(m => m.fechar()); }

  function confirmar(texto, opt) {
    opt = opt || {};
    return new Promise(res => {
      const m = modal(`<p class="mb">${esc(texto)}</p><div class="acoes"><button class="btn sec" data-r="0">${esc(opt.nao || 'Voltar')}</button><button class="btn ${opt.perigo ? 'perigo' : ''}" data-r="1">${esc(opt.sim || 'Confirmar')}</button></div>`, { titulo: opt.titulo || 'Confirmar', aoFechar: () => res(false) });
      m.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { res(b.dataset.r === '1'); m.fechar(); });
    });
  }

  /* Tema claro/escuro */
  function tema(set) {
    let t; try { t = localStorage.getItem('nexo_tema'); } catch (e) { }
    if (set) { t = set === 'alternar' ? (document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark') : set; try { localStorage.setItem('nexo_tema', t); } catch (e) { } }
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    const meta = $('meta[name=theme-color]'); if (meta) meta.content = t === 'dark' ? '#241a1f' : '#FAF6F2';
    return t;
  }

  const estrelas = (n, max) => `<span class="estrelas" aria-label="${n} de 5 estrelas">${Array.from({ length: max || 5 }, (_, i) => `<span class="${i < Math.round(n) ? 'on' : ''}">${ic('star')}</span>`).join('')}</span>`;
  const iniciais = nome => (nome || '?').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
  const badge = st => `<span class="badge st-${st}">${Nexo.STATUS[st] || st}</span>`;

  /* PWA + notificações do sistema */
  let swReg = null;
  async function pwa() {
    if ('serviceWorker' in navigator) {
      try { swReg = await navigator.serviceWorker.register('/sw.js', { scope: '/' }); } catch (e) { console.warn('SW', e); }
    }
  }
  async function pedirNotificacoes() {
    if (!('Notification' in g)) { toast('Este navegador não suporta notificações.', 'erro'); return false; }
    const p = await Notification.requestPermission();
    if (p === 'granted') { toast('Notificações ativadas.'); return true; }
    toast('Permissão de notificação negada.', 'erro'); return false;
  }
  async function notificarSistema(titulo, texto, url) {
    if (!('Notification' in g) || Notification.permission !== 'granted') return;
    const reg = swReg || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration());
    const op = { body: texto, icon: '/icons/' + (location.pathname.startsWith('/cliente') ? 'cliente' : 'painel') + '-192.png', badge: '/icons/badge.png', data: { url: url || location.href }, tag: titulo };
    if (reg) reg.showNotification(titulo, op); else new Notification(titulo, op);
  }
  let instalarEvt = null;
  g.addEventListener('beforeinstallprompt', e => { e.preventDefault(); instalarEvt = e; document.documentElement.classList.add('pode-instalar'); });
  async function instalar() {
    if (instalarEvt) { instalarEvt.prompt(); await instalarEvt.userChoice; instalarEvt = null; document.documentElement.classList.remove('pode-instalar'); }
    else toast('No iPhone: toque em Compartilhar → "Adicionar à Tela de Início". No Android: menu ⋮ → "Instalar app".');
  }

  function arquivoParaDataURL(file, maxLado) {
    return new Promise((res, rej) => {
      const fr = new FileReader(); fr.onerror = rej;
      fr.onload = () => {
        const img = new Image(); img.onerror = rej;
        img.onload = () => {
          const k = Math.min(1, (maxLado || 900) / Math.max(img.width, img.height));
          const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  const mascaraFone = el => { el.addEventListener('input', () => { const d = Nexo.soDigitos(el.value).slice(0, 11); el.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d; }); };

  /* Mini calendário. o = { mes:'AAAA-MM', sel, min, max, desab(d)->bool, marca(d)->bool, onDia:'fn', onMes:'fn' } */
  function calendario(o) {
    const N = Nexo; const [y, m] = o.mes.split('-').map(Number);
    const primeiro = `${o.mes}-01`; const ini = N.addDias(primeiro, -N.diaSemana(primeiro));
    const mesAnt = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    const mesProx = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    const hj = N.hoje();
    const podeAnt = !o.min || mesAnt >= o.min.slice(0, 7), podeProx = !o.max || mesProx <= o.max.slice(0, 7);
    let cel = N.DIAS_C.map(d => `<div class="dn">${d[0]}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = N.addDias(ini, i);
      if (i % 7 === 0 && d.slice(0, 7) > o.mes) break;
      if (d.slice(0, 7) !== o.mes) { cel += '<span></span>'; continue; }
      const dis = (o.min && d < o.min) || (o.max && d > o.max) || (o.desab && o.desab(d));
      cel += `<button type="button" ${dis ? 'disabled' : ''} class="${d === hj ? 'hj' : ''} ${d === o.sel ? 'on' : ''} ${!dis && o.marca && o.marca(d) ? 'tem' : ''}" onclick="${o.onDia}('${d}')" aria-label="${N.fmtDataLonga(d)}">${+d.slice(8)}</button>`;
    }
    return `<div class="cal"><div class="cal-h"><button type="button" class="btn-ic" ${podeAnt ? '' : 'disabled'} onclick="${o.onMes}('${mesAnt}')" aria-label="Mês anterior">${ic('left')}</button><b>${N.MESES[m - 1]} ${y}</b><button type="button" class="btn-ic" ${podeProx ? '' : 'disabled'} onclick="${o.onMes}('${mesProx}')" aria-label="Próximo mês">${ic('right')}</button></div><div class="cal-g">${cel}</div></div>`;
  }

  /* Agrupa horários em manhã/tarde/noite */
  function gradeSlots(lista, sel, onClick) {
    if (!lista.length) return '';
    const grupos = [['Manhã', h => h < '12:00'], ['Tarde', h => h >= '12:00' && h < '18:00'], ['Noite', h => h >= '18:00']];
    return grupos.map(([n, f]) => { const l = lista.filter(f); return l.length ? `<div class="slot-grupo">${n}</div><div class="slots">${l.map(h => `<button type="button" class="slot ${h === sel ? 'on' : ''}" onclick="${onClick}('${h}')">${h}</button>`).join('')}</div>` : ''; }).join('');
  }

  g.UI = { calendario, gradeSlots, esc, $, $$, ic, logoSVG, logoStudio, toast, modal, confirmar, fecharModais, tema, estrelas, iniciais, badge, pwa, pedirNotificacoes, notificarSistema, instalar, arquivoParaDataURL, mascaraFone };
})(window);
