/* Painel da dona — rota "/" · Desenvolvido por Nexosys */
(function () {
  'use strict';
  const N = Nexo, { esc, $, $$, ic, toast, modal, confirmar, badge, estrelas, iniciais } = UI;
  const D = () => N.load();
  const P = window.P = {};
  const H = () => N.hoje();
  const app = document.getElementById('app');
  const S = {
    agenda: { modo: innerWidth < 760 ? 'dia' : 'semana', data: H() },
    novo: null,
    atend: { de: N.addDias(H(), -30), ate: N.addDias(H(), 14), status: 'todos', q: '', serv: '' },
    cli: { q: '', ord: 'nome' }, ficha: { aba: 'historico' }, priv: { aba: 'pedidos' }, caixaMes: H().slice(0, 7), aval: 0, login: { passo: 1 }
  };
  const sessaoOK = () => { try { return localStorage.getItem('nexo_sessao_dona') === 'ok'; } catch (e) { return false; } };

  /* ============================ Login ============================ */
  function telaLogin() {
    const db = D();
    document.title = 'Entrar · ' + db.studio.nome;
    app.innerHTML = `<div class="login-w"><button class="btn-ic login-tema" id="tema-b" onclick="P.tema()" aria-label="Modo claro/escuro" title="Modo claro/escuro">${icTema()}</button><div class="login">
      <div class="marca">${UI.logoStudio(db, 64)}<h1>${esc(db.studio.nome)}</h1><p class="muted small">Painel da profissional</p></div>
      <div class="card">
      ${S.login.passo === 1 ? `
        <form class="col" onsubmit="event.preventDefault();P.entrar()">
          <label class="f"><span>Usuária</span><input class="inp" id="lg-u" autocomplete="username" value="dona" autofocus></label>
          <label class="f"><span>Senha</span><input class="inp" id="lg-s" type="password" autocomplete="current-password" placeholder="••••••"></label>
          <button class="btn bloco mt-s">Entrar</button>
          <p class="dica">Demonstração: usuária <b>dona</b> · senha <b>demo123</b></p>
        </form>` : `
        <form class="col" onsubmit="event.preventDefault();P.entrar2fa()">
          <div class="row">${ic('shield')}<h3>Verificação em duas etapas</h3></div>
          <p class="muted small">Digite o código de 6 dígitos do seu app autenticador.</p>
          <input class="inp codigo" id="lg-c" inputmode="numeric" maxlength="6" autocomplete="one-time-code" autofocus>
          <button class="btn bloco">Verificar</button>
          <button type="button" class="btn ghost" onclick="P.voltarLogin()">Voltar</button>
        </form>`}
      </div>
      <p class="mt small" style="text-align:center"><a href="cliente/">Abrir o app da cliente →</a></p>
      <div class="nexo-ass">Desenvolvido por <b>Nexosys</b></div>
    </div></div>`;
  }
  P.entrar = () => {
    const db = D();
    if ($('#lg-u').value.trim().toLowerCase() !== db.seguranca.usuario || N.hash($('#lg-s').value) !== db.seguranca.senhaHash) { toast('Usuária ou senha incorretas.', 'erro'); return; }
    if (db.seguranca.totpAtivo) { S.login.passo = 2; telaLogin(); return; }
    concluirLogin();
  };
  P.entrar2fa = async () => { if (await N.totpVerificar(D().seguranca.totpSegredo, $('#lg-c').value)) concluirLogin(); else toast('Código inválido ou expirado.', 'erro'); };
  P.voltarLogin = () => { S.login.passo = 1; telaLogin(); };
  function concluirLogin() { try { localStorage.setItem('nexo_sessao_dona', 'ok'); } catch (e) { } S.login.passo = 1; if (!location.hash || location.hash === '#/') location.hash = '#/inicio'; render(); }
  P.sair = async () => { if (await confirmar('Sair do painel neste aparelho?', { sim: 'Sair' })) { try { localStorage.removeItem('nexo_sessao_dona'); } catch (e) { } render(); } };

  /* ============================ Estrutura ============================ */
  // "Hoje", "Amanhã" ou "Qua, 11/11"
  const diaCurto = d => { const hj = N.hoje(); if (d === hj) return 'Hoje'; if (d === N.addDias(hj, 1)) return 'Amanhã'; return `${N.DIAS_C[N.diaSemana(d)]}, ${d.slice(8, 10)}/${d.slice(5, 7)}`; };
  const escuro = () => document.documentElement.dataset.theme === 'dark';
  const icTema = () => ic(escuro() ? 'sun' : 'moon');
  const MENU = [['inicio', 'Início', 'home'], ['agenda', 'Agenda', 'cal'], ['novo', 'Novo', 'plus'], ['clientes', 'Clientes', 'users'], ['caixa', 'Caixa', 'cash']];
  const MAIS = [['atendimentos', 'Atendimentos', 'list', 'Histórico e status'], ['servicos', 'Serviços e preços', 'tag', 'Duração, valores, retorno'], ['avaliacoes', 'Avaliações', 'star', 'Notas das clientes'], ['galeria', 'Galeria de trabalhos', 'camera', 'Fotos no app da cliente'], ['config', 'Configurações', 'gear', 'Studio, regras, segurança'], ['privacidade', 'Privacidade (LGPD)', 'shield', 'Aceites e pedidos']];
  function rota() { const h = (location.hash || '#/inicio').slice(2).split('?')[0].split('/'); return { r: h[0] || 'inicio', arg: h[1] }; }
  function qs() { return new URLSearchParams((location.hash.split('?')[1]) || ''); }

  function shell(r, conteudo, db) {
    const pend = db.agendamentos.filter(a => a.status === 'pendente').length;
    const pedidos = db.lgpd.pedidos.filter(p => p.status === 'aberto').length;
    const ativo = x => (x === r || (x === 'clientes' && r === 'ficha') || (x === 'mais' && MAIS.some(m => m[0] === r))) ? 'on' : '';
    const n = (k) => k === 'inicio' && pend ? `<span class="pill-n">${pend}</span>` : k === 'privacidade' && pedidos ? `<span class="pill-n">${pedidos}</span>` : '';
    return `
    <aside class="side">
      <div class="marca">${UI.logoStudio(db, 40)}<b>${esc(db.studio.nome)}</b></div>
      <a class="btn novo-btn" href="#/novo">${ic('plus')} Novo atendimento</a>
      <nav>${MENU.filter(m => m[0] !== 'novo').map(([k, l, i]) => `<a href="#/${k}" class="${ativo(k)}">${ic(i)} ${l}${n(k)}</a>`).join('')}
        <div class="sep"></div>
        ${MAIS.map(([k, l, i]) => `<a href="#/${k}" class="${ativo(k)}">${ic(i)} ${l}${n(k)}</a>`).join('')}
        <div class="sep"></div>
        <a href="cliente/" target="_blank">${ic('heart')} App da cliente</a>
      </nav>
      <div class="pe">
        <div class="row"><button class="btn-ic" onclick="P.tema()" title="Modo claro/escuro">${icTema()}</button><button class="btn-ic" onclick="P.sair()" title="Sair">${ic('out')}</button></div>
        <div class="nexo-ass" style="text-align:left;padding:10px 4px 0">Desenvolvido por <b>Nexosys</b></div>
      </div>
    </aside>
    <main class="main" id="main">${conteudo}<div class="nexo-ass">Desenvolvido por <b>Nexosys</b></div></main>
    <nav class="bnav">${MENU.map(([k, l, i]) => k === 'novo' ? `<a href="#/novo" class="novo" aria-label="Novo atendimento"><span class="bola">${ic('plus')}</span></a>` : `<a href="#/${k}" class="${ativo(k)}">${ic(i)}<span>${l}</span>${n(k)}</a>`).join('').replace(`<a href="#/caixa"`, `<a href="#/caixa"`)}
    </nav>`;
  }
  // No celular a barra tem 5 itens; "Mais" fica no topo de cada tela.
  const topo = (titulo, sub, direita) => `<div class="topo"><div class="grow"><h1>${titulo}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="row">${direita || ''}<button class="btn-ic tema-m" onclick="P.tema()" aria-label="Modo claro/escuro" title="Modo claro/escuro">${icTema()}</button>${sinoBtn()}<a class="btn-ic mais-m" href="#/mais" title="Mais" aria-label="Mais opções">${ic('more')}</a></div></div>`;
  function sinoBtn() { const n = D().notificacoes.filter(x => x.para === 'dona' && !x.lida).length; return `<button class="btn-ic" style="position:relative" onclick="P.notifs()" aria-label="Notificações">${ic('bell')}${n ? `<span class="pill-n" style="top:2px;right:2px">${n}</span>` : ''}</button>`; }

  const TELAS = {};
  let depois = null;
  function render() {
    const db = D();
    if (!sessaoOK()) return telaLogin();
    const { r, arg } = rota();
    const t = TELAS[r] || TELAS.inicio;
    depois = null;
    const html = t(db, arg);
    app.innerHTML = shell(r, html, db);
    document.title = `${db.studio.nome} · Painel`;
    if (depois) depois();
    window.scrollTo({ top: P._manterScroll ? window.scrollY : 0 }); P._manterScroll = false;
  }
  function rerender() { P._manterScroll = true; const y = scrollY; render(); scrollTo(0, y); }
  P.tema = () => {
    UI.tema('alternar');
    if (!sessaoOK()) { const b = $('#tema-b'); if (b) b.innerHTML = icTema(); return; } // tela de login: só troca o ícone, sem apagar o que foi digitado
    rerender();
  };

  P.notifs = () => {
    const db = D(); const l = db.notificacoes.filter(x => x.para === 'dona');
    modal(l.length ? `<div class="lista">${l.slice(0, 40).map(x => `<div class="item"><div class="avatar sm">${ic('bell')}</div><div class="grow"><div class="t">${esc(x.titulo)} ${x.lida ? '' : '<span class="badge st-pendente">nova</span>'}</div><div class="s">${esc(x.texto)}</div><div class="tiny soft">${N.fmtDataHora(x.em)}</div></div></div>`).join('')}</div>` : `<div class="vazio">${ic('bell')}<p>Nenhuma notificação.</p></div>`, { titulo: 'Notificações', aoFechar: () => setTimeout(rerender, 200) });
    l.forEach(x => (x.lida = true)); N.save(db);
  };

  /* ============================ Detalhe do atendimento ============================ */
  P.abrirAg = id => {
    const db = D(); const a = db.agendamentos.find(x => x.id === id); if (!a) return;
    const c = N.cliente(db, a.clienteId) || { nome: '—' };
    const futuro = N.abs(a.data, a.hora) > N.absAgora();
    const bt = [];
    if (a.status === 'pendente') bt.push(`<button class="btn sec" onclick="P.recusar('${id}')">Recusar</button>`, `<button class="btn ok" onclick="P.aprovar('${id}')">${ic('check')} Aprovar</button>`);
    if (a.status === 'confirmado') { bt.push(`<button class="btn sec" onclick="P.mudarStatus('${id}','cancelado')">Cancelar</button>`, `<button class="btn sec" onclick="P.mudarStatus('${id}','faltou')">Faltou</button>`); if (!futuro || a.data === H()) bt.push(`<button class="btn ok" onclick="P.concluir('${id}')">${ic('check')} Concluir</button>`); }
    if (['pendente', 'confirmado'].includes(a.status)) bt.push(`<button class="btn sec" onclick="P.remarcar('${id}')">${ic('clock')} Remarcar</button>`);
    if (a.status === 'concluido') bt.push(`<button class="btn sec" onclick="P.concluir('${id}')">${ic('edit')} Pagamento</button>`);
    if (['cancelado', 'faltou'].includes(a.status)) bt.push(`<button class="btn sec" onclick="P.mudarStatus('${id}','confirmado')">Reabrir</button>`);
    const m = modal(`
      <div class="row mb"><div class="avatar">${iniciais(c.nome)}</div><div class="grow"><div class="t" style="font-weight:600">${esc(c.nome)}</div><div class="small muted">${N.fmtFone(c.whatsapp)}</div></div>${badge(a.status)}</div>
      <div class="card flat" style="background:var(--surface-2);border:0">
        <div class="linha-cfg"><span class="muted">Serviços</span><b style="text-align:right">${esc(N.nomesServ(db, a.servicoIds))}</b></div>
        <div class="linha-cfg"><span class="muted">Quando</span><b style="text-align:right">${N.fmtData(a.data)} · ${a.hora}–${N.mh(N.hm(a.hora) + a.duracao)}</b></div>
        <div class="linha-cfg"><span class="muted">Duração</span><b>${N.fmtDur(a.duracao)}</b></div>
        <div class="linha-cfg"><span class="muted">Valor</span><b>${N.fmtMoeda(a.preco)}</b></div>
        ${a.pagamento ? `<div class="linha-cfg"><span class="muted">Pagamento</span><b>${N.PAGAMENTOS[a.pagamento]}</b></div>` : ''}
        <div class="linha-cfg"><span class="muted">Origem</span><span>${a.origem === 'app' ? 'App da cliente' : 'Painel'}</span></div>
        ${a.obs ? `<div class="linha-cfg"><span class="muted">Obs.</span><span>${esc(a.obs)}</span></div>` : ''}
      </div>
      ${(a.historico || []).length ? `<p class="tiny soft mt">${a.historico.map(h => `${N.fmtDataHora(h.em)} — ${esc(h.acao)}`).join('<br>')}</p>` : ''}
      <div class="row wrap mt">${!c.anonimizada ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${N.waLink(c.whatsapp, `Oi, ${c.nome.split(' ')[0]}! Sobre seu horário em ${N.fmtData(a.data)} às ${a.hora}:`)}">${ic('whats')} WhatsApp</a><a class="btn ghost sm" href="#/ficha/${c.id}" data-fechar>${ic('user')} Ficha</a>` : ''}</div>
      <div class="acoes">${bt.join('')}</div>`, { titulo: 'Atendimento' });
    m.dataset.ag = id;
  };
  function fecharERender() { UI.fecharModais(); setTimeout(rerender, 200); }
  P.aprovar = id => { const db = D(); const a = db.agendamentos.find(x => x.id === id); a.status = 'confirmado'; N.notificar(db, a.clienteId, 'Horário confirmado 💕', `${N.nomesServ(db, a.servicoIds)} em ${N.fmtData(a.data)} às ${a.hora}. Te esperamos!`); N.save(db); toast('Agendamento aprovado. A cliente foi avisada.'); fecharERender(); };
  P.recusar = async id => {
    if (!await confirmar('Recusar este pedido? A cliente será avisada para escolher outro horário.', { sim: 'Recusar', perigo: true })) return;
    const db = D(); const a = db.agendamentos.find(x => x.id === id); a.status = 'cancelado'; a.historico = (a.historico || []).concat({ em: N.isoAgora(), acao: 'Pedido recusado pela profissional' });
    N.notificar(db, a.clienteId, 'Horário não disponível', `Seu pedido para ${N.fmtData(a.data)} às ${a.hora} não pôde ser aceito. Escolha outro horário no app.`); N.save(db); toast('Pedido recusado.'); fecharERender();
  };
  P.mudarStatus = async (id, st) => {
    const nomes = { cancelado: 'Cancelar este atendimento?', faltou: 'Marcar que a cliente faltou?', confirmado: 'Reabrir como confirmado?' };
    if (!await confirmar(nomes[st], { perigo: st !== 'confirmado' })) return;
    const db = D(); const a = db.agendamentos.find(x => x.id === id);
    if (st === 'confirmado' && N.conflito(db, a.data, a.hora, a.duracao, a.id)) { toast('Esse horário já está ocupado. Use Remarcar.', 'erro'); return; }
    a.status = st; a.historico = (a.historico || []).concat({ em: N.isoAgora(), acao: 'Status: ' + N.STATUS[st] });
    if (st === 'cancelado') N.notificar(db, a.clienteId, 'Horário cancelado', `Seu horário de ${N.fmtData(a.data)} às ${a.hora} foi cancelado pelo studio.`);
    N.save(db); toast('Status atualizado.'); fecharERender();
  };
  P.concluir = id => {
    const db = D(); const a = db.agendamentos.find(x => x.id === id);
    let pag = a.pagamento || 'pix';
    const m = modal(`<p class="muted small mb">${esc(N.nomesServ(db, a.servicoIds))}</p>
      <label class="f mb"><span>Valor recebido (R$)</span><input class="inp" id="cc-v" type="number" step="0.01" min="0" value="${a.preco}"></label>
      <span class="small muted">Forma de pagamento</span>
      <div class="chips mt-s" id="cc-p">${['pix', 'dinheiro', 'debito', 'credito'].map(p => `<button class="chip ${p === pag ? 'on' : ''}" data-p="${p}">${N.PAGAMENTOS[p]}</button>`).join('')}</div>
      <div class="acoes"><button class="btn" id="cc-ok">${ic('check')} Salvar</button></div>`, { titulo: 'Concluir atendimento' });
    $$('#cc-p .chip', m).forEach(b => b.onclick = () => { pag = b.dataset.p; $$('#cc-p .chip', m).forEach(x => x.classList.toggle('on', x === b)); });
    $('#cc-ok', m).onclick = () => { const db2 = D(); const x = db2.agendamentos.find(y => y.id === id); x.status = 'concluido'; x.pagamento = pag; x.preco = Math.max(0, +$('#cc-v', m).value || 0); N.save(db2); toast('Atendimento concluído.'); fecharERender(); };
  };

  /* Remarcar (modal com calendário + horários livres) */
  P.remarcar = (id, dataIni) => {
    const db = D(); const a = db.agendamentos.find(x => x.id === id);
    const st = { data: dataIni || (a.data >= H() ? a.data : H()), mes: null, hora: null };
    st.mes = st.data.slice(0, 7);
    const m = modal(`<div id="rm-w"></div>`, { titulo: 'Remarcar horário' });
    const desenha = () => {
      const livres = N.horariosLivres(D(), st.data, a.duracao, { ignorarId: id });
      $('#rm-w', m).innerHTML = `<p class="small muted mb">${esc(N.nomesServ(db, a.servicoIds))} · ${N.fmtDur(a.duracao)}</p>
        ${UI.calendario({ mes: st.mes, sel: st.data, min: H(), desab: d => N.diaFechado(D(), d), onDia: 'P._rmDia', onMes: 'P._rmMes' })}
        <h4 class="mt mb-s">${N.fmtDataLonga(st.data)}</h4>
        ${livres.length ? UI.gradeSlots(livres, st.hora, 'P._rmHora') : '<p class="muted small">Sem horários livres neste dia.</p>'}
        <div class="acoes"><button class="btn" ${st.hora ? '' : 'disabled'} onclick="P._rmOk()">Confirmar ${st.hora ? N.fmtData(st.data) + ' às ' + st.hora : ''}</button></div>`;
    };
    P._rmDia = d => { st.data = d; st.hora = null; desenha(); };
    P._rmMes = mm => { st.mes = mm; desenha(); };
    P._rmHora = h => { st.hora = h; desenha(); };
    P._rmOk = async () => {
      try {
        const ag = await N.reservar({ data: st.data, hora: st.hora, servicoIds: a.servicoIds, duracao: a.duracao }, { ignorarId: id, origem: 'painel' });
        const db2 = D(); N.notificar(db2, ag.clienteId, 'Horário remarcado', `Seu horário foi para ${N.fmtData(ag.data)} às ${ag.hora}.`); N.save(db2);
        toast('Horário remarcado.'); fecharERender();
      } catch (e) { toast(e.message, 'erro'); desenha(); }
    };
    desenha();
  };

  /* ============================ INÍCIO ============================ */
  TELAS.inicio = db => {
    const hj = H(), ag = N.agora();
    const saud = ag.min < 720 ? 'Bom dia' : ag.min < 1080 ? 'Boa tarde' : 'Boa noite';
    const doDia = db.agendamentos.filter(a => a.data === hj && a.status !== 'cancelado');
    const pend = db.agendamentos.filter(a => a.status === 'pendente' && N.abs(a.data, a.hora) > N.absAgora() - 60);
    const fd = N.faturamento(db, hj, hj), fs = N.faturamento(db, N.inicioSemana(hj), hj), fm = N.faturamento(db, hj.slice(0, 7) + '-01', hj);
    const previsto = doDia.filter(a => a.status === 'confirmado').reduce((s, a) => s + a.preco, 0);
    const f30 = N.faturamento(db, N.addDias(hj, -29), hj);
    const cont = {}; f30.ags.forEach(a => a.servicoIds.forEach(s => (cont[s] = (cont[s] || 0) + 1)));
    const top = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 6); const maxTop = top.length ? top[0][1] : 1;
    const dias = db.regras.sumidasDias || 45;
    const sumidas = db.clientes.filter(c => !c.anonimizada).map(c => ({ c, u: N.ultimaVisita(db, c.id) })).filter(x => x.u && N.diffDias(x.u.data, hj) >= dias && !N.proximoHorario(db, x.c.id)).sort((a, b) => a.u.data.localeCompare(b.u.data));
    const fila = (db.filaWhats || []).filter(w => !w.enviado);
    const agoraAbs = N.absAgora();

    // Ordem pensada para o celular: pedidos pendentes (o que pede ação) primeiro, depois o dia, depois os números.
    const secPedidos = `
      <section class="card${pend.length ? ' destaque' : ''}"><div class="card-h"><h3>Pedidos para aprovar</h3>${pend.length ? `<span class="badge st-pendente">${pend.length}</span>` : ''}</div>
        ${pend.length ? `<div class="lista">${pend.map(a => { const c = N.cliente(db, a.clienteId) || {}; return `<div class="ped">
          <div class="ped-info" onclick="P.abrirAg('${a.id}')"><div class="avatar sm">${iniciais(c.nome)}</div><div class="grow"><div class="t ellip">${esc(c.nome)}</div><div class="quando">${diaCurto(a.data)} · ${a.hora}</div><div class="s ellip">${esc(N.nomesServ(db, a.servicoIds))}</div></div></div>
          <div class="ped-acoes"><button class="btn sec sm" onclick="P.recusar('${a.id}')">${ic('x')} Recusar</button><button class="btn sm ok" onclick="P.aprovar('${a.id}')">${ic('check')} Aprovar</button></div></div>`; }).join('')}</div>` : `<div class="vazio">${ic('check')}<p>Tudo em dia! Nenhum pedido pendente.</p></div>`}
      </section>
`;
    const secHoje = `
      <section class="card"><div class="card-h"><h3>Hoje</h3><a class="btn ghost sm" href="#/agenda">Agenda ${ic('right')}</a></div>
        ${doDia.length ? `<div class="timeline">${doDia.map(a => {
          const c = N.cliente(db, a.clienteId) || {}; const i = N.abs(a.data, a.hora), f = i + a.duracao;
          const cls = a.status === 'concluido' ? 'feito' : (agoraAbs >= i && agoraAbs < f ? 'agora' : '');
          return `<div class="tl ${cls}"><div class="row sp"><span class="h">${a.hora} – ${N.mh(N.hm(a.hora) + a.duracao)}</span>${badge(a.status)}</div>
            <div class="item clic" style="border:0;padding:6px 8px;margin:2px -8px 0" onclick="P.abrirAg('${a.id}')"><div class="grow"><div class="t ellip">${esc(c.nome)}</div><div class="s ellip">${esc(N.nomesServ(db, a.servicoIds))} · ${N.fmtMoeda(a.preco)}</div></div>
            ${a.status === 'confirmado' && agoraAbs >= i ? `<button class="btn sm ok" onclick="event.stopPropagation();P.concluir('${a.id}')">Concluir</button>` : ''}</div></div>`;
        }).join('')}</div>` : `<div class="vazio">${ic('cal')}<p>Nenhum atendimento hoje.</p><a class="btn sm mt-s" href="#/novo">Novo atendimento</a></div>`}
      </section>
`;
    return topo(`${saud}!`, `${N.fmtDataLonga(hj)} · ${doDia.length} atendimento${doDia.length === 1 ? '' : 's'} hoje`) + `
    <div class="grid g2 mb" style="align-items:start">${pend.length ? secPedidos + secHoje : secHoje + secPedidos}</div>
    <div class="grid g4 mb">
      <div class="card kpi"><div class="l">Hoje</div><div class="v">${N.fmtMoeda(fd.total)}</div><div class="d">+ ${N.fmtMoeda(previsto)} previsto</div></div>
      <div class="card kpi"><div class="l">Semana</div><div class="v">${N.fmtMoeda(fs.total)}</div><div class="d">${fs.qtd} atendimentos</div></div>
      <div class="card kpi"><div class="l">Mês</div><div class="v">${N.fmtMoeda(fm.total)}</div><div class="d">${fm.qtd} atendimentos</div></div>
      <div class="card kpi"><div class="l">Ticket médio</div><div class="v">${N.fmtMoeda(fm.ticket)}</div><div class="d">no mês</div></div>
    </div>
    <div class="grid g2 mb">
      <section class="card"><div class="card-h"><h3>Serviços mais vendidos</h3><span class="small muted">últimos 30 dias</span></div>
        ${top.length ? `<div class="barras">${top.map(([sid, n]) => `<div class="barra"><div class="r"><span class="ellip">${esc((N.servico(db, sid) || { nome: '—' }).nome)}</span><b>${n}</b></div><div class="trilho"><i style="width:${(n / maxTop * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>` : '<p class="muted">Sem dados ainda.</p>'}
      </section>
      <section class="card"><div class="card-h"><h3>Clientes sumidas</h3>
        <select class="inp" style="width:auto;min-height:36px;padding:6px 10px" onchange="P.cfgSet('regras.sumidasDias', +this.value)">${[20, 30, 45, 60, 90].map(d => `<option value="${d}" ${d === dias ? 'selected' : ''}>+${d} dias</option>`).join('')}</select></div>
        ${sumidas.length ? `<div class="lista">${sumidas.slice(0, 8).map(({ c, u }) => { const nd = N.diffDias(u.data, hj); const s1 = N.servico(db, u.servicoIds[0]) || { nome: 'atendimento' }; return `<div class="item"><div class="avatar sm">${iniciais(c.nome)}</div><div class="grow" style="cursor:pointer" onclick="location.hash='#/ficha/${c.id}'"><div class="t ellip">${esc(c.nome)}</div><div class="s">há ${nd} dias · ${esc(s1.nome)}</div></div><a class="btn sm sec" target="_blank" rel="noopener" href="${N.waLink(c.whatsapp, `Oi, ${c.nome.split(' ')[0]}! Tudo bem? Já está na hora da sua manutenção de ${s1.nome.toLowerCase()} 💕 Quer que eu reserve um horário pra você?`)}">${ic('whats')} Chamar</a></div>`; }).join('')}</div>` : `<div class="vazio">${ic('heart')}<p>Nenhuma cliente sumida. Que beleza!</p></div>`}
      </section>
    </div>
    ${fila.length ? `<section class="card mb"><div class="card-h"><h3>Lembretes para enviar no WhatsApp</h3><span class="small muted">${fila.length}</span></div>
      <div class="lista">${fila.slice(0, 10).map(w => { const c = N.cliente(db, w.clienteId) || {}; return `<div class="item"><div class="grow"><div class="t">${esc(c.nome)}</div><div class="s ellip">${esc(w.texto)}</div></div><a class="btn sm" target="_blank" rel="noopener" href="${N.waLink(w.fone, w.texto)}" onclick="P.whatsEnviado('${w.id}')">${ic('whats')} Enviar</a></div>`; }).join('')}</div>
      <p class="tiny soft mt-s">No protótipo o envio abre o WhatsApp com a mensagem pronta. Em produção, os lembretes saem automaticamente pela API oficial do WhatsApp Business.</p></section>` : ''}`;
  };
  P.whatsEnviado = id => { const db = D(); const w = db.filaWhats.find(x => x.id === id); if (w) w.enviado = true; N.save(db); setTimeout(rerender, 300); };
  P.cfgSet = (path, v) => { const db = D(); const ks = path.split('.'); let o = db; ks.slice(0, -1).forEach(k => (o = o[k])); o[ks[ks.length - 1]] = v; N.save(db); rerender(); };

  /* ============================ AGENDA ============================ */
  TELAS.agenda = db => {
    const A = S.agenda; const semana = A.modo === 'semana';
    const dias = semana ? Array.from({ length: 7 }, (_, i) => N.addDias(N.inicioSemana(A.data), i)) : [A.data];
    const abertos = Object.values(db.horario).filter(h => h.aberto);
    let h0 = Math.min(...abertos.map(h => N.hm(h.ini)), 480), h1 = Math.max(...abertos.map(h => N.hm(h.fim)), 1080);
    dias.forEach(d => db.agendamentos.filter(a => a.data === d && a.status !== 'cancelado').forEach(a => { h0 = Math.min(h0, N.hm(a.hora)); h1 = Math.max(h1, N.hm(a.hora) + a.duracao); }));
    h0 = Math.floor(h0 / 60) * 60; h1 = Math.ceil(h1 / 60) * 60;
    const PX = semana ? 1 : 1.25; const alt = (h1 - h0) * PX;
    const hj = H(), ag = N.agora();
    const titulo = semana ? (() => { const a = dias[0], b = dias[6]; return `${+a.slice(8)} ${N.MESES[+a.slice(5, 7) - 1].slice(0, 3)} – ${+b.slice(8)} ${N.MESES[+b.slice(5, 7) - 1].slice(0, 3)}`; })() : N.fmtDataLonga(A.data);
    let horas = ''; for (let t = h0; t <= h1; t += 60) horas += `<div style="top:${(t - h0) * PX}px">${N.mh(t)}</div>`;
    const col = d => {
      const h = db.horario[N.diaSemana(d)]; const bl = N.bloqueiosDoDia(db, d); const fechado = !h.aberto || bl.some(b => !b.ini);
      let x = ''; for (let t = h0; t < h1; t += 30) x += `<div class="lh ${t % 60 ? 'meia' : ''}" style="top:${(t - h0) * PX}px"></div>`;
      if (h.aberto) { x += `<div class="g-off" style="top:0;height:${(N.hm(h.ini) - h0) * PX}px"></div><div class="g-off" style="top:${(N.hm(h.fim) - h0) * PX}px;bottom:0"></div>`; if (h.pausaIni) x += `<div class="g-bloq" style="top:${(N.hm(h.pausaIni) - h0) * PX}px;height:${(N.hm(h.pausaFim) - N.hm(h.pausaIni)) * PX}px;cursor:default">${ic('clock')} Pausa</div>`; }
      bl.forEach(b => { const i = b.ini ? N.hm(b.ini) : (h.aberto ? N.hm(h.ini) : h0), f = b.fim ? N.hm(b.fim) : (h.aberto ? N.hm(h.fim) : h1); x += `<div class="g-bloq" style="top:${(i - h0) * PX}px;height:${(f - i) * PX}px" onclick="event.stopPropagation();P.editarBloqueio('${b.id}')">${ic('ban')} ${esc(b.motivo || 'Bloqueado')}</div>`; });
      db.agendamentos.filter(a => a.data === d && a.status !== 'cancelado').forEach(a => {
        const c = N.cliente(db, a.clienteId) || {}; const top = (N.hm(a.hora) - h0) * PX, he = Math.max(a.duracao * PX - 2, 20);
        x += `<div class="g-ev st-${a.status}" data-id="${a.id}" style="top:${top}px;height:${he}px" title="${esc(c.nome)} — ${esc(N.nomesServ(db, a.servicoIds))}"><b>${a.hora} ${esc((c.nome || '').split(' ')[0])}</b>${he > 34 ? `<span>${esc(N.nomesServ(db, a.servicoIds))}</span>` : ''}</div>`;
      });
      if (d === hj && ag.min >= h0 && ag.min <= h1) x += `<div class="g-agora" style="top:${(ag.min - h0) * PX}px"></div>`;
      return `<div class="g-col ${fechado ? 'fechado' : ''}" data-dia="${d}" style="height:${alt}px">${x}</div>`;
    };
    const cab = d => `<div class="g-cab ${d === hj ? 'hoje' : ''}" onclick="P.agIr('${d}','dia')">${N.DIAS_C[N.diaSemana(d)]}<b>${+d.slice(8)}</b></div>`;
    const proxBloq = db.bloqueios.filter(b => b.dataFim >= hj).sort((a, b) => a.dataIni.localeCompare(b.dataIni));
    depois = () => { ativarArraste(PX, h0); };
    return topo('Agenda', semana ? 'Arraste um horário para remarcar. Toque em um espaço vazio para agendar.' : 'Toque e arraste para remarcar.', '') + `
    <div class="ag-toolbar">
      <div class="seg"><button class="${!semana ? 'on' : ''}" onclick="P.agModo('dia')">Dia</button><button class="${semana ? 'on' : ''}" onclick="P.agModo('semana')">Semana</button></div>
      <div class="ag-nav"><button class="btn-ic" onclick="P.agPasso(-1)" aria-label="Anterior">${ic('left')}</button><button class="btn sec sm" onclick="P.agIr('${hj}')">Hoje</button><button class="btn-ic" onclick="P.agPasso(1)" aria-label="Próximo">${ic('right')}</button><span class="titulo">${titulo}</span></div>
      <div class="row wrap"><button class="btn sec sm" onclick="P.bloquear()">${ic('ban')} Bloquear</button><button class="btn sec sm" onclick="P.horarioFunc()">${ic('clock')} Funcionamento</button></div>
    </div>
    <div class="grade-scroll"><div class="grade ${semana ? 'semana' : ''}">
      <div class="g-cab" style="cursor:default"></div>${dias.map(cab).join('')}
      <div class="g-horas" style="height:${alt}px">${horas}</div>${dias.map(col).join('')}
    </div></div>
    <div class="legenda"><span><i style="background:var(--info)"></i>Confirmado</span><span><i style="background:var(--warn)"></i>Pendente</span><span><i style="background:var(--ok)"></i>Concluído</span><span><i style="background:var(--err)"></i>Faltou</span><span><i style="background:var(--line-2)"></i>Bloqueio/pausa</span></div>
    <section class="card mt"><div class="card-h"><h3>Próximos bloqueios</h3><button class="btn ghost sm" onclick="P.bloquear()">${ic('plus')} Adicionar</button></div>
      ${proxBloq.length ? `<div class="lista">${proxBloq.map(b => `<div class="item clic" onclick="P.editarBloqueio('${b.id}')"><div class="avatar sm">${ic(b.tipo === 'ferias' ? 'sun' : b.tipo === 'almoco' ? 'clock' : 'ban')}</div><div class="grow"><div class="t">${esc(b.motivo || TIPOS_BLOQ[b.tipo])}</div><div class="s">${N.fmtData(b.dataIni)}${b.dataFim !== b.dataIni ? ' a ' + N.fmtData(b.dataFim) : ''} · ${b.ini ? b.ini + '–' + b.fim : 'dia inteiro'}</div></div></div>`).join('')}</div>` : '<p class="muted small">Nenhum bloqueio futuro.</p>'}
    </section>`;
  };
  P.agModo = m => { S.agenda.modo = m; render(); };
  P.agIr = (d, m) => { S.agenda.data = d; if (m) S.agenda.modo = m; render(); };
  P.agPasso = n => { S.agenda.data = N.addDias(S.agenda.data, n * (S.agenda.modo === 'semana' ? 7 : 1)); render(); };

  function ativarArraste(PX, h0) {
    const cols = $$('.g-col');
    cols.forEach(c => c.addEventListener('click', e => {
      if (e.target.closest('.g-ev,.g-bloq')) return;
      const r = c.getBoundingClientRect(); const min = Math.floor(((e.clientY - r.top) / PX + h0) / 15) * 15;
      P.menuVazio(c.dataset.dia, N.mh(min));
    }));
    $$('.g-ev').forEach(el => {
      let st = null;
      el.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        const r = el.getBoundingClientRect();
        st = { x: e.clientX, y: e.clientY, dy: e.clientY - r.top, arr: false, pronto: e.pointerType !== 'touch', t: null };
        if (!st.pronto) st.t = setTimeout(() => { if (st) { st.pronto = true; navigator.vibrate && navigator.vibrate(15); el.classList.add('arrastando'); } }, 280);
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', e => {
        if (!st) return;
        const dist = Math.hypot(e.clientX - st.x, e.clientY - st.y);
        if (!st.arr && dist > 6 && st.pronto) { st.arr = true; el.classList.add('arrastando'); }
        if (!st.arr) return;
        e.preventDefault();
        const col = cols.find(c => { const r = c.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right; }) || el.parentElement;
        const r = col.getBoundingClientRect();
        const min = Math.round(((e.clientY - st.dy - r.top) / PX + h0) / 15) * 15;
        const db = D(); const a = db.agendamentos.find(x => x.id === el.dataset.id); const h = db.horario[N.diaSemana(col.dataset.dia)];
        const ruim = !h.aberto || min < N.hm(h.ini) || min + a.duracao > N.hm(h.fim) || N.conflito(db, col.dataset.dia, N.mh(min), a.duracao, a.id);
        let g = $('.g-fantasma'); if (!g) { g = document.createElement('div'); g.className = 'g-fantasma'; }
        if (g.parentElement !== col) col.appendChild(g);
        g.style.top = (min - h0) * PX + 'px'; g.style.height = a.duracao * PX + 'px'; g.textContent = N.mh(min) + (ruim ? ' · indisponível' : ''); g.classList.toggle('ruim', ruim);
        st.alvo = { data: col.dataset.dia, hora: N.mh(min), ruim };
      });
      const fim = async e => {
        if (!st) return; clearTimeout(st.t); const s = st; st = null; el.classList.remove('arrastando');
        const g = $('.g-fantasma'); if (g) g.remove();
        if (!s.arr) { if (Math.hypot(e.clientX - s.x, e.clientY - s.y) < 8) P.abrirAg(el.dataset.id); return; }
        if (!s.alvo || s.alvo.ruim) { toast('Horário indisponível.', 'erro'); return; }
        const db = D(); const a = db.agendamentos.find(x => x.id === el.dataset.id);
        if (s.alvo.data === a.data && s.alvo.hora === a.hora) return;
        const c = N.cliente(db, a.clienteId) || {};
        if (!await confirmar(`Remarcar ${c.nome} para ${N.fmtData(s.alvo.data)} às ${s.alvo.hora}?`, { titulo: 'Remarcar', sim: 'Remarcar' })) return;
        try { const ag = await N.reservar({ data: s.alvo.data, hora: s.alvo.hora, servicoIds: a.servicoIds, duracao: a.duracao }, { ignorarId: a.id, origem: 'painel' }); const d2 = D(); N.notificar(d2, ag.clienteId, 'Horário remarcado', `Seu horário foi para ${N.fmtData(ag.data)} às ${ag.hora}.`); N.save(d2); toast('Horário remarcado.'); rerender(); }
        catch (err) { toast(err.message, 'erro'); }
      };
      el.addEventListener('pointerup', fim);
      el.addEventListener('pointercancel', () => { if (st) clearTimeout(st.t); st = null; el.classList.remove('arrastando'); const g = $('.g-fantasma'); if (g) g.remove(); });
    });
  }
  P.menuVazio = (d, h) => {
    modal(`<p class="muted mb">${N.fmtDataLonga(d)} · ${h}</p>
      <div class="col"><a class="btn bloco" href="#/novo?data=${d}&hora=${h}" data-fechar>${ic('plus')} Novo atendimento às ${h}</a>
      <button class="btn sec bloco" onclick="UI.fecharModais();setTimeout(()=>P.bloquear('${d}','${h}'),200)">${ic('ban')} Bloquear este horário</button></div>`, { titulo: 'Horário livre' });
  };

  const TIPOS_BLOQ = { almoco: 'Almoço', folga: 'Folga', ferias: 'Férias', outro: 'Outro' };
  P.bloquear = (d, h) => abrirBloqueio({ tipo: h ? 'outro' : 'folga', dataIni: d || S.agenda.data, dataFim: d || S.agenda.data, ini: h || null, fim: h ? N.mh(Math.min(N.hm(h) + 60, 1439)) : null, motivo: '' });
  P.editarBloqueio = id => abrirBloqueio(Object.assign({}, D().bloqueios.find(b => b.id === id)));
  function abrirBloqueio(b) {
    const novo = !b.id;
    const m = modal(`
      <div class="chips mb" id="bq-t">${Object.entries(TIPOS_BLOQ).map(([k, l]) => `<button class="chip ${b.tipo === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div>
      <div class="grid g2"><label class="f"><span>De</span><input class="inp" type="date" id="bq-di" value="${b.dataIni}"></label><label class="f"><span>Até</span><input class="inp" type="date" id="bq-df" value="${b.dataFim}"></label></div>
      <div class="linha-cfg"><span>Dia inteiro</span><label class="switch"><input type="checkbox" id="bq-dia" ${b.ini ? '' : 'checked'}><i></i></label></div>
      <div class="grid g2 ${b.ini ? '' : 'hide'}" id="bq-hs"><label class="f"><span>Início</span><input class="inp" type="time" step="900" id="bq-i" value="${b.ini || '12:00'}"></label><label class="f"><span>Fim</span><input class="inp" type="time" step="900" id="bq-f" value="${b.fim || '13:00'}"></label></div>
      <label class="f mt"><span>Motivo (só você vê)</span><input class="inp" id="bq-m" value="${esc(b.motivo)}" placeholder="Ex.: almoço, curso, consulta"></label>
      <p class="tiny soft mt-s">Para um intervalo fixo todos os dias (como almoço), use a pausa em “Funcionamento”.</p>
      <div class="acoes">${novo ? '' : `<button class="btn sec" id="bq-del">${ic('trash')} Remover</button>`}<button class="btn" id="bq-ok">Salvar bloqueio</button></div>`, { titulo: novo ? 'Bloquear horário' : 'Editar bloqueio' });
    $$('#bq-t .chip', m).forEach(c => c.onclick = () => { b.tipo = c.dataset.t; $$('#bq-t .chip', m).forEach(x => x.classList.toggle('on', x === c)); if (b.tipo === 'almoco') { $('#bq-dia', m).checked = false; $('#bq-hs', m).classList.remove('hide'); } });
    $('#bq-dia', m).onchange = e => $('#bq-hs', m).classList.toggle('hide', e.target.checked);
    $('#bq-di', m).onchange = e => { if ($('#bq-df', m).value < e.target.value) $('#bq-df', m).value = e.target.value; };
    if (!novo) $('#bq-del', m).onclick = () => { const db = D(); db.bloqueios = db.bloqueios.filter(x => x.id !== b.id); N.save(db); toast('Bloqueio removido.'); fecharERender(); };
    $('#bq-ok', m).onclick = async () => {
      const r = { id: b.id || N.uid('b'), tipo: b.tipo, dataIni: $('#bq-di', m).value, dataFim: $('#bq-df', m).value, ini: $('#bq-dia', m).checked ? null : $('#bq-i', m).value, fim: $('#bq-dia', m).checked ? null : $('#bq-f', m).value, motivo: $('#bq-m', m).value.trim() || TIPOS_BLOQ[b.tipo] };
      if (!r.dataIni || !r.dataFim || r.dataFim < r.dataIni) return toast('Confira as datas.', 'erro');
      if (r.ini && N.hm(r.fim) <= N.hm(r.ini)) return toast('O fim precisa ser depois do início.', 'erro');
      await N.comTrava(db => {
        const afet = db.agendamentos.filter(a => ['pendente', 'confirmado'].includes(a.status) && a.data >= r.dataIni && a.data <= r.dataFim && (!r.ini || (N.hm(a.hora) < N.hm(r.fim) && N.hm(a.hora) + a.duracao > N.hm(r.ini))));
        db.bloqueios = db.bloqueios.filter(x => x.id !== r.id).concat(r); N.save(db);
        if (afet.length) toast(`Atenção: ${afet.length} atendimento(s) neste período. Remarque-os na agenda.`, 'erro'); else toast('Horário bloqueado.');
      });
      fecharERender();
    };
  }
  P.horarioFunc = () => {
    const db = D();
    const m = modal(`<p class="small muted mb">Defina os dias e horários de atendimento. A pausa bloqueia o intervalo todos os dias (ex.: almoço).</p>
      ${[1, 2, 3, 4, 5, 6, 0].map(d => { const h = db.horario[d]; return `<div class="card flat mb-s" style="padding:12px 14px" data-d="${d}">
        <div class="row sp"><b>${N.DIAS[d]}</b><label class="switch"><input type="checkbox" class="hf-a" ${h.aberto ? 'checked' : ''}><i></i></label></div>
        <div class="hf-c ${h.aberto ? '' : 'hide'}"><div class="grid mt-s" style="grid-template-columns:1fr 1fr;gap:8px"><label class="f"><span>Abre</span><input class="inp hf-i" type="time" step="900" value="${h.ini}"></label><label class="f"><span>Fecha</span><input class="inp hf-f" type="time" step="900" value="${h.fim}"></label>
        <label class="f"><span>Pausa de</span><input class="inp hf-pi" type="time" step="900" value="${h.pausaIni}"></label><label class="f"><span>até</span><input class="inp hf-pf" type="time" step="900" value="${h.pausaFim}"></label></div></div></div>`; }).join('')}
      <div class="acoes"><button class="btn" id="hf-ok">Salvar horários</button></div>`, { titulo: 'Horário de funcionamento' });
    $$('.hf-a', m).forEach(x => x.onchange = () => x.closest('[data-d]').querySelector('.hf-c').classList.toggle('hide', !x.checked));
    $('#hf-ok', m).onclick = () => {
      const db2 = D(); let erro = '';
      $$('[data-d]', m).forEach(el => {
        const d = el.dataset.d; const v = s => el.querySelector(s).value;
        const h = { aberto: el.querySelector('.hf-a').checked, ini: v('.hf-i') || '09:00', fim: v('.hf-f') || '18:00', pausaIni: v('.hf-pi'), pausaFim: v('.hf-pf') };
        if (h.aberto && N.hm(h.fim) <= N.hm(h.ini)) erro = `Confira o horário de ${N.DIAS[d]}.`;
        if (!h.pausaIni || !h.pausaFim || N.hm(h.pausaFim) <= N.hm(h.pausaIni)) { h.pausaIni = ''; h.pausaFim = ''; }
        db2.horario[d] = h;
      });
      if (erro) return toast(erro, 'erro');
      N.save(db2); toast('Horário de funcionamento salvo.'); fecharERender();
    };
  };

  /* ============================ NOVO ATENDIMENTO ============================ */
  TELAS.novo = db => {
    const q = qs();
    if (!S.novo || q.get('data') || q.get('cliente')) {
      S.novo = { passo: q.get('cliente') ? 2 : 1, clienteId: q.get('cliente') || null, q: '', servicoIds: [], data: q.get('data') || H(), mes: (q.get('data') || H()).slice(0, 7), hora: q.get('hora') || null, horaFixa: q.get('hora') || null, encaixe: false, pagamento: '', obs: '' };
      if (q.toString()) history.replaceState(null, '', '#/novo');
    }
    const n = S.novo; const soma = N.somaServ(db, n.servicoIds);
    const c = n.clienteId ? N.cliente(db, n.clienteId) : null;
    const passos = `<div class="passos">${[1, 2, 3, 4].map(i => `<div class="${i <= n.passo ? 'on' : ''}"></div>`).join('')}</div>`;
    let corpo = '';
    if (n.passo === 1) {
      depois = () => { const i = $('#nv-q'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } filtrarNovoCli(); };
      corpo = `<h2 class="mb">Para quem?</h2>
        <div class="inp-ic mb">${ic('search')}<input class="inp" id="nv-q" placeholder="Buscar por nome ou WhatsApp" value="${esc(n.q)}" oninput="P.novoBusca(this.value)"></div>
        <div class="card" style="padding:6px 10px"><div class="lista" id="nv-lista"></div></div>
        <div class="card mt"><h4 class="mb-s">Cadastro rápido</h4><form class="grid g2" onsubmit="event.preventDefault();P.novoCad()">
          <label class="f"><span>Nome</span><input class="inp" id="nc-n" required placeholder="Nome e sobrenome"></label>
          <label class="f"><span>WhatsApp</span><input class="inp" id="nc-w" inputmode="tel" required placeholder="(11) 90000-0000"></label>
          <button class="btn sec">${ic('plus')} Cadastrar e continuar</button></form>
          <p class="tiny soft mt-s">A cliente poderá aceitar os termos e completar o cadastro pelo app.</p></div>`;
    } else if (n.passo === 2) {
      corpo = `<h2 class="mb">Quais serviços?</h2><p class="muted small mb">${esc(c.nome)} · escolha um ou mais</p>
        <div class="col">${db.servicos.map(s => `<div class="serv-op ${n.servicoIds.includes(s.id) ? 'on' : ''}" onclick="P.novoServ('${s.id}')"><span class="marca-chk">${ic('check')}</span><span class="ico">${ic(s.icone || 'spark')}</span><div class="grow"><b>${esc(s.nome)}</b><div class="small muted">${N.fmtDur(s.duracao)}${s.visivel ? '' : ' · oculto no app'}</div></div><b>${N.fmtMoeda(s.preco)}</b></div>`).join('')}</div>`;
    } else if (n.passo === 3) {
      const livres = N.horariosLivres(db, n.data, soma.duracao, { permitirPassado: true });
      if (n.horaFixa && !n.hora) n.hora = n.horaFixa;
      corpo = `<h2 class="mb">Quando?</h2><p class="muted small mb">${esc(N.nomesServ(db, n.servicoIds))} · ${N.fmtDur(soma.duracao)}</p>
        <div class="grid g2"><div class="card">${UI.calendario({ mes: n.mes, sel: n.data, onDia: 'P.novoDia', onMes: 'P.novoMes', marca: d => db.agendamentos.some(a => a.data === d && ['pendente', 'confirmado'].includes(a.status)) })}</div>
        <div class="card"><h4 class="mb-s">${N.fmtDataLonga(n.data)}</h4>
          ${n.encaixe ? `<label class="f"><span>Horário do encaixe</span><input class="inp" type="time" step="300" value="${n.hora || ''}" onchange="P.novoHora(this.value,true)"></label><p class="tiny soft mt-s">Encaixe ignora o horário de funcionamento, mas nunca sobrepõe outra cliente.</p>`
            : livres.length ? UI.gradeSlots(livres, n.hora, 'P.novoHora') : `<p class="muted small">${N.diaFechado(db, n.data) ? 'Studio fechado ou dia bloqueado.' : 'Sem horários livres para essa duração.'}</p>`}
          <div class="linha-cfg mt"><span class="small">Encaixe (horário livre manual)</span><label class="switch"><input type="checkbox" ${n.encaixe ? 'checked' : ''} onchange="P.novoEncaixe(this.checked)"><i></i></label></div>
        </div></div>`;
    } else {
      const passado = n.hora && N.abs(n.data, n.hora) < N.absAgora();
      corpo = `<h2 class="mb">Pagamento</h2>
        <div class="card mb"><div class="row"><div class="avatar">${iniciais(c.nome)}</div><div class="grow"><b>${esc(c.nome)}</b><div class="small muted">${esc(N.nomesServ(db, n.servicoIds))}</div><div class="small muted">${N.fmtDataLonga(n.data)} · ${n.hora} – ${N.mh(N.hm(n.hora) + soma.duracao)}</div></div></div></div>
        <span class="small muted">Forma de pagamento ${passado ? '(atendimento já realizado)' : '(opcional — pode registrar ao concluir)'}</span>
        <div class="chips mt-s mb">${['pix', 'dinheiro', 'debito', 'credito'].map(p => `<button class="chip ${n.pagamento === p ? 'on' : ''}" onclick="P.novoPag('${p}')">${N.PAGAMENTOS[p]}</button>`).join('')}${passado ? '' : `<button class="chip ${!n.pagamento ? 'on' : ''}" onclick="P.novoPag('')">Na hora</button>`}</div>
        <label class="f"><span>Observação (opcional)</span><textarea class="inp" id="nv-obs" oninput="S_obs(this.value)" placeholder="Ex.: trazer foto de referência">${esc(n.obs)}</textarea></label>
        ${passado ? '<p class="small mt-s" style="color:var(--warn)">Data no passado: será salvo como <b>concluído</b>.</p>' : ''}`;
    }
    const podeAvancar = n.passo === 1 ? !!n.clienteId : n.passo === 2 ? n.servicoIds.length > 0 : n.passo === 3 ? !!n.hora : true;
    return topo('Novo atendimento', ['Cliente', 'Serviços', 'Data e hora', 'Pagamento'][n.passo - 1] + ` · passo ${n.passo} de 4`) + passos + corpo + `
      <div class="resumo-fixo"><div class="grow"><div class="small" style="opacity:.75">${c ? esc(c.nome.split(' ')[0]) : 'Selecione a cliente'}${n.servicoIds.length ? ' · ' + N.fmtDur(soma.duracao) : ''}${n.hora && n.passo >= 3 ? ' · ' + N.fmtData(n.data) + ' ' + n.hora : ''}</div><b>${N.fmtMoeda(soma.preco)}</b></div>
      ${n.passo > 1 ? `<button class="btn-ic" style="color:inherit" onclick="P.novoPasso(-1)" aria-label="Voltar">${ic('left')}</button>` : ''}
      ${n.passo < 4 ? `<button class="btn" ${podeAvancar ? '' : 'disabled'} onclick="P.novoPasso(1)">Continuar</button>` : `<button class="btn" onclick="P.novoSalvar()">${ic('check')} Salvar</button>`}</div>`;
  };
  window.S_obs = v => { S.novo.obs = v; };
  function filtrarNovoCli() {
    const db = D(); const q = S.novo.q.trim().toLowerCase(); const qd = N.soDigitos(q);
    let l = db.clientes.filter(c => !c.anonimizada && (!q || c.nome.toLowerCase().includes(q) || (qd && c.whatsapp.includes(qd))));
    l = l.sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, 8);
    const el = $('#nv-lista'); if (!el) return;
    el.innerHTML = l.length ? l.map(c => { const u = N.ultimaVisita(db, c.id); return `<div class="item clic ${S.novo.clienteId === c.id ? 'sel' : ''}" onclick="P.novoCli('${c.id}')"><div class="avatar sm">${iniciais(c.nome)}</div><div class="grow"><div class="t">${esc(c.nome)}</div><div class="s">${N.fmtFone(c.whatsapp)}${u ? ' · última visita ' + N.fmtData(u.data) : ''}</div></div>${S.novo.clienteId === c.id ? ic('check') : ic('right')}</div>`; }).join('') : '<p class="muted small" style="padding:12px">Nenhuma cliente encontrada. Use o cadastro rápido abaixo.</p>';
  }
  P.novoBusca = v => { S.novo.q = v; filtrarNovoCli(); };
  P.novoCli = id => { S.novo.clienteId = id; S.novo.passo = 2; render(); };
  P.novoCad = () => {
    const nome = $('#nc-n').value.trim(), w = N.soDigitos($('#nc-w').value);
    if (nome.length < 3 || w.length < 10) return toast('Informe nome e WhatsApp com DDD.', 'erro');
    const db = D(); if (db.clientes.some(c => c.whatsapp === w && !c.anonimizada)) return toast('Já existe cliente com esse WhatsApp.', 'erro');
    const c = { id: N.uid('c'), nome, whatsapp: w, email: '', senhaHash: '', criadoEm: N.isoAgora(), consent: {}, anamnese: {}, fotos: [], anonimizada: false, origem: 'painel' };
    db.clientes.push(c); N.save(db); toast('Cliente cadastrada.'); P.novoCli(c.id);
  };
  P.novoServ = id => { const l = S.novo.servicoIds; const i = l.indexOf(id); i >= 0 ? l.splice(i, 1) : l.push(id); S.novo.hora = S.novo.horaFixa; rerender(); };
  P.novoDia = d => { S.novo.data = d; S.novo.hora = null; S.novo.horaFixa = null; rerender(); };
  P.novoMes = m => { S.novo.mes = m; rerender(); };
  P.novoHora = (h, manual) => { S.novo.hora = h || null; if (!manual) rerender(); else rerender(); };
  P.novoEncaixe = v => { S.novo.encaixe = v; S.novo.hora = null; rerender(); };
  P.novoPag = p => { S.novo.pagamento = p; rerender(); };
  P.novoPasso = d => { S.novo.passo = Math.min(4, Math.max(1, S.novo.passo + d)); render(); };
  P.novoSalvar = async () => {
    const n = S.novo; const passado = N.abs(n.data, n.hora) < N.absAgora();
    if (passado && !n.pagamento) return toast('Informe a forma de pagamento do atendimento realizado.', 'erro');
    try {
      const ag = await N.reservar({ clienteId: n.clienteId, servicoIds: n.servicoIds.slice(), data: n.data, hora: n.hora, status: passado ? 'concluido' : 'confirmado', pagamento: n.pagamento, obs: n.obs.trim() }, { origem: 'painel', encaixe: n.encaixe });
      if (!passado) { const db = D(); N.notificar(db, ag.clienteId, 'Horário agendado', `${N.nomesServ(db, ag.servicoIds)} em ${N.fmtData(ag.data)} às ${ag.hora}.`); N.save(db); }
      toast('Atendimento salvo!'); S.novo = null; S.agenda.data = ag.data; S.agenda.modo = innerWidth < 760 ? 'dia' : S.agenda.modo; location.hash = '#/agenda';
    } catch (e) { toast(e.message, 'erro'); S.novo.passo = 3; S.novo.hora = null; S.novo.horaFixa = null; render(); }
  };

  /* ============================ ATENDIMENTOS ============================ */
  TELAS.atendimentos = db => {
    const f = S.atend;
    depois = filtrarAtend;
    return topo('Atendimentos', 'Histórico com filtros', `<a class="btn sm" href="#/novo">${ic('plus')}<span class="sr">Novo</span></a>`) + `
    <div class="card mb"><div class="grid g3">
      <label class="f"><span>De</span><input class="inp" type="date" value="${f.de}" onchange="P.fAt('de',this.value)"></label>
      <label class="f"><span>Até</span><input class="inp" type="date" value="${f.ate}" onchange="P.fAt('ate',this.value)"></label>
      <label class="f"><span>Serviço</span><select class="inp" onchange="P.fAt('serv',this.value)"><option value="">Todos</option>${db.servicos.map(s => `<option value="${s.id}" ${f.serv === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`).join('')}</select></label>
    </div>
    <div class="inp-ic mt">${ic('search')}<input class="inp" placeholder="Buscar cliente" value="${esc(f.q)}" oninput="P.fAt('q',this.value,true)"></div>
    <div class="chips mt" id="at-st">${['todos', 'pendente', 'confirmado', 'concluido', 'cancelado', 'faltou'].map(s => `<button class="chip ${f.status === s ? 'on' : ''}" onclick="P.fAt('status','${s}')">${s === 'todos' ? 'Todos' : N.STATUS[s]}</button>`).join('')}</div></div>
    <div class="card"><div id="at-lista"></div></div>`;
  };
  P.fAt = (k, v, parcial) => { S.atend[k] = v; if (parcial) filtrarAtend(); else rerender(); };
  function filtrarAtend() {
    const db = D(), f = S.atend, q = f.q.trim().toLowerCase();
    const l = db.agendamentos.filter(a => a.data >= f.de && a.data <= f.ate && (f.status === 'todos' || a.status === f.status) && (!f.serv || a.servicoIds.includes(f.serv)) && (!q || ((N.cliente(db, a.clienteId) || {}).nome || '').toLowerCase().includes(q))).slice().reverse();
    const tot = l.filter(a => a.status === 'concluido').reduce((s, a) => s + a.preco, 0);
    const el = $('#at-lista'); if (!el) return;
    el.innerHTML = `<div class="row sp mb-s"><span class="small muted">${l.length} resultado(s)</span><span class="small">Concluídos: <b>${N.fmtMoeda(tot)}</b></span></div>` + (l.length ? `<div class="tabela-w"><table class="t resp"><thead><tr><th>Data</th><th>Cliente</th><th>Serviços</th><th>Status</th><th class="n">Valor</th></tr></thead><tbody>${l.slice(0, 200).map(a => `<tr style="cursor:pointer" onclick="P.abrirAg('${a.id}')"><td data-l="Data">${N.fmtData(a.data)} ${a.hora}</td><td data-l="Cliente">${esc((N.cliente(db, a.clienteId) || {}).nome)}</td><td data-l="Serviços">${esc(N.nomesServ(db, a.servicoIds))}</td><td data-l="Status">${badge(a.status)}</td><td class="n" data-l="Valor">${N.fmtMoeda(a.preco)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="vazio">${ic('filter')}<p>Nada encontrado com esses filtros.</p></div>`);
  }

  /* ============================ CLIENTES ============================ */
  TELAS.clientes = db => {
    depois = filtrarClientes;
    return topo('Clientes', `${db.clientes.filter(c => !c.anonimizada).length} cadastradas`, `<button class="btn sm" onclick="P.editarCliente()">${ic('plus')} Nova</button>`) + `
    <div class="row mb"><div class="inp-ic grow">${ic('search')}<input class="inp" placeholder="Buscar por nome, WhatsApp ou e-mail" value="${esc(S.cli.q)}" oninput="S_cliq(this.value)"></div>
    <select class="inp" style="width:auto" onchange="S_cliOrd(this.value)"><option value="nome" ${S.cli.ord === 'nome' ? 'selected' : ''}>A–Z</option><option value="ultima" ${S.cli.ord === 'ultima' ? 'selected' : ''}>Última visita</option><option value="gasto" ${S.cli.ord === 'gasto' ? 'selected' : ''}>Mais gasto</option></select></div>
    <div class="card" style="padding:6px 12px"><div class="lista" id="cl-lista"></div></div>`;
  };
  window.S_cliq = v => { S.cli.q = v; filtrarClientes(); };
  window.S_cliOrd = v => { S.cli.ord = v; filtrarClientes(); };
  function filtrarClientes() {
    const db = D(); const q = S.cli.q.trim().toLowerCase(), qd = N.soDigitos(q);
    let l = db.clientes.filter(c => !c.anonimizada && (!q || c.nome.toLowerCase().includes(q) || (c.email || '').includes(q) || (qd && c.whatsapp.includes(qd)))).map(c => ({ c, u: N.ultimaVisita(db, c.id), g: N.totalGasto(db, c.id) }));
    l.sort((a, b) => S.cli.ord === 'gasto' ? b.g - a.g : S.cli.ord === 'ultima' ? ((b.u || {}).data || '').localeCompare((a.u || {}).data || '') : a.c.nome.localeCompare(b.c.nome));
    const el = $('#cl-lista'); if (!el) return;
    el.innerHTML = l.length ? l.map(({ c, u, g }) => `<a class="item clic" style="text-decoration:none;color:inherit" href="#/ficha/${c.id}"><div class="avatar">${iniciais(c.nome)}</div><div class="grow"><div class="t ellip">${esc(c.nome)}</div><div class="s ellip">${N.fmtFone(c.whatsapp)} · ${u ? 'última visita ' + N.fmtData(u.data) : 'sem visitas'}</div></div><div style="text-align:right"><b class="small">${N.fmtMoeda(g)}</b><div class="tiny soft">total</div></div></a>`).join('') : `<div class="vazio">${ic('users')}<p>Nenhuma cliente encontrada.</p></div>`;
  }

  TELAS.ficha = (db, id) => {
    const c = N.cliente(db, id); if (!c || c.anonimizada) return topo('Cliente', '') + `<div class="vazio">${ic('user')}<p>Cliente não encontrada ou dados removidos.</p><a class="btn sm mt" href="#/clientes">Voltar</a></div>`;
    const ags = db.agendamentos.filter(a => a.clienteId === id).slice().reverse();
    const u = N.ultimaVisita(db, id), prox = N.proximoHorario(db, id), man = N.manutencao(db, id);
    const visitas = ags.filter(a => a.status === 'concluido').length; const faltas = ags.filter(a => a.status === 'faltou').length;
    const aba = S.ficha.aba; const A = c.anamnese || {};
    const avs = db.avaliacoes.filter(v => v.clienteId === id);
    let corpo = '';
    if (aba === 'historico') corpo = ags.length ? `<div class="lista">${ags.map(a => `<div class="item clic" onclick="P.abrirAg('${a.id}')"><div class="grow"><div class="t">${esc(N.nomesServ(db, a.servicoIds))}</div><div class="s">${N.fmtData(a.data)} · ${a.hora}${a.pagamento ? ' · ' + N.PAGAMENTOS[a.pagamento] : ''}</div></div><div style="text-align:right">${badge(a.status)}<div class="small mt-s">${N.fmtMoeda(a.preco)}</div></div></div>`).join('')}</div>` : `<div class="vazio">${ic('cal')}<p>Sem atendimentos.</p></div>`;
    if (aba === 'anamnese') corpo = `<div class="card flat sensivel mb" style="padding:12px 14px"><span class="tag-sens">${ic('lock')} Dado sensível (saúde) — visível somente para você</span></div>
      <form class="grid g2" onsubmit="event.preventDefault();P.salvarAnamnese('${id}')">
        ${[['alergias', 'Alergias'], ['sensibilidade', 'Sensibilidade / tipo de pele'], ['medicamentos', 'Medicamentos, gestação, procedimentos recentes'], ['formato', 'Formato preferido'], ['tecnica', 'Técnica / produtos usados (cor da henna, pigmento…)']].map(([k, l]) => `<label class="f"><span>${l}</span><input class="inp" name="${k}" value="${esc(A[k] || '')}"></label>`).join('')}
        <label class="f" style="grid-column:1/-1"><span>Observações</span><textarea class="inp" name="obs">${esc(A.obs || '')}</textarea></label>
        <div><button class="btn">${ic('check')} Salvar ficha</button></div></form>
        ${A.atualizadaEm ? `<p class="tiny soft mt-s">Atualizada em ${N.fmtDataHora(A.atualizadaEm)}</p>` : ''}`;
    if (aba === 'fotos') corpo = c.consent && c.consent.fotos ? `<p class="small muted mb">Consentimento para fotos dado em ${N.fmtDataHora(c.consent.fotosEm)}.</p>
      <div class="row wrap mb"><label class="btn sec sm">${ic('camera')} Foto “antes”<input type="file" accept="image/*" capture="environment" class="hide" onchange="P.addFoto('${id}','antes',this)"></label><label class="btn sec sm">${ic('camera')} Foto “depois”<input type="file" accept="image/*" capture="environment" class="hide" onchange="P.addFoto('${id}','depois',this)"></label></div>
      ${c.fotos.length ? `<div class="fotos">${c.fotos.map(f => `<figure><img src="${f.url}" alt="Foto ${f.tipo}"><figcaption>${f.tipo} · ${N.fmtData(f.data)}</figcaption><button class="btn-ic del" onclick="P.delFoto('${id}','${f.id}')" aria-label="Apagar">${ic('trash')}</button></figure>`).join('')}</div>` : `<div class="vazio">${ic('camera')}<p>Nenhuma foto ainda.</p></div>`}`
      : `<div class="vazio">${ic('lock')}<p>Esta cliente <b>não deu consentimento</b> para fotos de antes/depois.</p><p class="small mt-s">Ela pode autorizar em “Meus dados” no app. Não registre fotos sem o aceite.</p></div>`;
    if (aba === 'consent') {
      const ac = db.lgpd.aceites.filter(a => a.clienteId === id);
      const k = c.consent || {};
      corpo = `<div class="lista">
        <div class="item"><div class="grow"><div class="t">Termos de Uso</div><div class="s">${k.termosVersao ? 'v' + k.termosVersao + (k.termosVersao !== db.termos.versao ? ' — <b style="color:var(--warn)">desatualizado</b>' : '') : 'Não aceito (cadastrada pelo painel)'}</div></div></div>
        <div class="item"><div class="grow"><div class="t">Política de Privacidade</div><div class="s">${k.privVersao ? 'v' + k.privVersao : 'Não aceita'}</div></div></div>
        <div class="item"><div class="grow"><div class="t">Fotos antes/depois</div><div class="s">${k.fotos ? 'Autorizado em ' + N.fmtDataHora(k.fotosEm) : 'Não autorizado'}</div></div></div>
        <div class="item"><div class="grow"><div class="t">Mensagens de marketing</div><div class="s">${k.marketing ? 'Autorizado em ' + N.fmtDataHora(k.marketingEm) : 'Não autorizado'}</div></div></div></div>
        <h4 class="mt mb-s">Registro de aceites</h4>${ac.length ? ac.map(a => `<div class="small muted">${N.fmtDataHora(a.em)} — ${esc(a.doc)} ${a.versao !== '—' ? 'v' + a.versao : ''}${a.revogado ? ' (revogado)' : ''}</div>`).join('') : '<p class="small muted">Nenhum.</p>'}
        <div class="row wrap mt"><button class="btn sec sm" onclick="P.baixarDados('${id}')">${ic('down')} Exportar dados (LGPD)</button><button class="btn sm perigo" onclick="P.excluirCliente('${id}')">${ic('trash')} Excluir dados pessoais</button></div>`;
    }
    return topo(`<a href="#/clientes" class="btn-ic" style="margin-left:-10px" aria-label="Voltar">${ic('left')}</a>`, '') + `
    <div class="card mb"><div class="ficha-top"><div class="avatar">${iniciais(c.nome)}</div><div class="grow"><h2>${esc(c.nome)}</h2><div class="small muted">${N.fmtFone(c.whatsapp)}${c.email ? ' · ' + esc(c.email) : ''}</div>
      ${avs.length ? `<div class="mt-s">${estrelas(avs.reduce((s, v) => s + v.nota, 0) / avs.length)}</div>` : ''}</div><button class="btn-ic" onclick="P.editarCliente('${id}')" aria-label="Editar">${ic('edit')}</button></div>
      <div class="row wrap mt"><a class="btn sm" href="#/novo?cliente=${id}">${ic('plus')} Agendar</a>${c.whatsapp ? `<a class="btn sm sec" target="_blank" rel="noopener" href="${N.waLink(c.whatsapp, 'Oi, ' + c.nome.split(' ')[0] + '! ')}">${ic('whats')} WhatsApp</a>` : ''}</div></div>
    <div class="grid g4 mb">
      <div class="card kpi"><div class="l">Total gasto</div><div class="v">${N.fmtMoeda(N.totalGasto(db, id))}</div></div>
      <div class="card kpi"><div class="l">Visitas</div><div class="v">${visitas}</div><div class="d">${faltas ? faltas + ' falta(s)' : 'sem faltas'}</div></div>
      <div class="card kpi"><div class="l">Última visita</div><div class="v" style="font-size:19px">${u ? N.fmtData(u.data) : '—'}</div><div class="d">${u ? 'há ' + N.diffDias(u.data, H()) + ' dias' : ''}</div></div>
      <div class="card kpi"><div class="l">Próximo horário</div><div class="v" style="font-size:19px">${prox ? N.fmtData(prox.data) : '—'}</div><div class="d">${prox ? prox.hora : ''}</div></div>
    </div>
    ${man && man.naHora && !prox ? `<div class="lembrete-ret mb">${ic('spark')}<div class="grow"><b>Hora da manutenção</b><div class="small muted">${esc(man.servico.nome)} há ${man.dias} dias (retorno sugerido: ${man.servico.retornoMin}–${man.servico.retornoMax} dias)</div></div></div>` : ''}
    <div class="seg mb seg-scroll">${[['historico', 'Histórico'], ['anamnese', 'Anamnese'], ['fotos', 'Fotos'], ['consent', 'Privacidade']].map(([k, l]) => `<button class="${aba === k ? 'on' : ''}" onclick="P.fichaAba('${k}')">${l}</button>`).join('')}</div>
    <div class="card">${corpo}</div>`;
  };
  P.fichaAba = a => { S.ficha.aba = a; rerender(); };
  P.salvarAnamnese = id => { const db = D(); const c = N.cliente(db, id); const f = new FormData(document.querySelector('#main form')); c.anamnese = Object.fromEntries(f.entries()); c.anamnese.atualizadaEm = N.isoAgora(); N.save(db); toast('Ficha salva.'); };
  P.addFoto = async (id, tipo, inp) => {
    const f = inp.files[0]; if (!f) return;
    try { const url = await UI.arquivoParaDataURL(f, 800); const db = D(); const c = N.cliente(db, id); c.fotos.unshift({ id: N.uid('f'), tipo, data: H(), url, legenda: '' }); N.save(db); toast('Foto adicionada.'); rerender(); }
    catch (e) { toast('Não foi possível ler a imagem.', 'erro'); }
  };
  P.delFoto = async (id, fid) => { if (!await confirmar('Apagar esta foto?', { perigo: true, sim: 'Apagar' })) return; const db = D(); const c = N.cliente(db, id); c.fotos = c.fotos.filter(f => f.id !== fid); N.save(db); rerender(); };
  P.editarCliente = id => {
    const db = D(); const c = id ? N.cliente(db, id) : { nome: '', whatsapp: '', email: '', nascimento: '' };
    const m = modal(`<form class="col" id="ec-f"><label class="f"><span>Nome</span><input class="inp" name="nome" required value="${esc(c.nome)}" autofocus></label>
      <label class="f"><span>WhatsApp</span><input class="inp" name="whatsapp" inputmode="tel" required value="${N.fmtFone(c.whatsapp)}"></label>
      <label class="f"><span>E-mail</span><input class="inp" name="email" type="email" value="${esc(c.email)}"></label>
      <label class="f"><span>Data de nascimento</span><input class="inp" name="nascimento" type="date" value="${c.nascimento || ''}"></label>
      <div class="acoes"><button class="btn">Salvar</button></div></form>`, { titulo: id ? 'Editar cliente' : 'Nova cliente' });
    UI.mascaraFone($('[name=whatsapp]', m));
    $('#ec-f', m).onsubmit = e => {
      e.preventDefault(); const f = Object.fromEntries(new FormData(e.target).entries()); f.whatsapp = N.soDigitos(f.whatsapp); f.nome = f.nome.trim();
      if (f.whatsapp.length < 10) return toast('WhatsApp com DDD, por favor.', 'erro');
      const db2 = D(); if (db2.clientes.some(x => x.whatsapp === f.whatsapp && x.id !== id && !x.anonimizada)) return toast('Já existe cliente com esse WhatsApp.', 'erro');
      if (id) { const x = N.cliente(db2, id); const mud = ['nome', 'whatsapp', 'email'].filter(k => x[k] !== f[k]); Object.assign(x, f); if (mud.length) N.logLGPD(db2, 'dona', 'Dados corrigidos', `${x.nome}: ${mud.join(', ')}`); }
      else { const nid = N.uid('c'); db2.clientes.push(Object.assign({ id: nid, senhaHash: '', criadoEm: N.isoAgora(), consent: {}, anamnese: {}, fotos: [], anonimizada: false, origem: 'painel' }, f)); N.save(db2); toast('Cliente cadastrada.'); UI.fecharModais(); location.hash = '#/ficha/' + nid; return; }
      N.save(db2); toast('Dados salvos.'); fecharERender();
    };
  };
  P.baixarDados = id => { const db = D(); const c = N.cliente(db, id); N.baixar(`dados-${c.nome.split(' ')[0].toLowerCase()}.json`, JSON.stringify(N.exportarDadosCliente(db, id), null, 2), 'application/json'); N.logLGPD(db, 'dona', 'Dados exportados', c.nome); N.save(db); };
  P.excluirCliente = async id => {
    const db = D(); const c = N.cliente(db, id);
    if (!await confirmar(`Apagar os dados pessoais de ${c.nome}? Nome, contatos, anamnese e fotos serão excluídos. Os registros financeiros ficam anonimizados. Não dá para desfazer.`, { perigo: true, sim: 'Apagar dados', titulo: 'Exclusão de dados' })) return;
    const d2 = D(); N.anonimizarCliente(d2, id, 'dona'); N.save(d2); toast('Dados pessoais apagados.'); location.hash = '#/clientes';
  };

  /* ============================ CAIXA ============================ */
  const fimMes = ym => { const [y, m] = ym.split('-').map(Number); return N.addDias(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`, -1); };
  const somaMes = (ym, n) => { let [y, m] = ym.split('-').map(Number); m += n; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return `${y}-${String(m).padStart(2, '0')}`; };
  const nomeMes = ym => { const m = N.MESES[+ym.slice(5) - 1]; return `${m[0].toUpperCase() + m.slice(1)} ${ym.slice(0, 4)}`; };
  TELAS.caixa = db => {
    const ym = S.caixaMes, de = ym + '-01', ate = fimMes(ym);
    const f = N.faturamento(db, de, ate); const desp = db.despesas.filter(d => d.data >= de && d.data <= ate).sort((a, b) => b.data.localeCompare(a.data));
    const tDesp = desp.reduce((s, d) => s + d.valor, 0);
    const maxPag = Math.max(1, ...Object.values(f.porPag));
    const meses = Array.from({ length: 6 }, (_, i) => somaMes(ym, -5 + i)).map(m => { const ff = N.faturamento(db, m + '-01', fimMes(m)); const dd = db.despesas.filter(d => d.data.startsWith(m)).reduce((s, d) => s + d.valor, 0); return { m, e: ff.total, d: dd, q: ff.qtd }; });
    return topo('Caixa', 'Entradas, despesas e resumo', `<button class="btn sec sm no-print" onclick="window.print()">${ic('file')} PDF</button><button class="btn sec sm no-print" onclick="P.exportarExcel()">${ic('down')} Excel</button>`) + `
    <div class="print-only"><h2>${esc(db.studio.nome)} — Caixa de ${nomeMes(ym)}</h2><p class="small">Gerado em ${N.fmtDataHora(N.isoAgora())}</p><br></div>
    <div class="ag-nav mb no-print"><button class="btn-ic" onclick="P.caixaMes(-1)">${ic('left')}</button><span class="titulo">${nomeMes(ym)}</span><button class="btn-ic" onclick="P.caixaMes(1)" ${ym >= H().slice(0, 7) ? 'disabled' : ''}>${ic('right')}</button></div>
    <div class="grid g4 mb">
      <div class="card kpi"><div class="l">Entradas</div><div class="v" style="color:var(--ok)">${N.fmtMoeda(f.total)}</div><div class="d">${f.qtd} atendimentos</div></div>
      <div class="card kpi"><div class="l">Despesas</div><div class="v" style="color:var(--err)">${N.fmtMoeda(tDesp)}</div><div class="d">${desp.length} lançamentos</div></div>
      <div class="card kpi"><div class="l">Resultado</div><div class="v">${N.fmtMoeda(f.total - tDesp)}</div><div class="d">entradas − despesas</div></div>
      <div class="card kpi"><div class="l">Ticket médio</div><div class="v">${N.fmtMoeda(f.ticket)}</div></div>
    </div>
    <div class="grid g2 mb">
      <section class="card"><div class="card-h"><h3>Por forma de pagamento</h3></div>
        ${Object.keys(f.porPag).length ? `<div class="barras">${['pix', 'dinheiro', 'debito', 'credito', 'outro'].filter(k => f.porPag[k]).map(k => `<div class="barra"><div class="r"><span>${N.PAGAMENTOS[k]}</span><b>${N.fmtMoeda(f.porPag[k])}</b></div><div class="trilho"><i style="width:${(f.porPag[k] / maxPag * 100).toFixed(1)}%"></i></div></div>`).join('')}</div>` : '<p class="muted small">Sem entradas no mês.</p>'}
      </section>
      <section class="card"><div class="card-h"><h3>Despesas</h3><button class="btn ghost sm no-print" onclick="P.novaDespesa()">${ic('plus')} Lançar</button></div>
        ${desp.length ? `<div class="lista">${desp.map(d => `<div class="item"><div class="grow"><div class="t ellip">${esc(d.descricao)}</div><div class="s">${N.fmtData(d.data)} · ${esc(d.categoria)}</div></div><b class="small">${N.fmtMoeda(d.valor)}</b><button class="btn-ic no-print" onclick="P.delDespesa('${d.id}')" aria-label="Remover">${ic('trash')}</button></div>`).join('')}</div>` : '<p class="muted small">Nenhuma despesa lançada.</p>'}
      </section>
    </div>
    <section class="card mb"><div class="card-h"><h3>Resumo mensal</h3></div><div class="tabela-w"><table class="t resp"><thead><tr><th>Mês</th><th class="n">Atend.</th><th class="n">Entradas</th><th class="n">Despesas</th><th class="n">Resultado</th></tr></thead><tbody>
      ${meses.map(x => `<tr><td data-l="Mês">${nomeMes(x.m)}</td><td class="n" data-l="Atend.">${x.q}</td><td class="n" data-l="Entradas">${N.fmtMoeda(x.e)}</td><td class="n" data-l="Despesas">${N.fmtMoeda(x.d)}</td><td class="n" data-l="Resultado"><b>${N.fmtMoeda(x.e - x.d)}</b></td></tr>`).join('')}</tbody></table></div></section>
    <section class="card"><div class="card-h"><h3>Entradas do mês</h3></div>${f.ags.length ? `<div class="tabela-w"><table class="t resp"><thead><tr><th>Data</th><th>Cliente</th><th>Serviços</th><th>Pagamento</th><th class="n">Valor</th></tr></thead><tbody>${f.ags.slice().reverse().map(a => `<tr><td data-l="Data">${N.fmtData(a.data)}</td><td data-l="Cliente">${esc((N.cliente(db, a.clienteId) || {}).nome)}</td><td data-l="Serviços">${esc(N.nomesServ(db, a.servicoIds))}</td><td data-l="Pagamento">${N.PAGAMENTOS[a.pagamento] || '—'}</td><td class="n" data-l="Valor">${N.fmtMoeda(a.preco)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Sem entradas.</p>'}</section>`;
  };
  P.caixaMes = n => { S.caixaMes = somaMes(S.caixaMes, n); render(); };
  P.novaDespesa = () => {
    const m = modal(`<form class="col" id="dp-f"><label class="f"><span>Descrição</span><input class="inp" name="descricao" required autofocus placeholder="Ex.: henna, aluguel"></label>
      <div class="grid g2"><label class="f"><span>Valor (R$)</span><input class="inp" name="valor" type="number" step="0.01" min="0.01" required></label><label class="f"><span>Data</span><input class="inp" name="data" type="date" value="${H()}" required></label></div>
      <label class="f"><span>Categoria</span><select class="inp" name="categoria">${['Produtos', 'Aluguel', 'Contas', 'Marketing', 'Equipamentos', 'Cursos', 'Outros'].map(c => `<option>${c}</option>`).join('')}</select></label>
      <div class="acoes"><button class="btn">Lançar despesa</button></div></form>`, { titulo: 'Nova despesa' });
    $('#dp-f', m).onsubmit = e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target).entries()); const db = D(); db.despesas.push({ id: N.uid('d'), descricao: f.descricao.trim(), valor: +f.valor, data: f.data, categoria: f.categoria }); N.save(db); toast('Despesa lançada.'); fecharERender(); };
  };
  P.delDespesa = async id => { if (!await confirmar('Remover esta despesa?', { perigo: true, sim: 'Remover' })) return; const db = D(); db.despesas = db.despesas.filter(d => d.id !== id); N.save(db); rerender(); };
  P.exportarExcel = () => {
    const db = D(), ym = S.caixaMes, de = ym + '-01', ate = fimMes(ym); const f = N.faturamento(db, de, ate);
    const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`; const num = v => (+v).toFixed(2).replace('.', ',');
    const L = ['sep=;', [q('Tipo'), q('Data'), q('Descrição'), q('Categoria/Pagamento'), q('Valor (R$)')].join(';')];
    f.ags.forEach(a => L.push([q('Entrada'), q(N.fmtData(a.data)), q(((N.cliente(db, a.clienteId) || {}).nome || '') + ' — ' + N.nomesServ(db, a.servicoIds)), q(N.PAGAMENTOS[a.pagamento] || ''), num(a.preco)].join(';')));
    db.despesas.filter(d => d.data >= de && d.data <= ate).forEach(d => L.push([q('Despesa'), q(N.fmtData(d.data)), q(d.descricao), q(d.categoria), num(-d.valor)].join(';')));
    N.baixar(`caixa-${ym}.csv`, '﻿' + L.join('\r\n'), 'text/csv;charset=utf-8'); toast('Planilha gerada (abre no Excel).');
  };

  /* ============================ SERVIÇOS ============================ */
  const ICONES = ['brow', 'drop', 'wave', 'pen', 'spark', 'eye', 'leaf', 'heart'];
  TELAS.servicos = db => topo('Serviços e preços', `${db.servicos.length} serviços`, `<button class="btn sm" onclick="P.editarServico()">${ic('plus')} Novo</button>`) + `
    <div class="grid g3">${db.servicos.map(s => `<div class="card"><div class="row mb-s"><span class="serv-op" style="padding:0;border:0;background:none"><span class="ico">${ic(s.icone || 'spark')}</span></span><div class="grow"><b>${esc(s.nome)}</b><div class="small muted">${N.fmtDur(s.duracao)} · ${N.fmtMoeda(s.preco)}</div></div><button class="btn-ic" onclick="P.editarServico('${s.id}')" aria-label="Editar">${ic('edit')}</button></div>
      <p class="small muted mb-s">${esc(s.descricao)}</p>
      <div class="row sp"><span class="badge gold">Retorno ${s.retornoMin}–${s.retornoMax} dias</span><label class="row small" style="gap:8px">No app <span class="switch"><input type="checkbox" ${s.visivel ? 'checked' : ''} onchange="P.servVisivel('${s.id}',this.checked)"><i></i></span></label></div></div>`).join('')}</div>`;
  P.servVisivel = (id, v) => { const db = D(); N.servico(db, id).visivel = v; N.save(db); toast(v ? 'Visível no app da cliente.' : 'Oculto no app da cliente.'); };
  P.editarServico = id => {
    const db = D(); const s = id ? N.servico(db, id) : { nome: '', duracao: 45, preco: 0, descricao: '', visivel: true, retornoMin: 15, retornoMax: 20, icone: 'brow' };
    let ico = s.icone;
    const m = modal(`<form class="col" id="sv-f"><label class="f"><span>Nome</span><input class="inp" name="nome" required value="${esc(s.nome)}" autofocus></label>
      <div class="grid g2"><label class="f"><span>Duração (min)</span><input class="inp" name="duracao" type="number" min="15" step="15" required value="${s.duracao}"></label><label class="f"><span>Preço (R$)</span><input class="inp" name="preco" type="number" min="0" step="0.01" required value="${s.preco}"></label></div>
      <label class="f"><span>Descrição</span><textarea class="inp" name="descricao">${esc(s.descricao)}</textarea></label>
      <div class="grid g2"><label class="f"><span>Retorno sugerido — de (dias)</span><input class="inp" name="retornoMin" type="number" min="0" value="${s.retornoMin}"></label><label class="f"><span>até (dias)</span><input class="inp" name="retornoMax" type="number" min="0" value="${s.retornoMax}"></label></div>
      <div><span class="small muted">Ícone</span><div class="chips mt-s" id="sv-i">${ICONES.map(i => `<button type="button" class="chip ${i === ico ? 'on' : ''}" data-i="${i}">${ic(i)}</button>`).join('')}</div></div>
      <div class="linha-cfg"><span>Visível no app da cliente</span><label class="switch"><input type="checkbox" name="visivel" ${s.visivel ? 'checked' : ''}><i></i></label></div>
      <div class="acoes">${id ? `<button type="button" class="btn sec" id="sv-del">${ic('trash')} Excluir</button>` : ''}<button class="btn">Salvar</button></div></form>`, { titulo: id ? 'Editar serviço' : 'Novo serviço' });
    $$('#sv-i .chip', m).forEach(b => b.onclick = () => { ico = b.dataset.i; $$('#sv-i .chip', m).forEach(x => x.classList.toggle('on', x === b)); });
    if (id) $('#sv-del', m).onclick = async () => { if (!await confirmar('Excluir este serviço? O histórico de atendimentos é mantido.', { perigo: true, sim: 'Excluir' })) return; const d2 = D(); d2.servicos = d2.servicos.filter(x => x.id !== id); N.save(d2); fecharERender(); };
    $('#sv-f', m).onsubmit = e => {
      e.preventDefault(); const f = new FormData(e.target);
      const r = { nome: f.get('nome').trim(), duracao: Math.max(15, Math.round(+f.get('duracao') / 15) * 15), preco: +f.get('preco'), descricao: f.get('descricao').trim(), retornoMin: +f.get('retornoMin'), retornoMax: Math.max(+f.get('retornoMin'), +f.get('retornoMax')), visivel: !!f.get('visivel'), icone: ico };
      const d2 = D(); if (id) Object.assign(N.servico(d2, id), r); else d2.servicos.push(Object.assign({ id: N.uid('s') }, r));
      N.save(d2); toast('Serviço salvo.'); fecharERender();
    };
  };

  /* ============================ AVALIAÇÕES ============================ */
  TELAS.avaliacoes = db => {
    const l = db.avaliacoes.slice().sort((a, b) => b.data.localeCompare(a.data));
    const media = l.length ? l.reduce((s, v) => s + v.nota, 0) / l.length : 0;
    const dist = [5, 4, 3, 2, 1].map(n => [n, l.filter(v => v.nota === n).length]);
    const fl = S.aval ? l.filter(v => v.nota === S.aval) : l;
    return topo('Avaliações', `${l.length} avaliações recebidas`) + `
    <div class="grid g2 mb"><div class="card" style="text-align:center"><div class="kpi"><div class="l">Nota média</div><div class="v" style="font-size:44px">${media.toFixed(1).replace('.', ',')}</div></div>${estrelas(media)}<p class="small muted mt-s">Pedimos a avaliação no app logo após o atendimento concluído.</p></div>
    <div class="card"><div class="barras">${dist.map(([n, q]) => `<div class="barra" style="cursor:pointer" onclick="P.filtroAval(${n})"><div class="r"><span>${n} estrela${n > 1 ? 's' : ''}</span><b>${q}</b></div><div class="trilho"><i style="width:${l.length ? q / l.length * 100 : 0}%"></i></div></div>`).join('')}</div></div></div>
    <div class="chips mb"><button class="chip ${!S.aval ? 'on' : ''}" onclick="P.filtroAval(0)">Todas</button>${[5, 4, 3, 2, 1].map(n => `<button class="chip ${S.aval === n ? 'on' : ''}" onclick="P.filtroAval(${n})">${n} ★</button>`).join('')}</div>
    <div class="col">${fl.length ? fl.map(v => { const c = N.cliente(db, v.clienteId) || {}; const a = db.agendamentos.find(x => x.id === v.agendamentoId); return `<div class="card"><div class="row sp mb-s"><div class="row"><div class="avatar sm">${iniciais(c.nome)}</div><div><b>${esc(c.nome)}</b><div class="tiny soft">${N.fmtDataHora(v.data)}${a ? ' · ' + esc(N.nomesServ(db, a.servicoIds)) : ''}</div></div></div>${estrelas(v.nota)}</div>${v.comentario ? `<p>${esc(v.comentario)}</p>` : '<p class="muted small">Sem comentário.</p>'}</div>`; }).join('') : `<div class="vazio">${ic('star')}<p>Nenhuma avaliação com esse filtro.</p></div>`}</div>`;
  };
  P.filtroAval = n => { S.aval = n; rerender(); };

  /* ============================ CONFIGURAÇÕES ============================ */
  TELAS.config = db => {
    const R = db.regras, st = db.studio, sg = db.seguranca;
    const sw = (path, v, label, sub) => `<div class="linha-cfg"><div><div>${label}</div>${sub ? `<div class="tiny soft">${sub}</div>` : ''}</div><label class="switch"><input type="checkbox" ${v ? 'checked' : ''} onchange="P.cfg('${path}',this.checked)"><i></i></label></div>`;
    const nm = (path, v, label, suf, min, max, step) => `<div class="linha-cfg"><span>${label}</span><div class="row" style="gap:6px"><input class="inp" style="width:84px;min-height:40px" type="number" min="${min}" max="${max}" step="${step || 1}" value="${v}" onchange="P.cfg('${path}',+this.value)"><span class="small muted">${suf}</span></div></div>`;
    const perm = 'Notification' in window ? Notification.permission : 'indisponível';
    return topo('Configurações', 'Studio, agendamento online, lembretes e segurança') + `
    <div class="grid g2">
    <section class="card"><div class="card-h"><h3>Dados do studio</h3></div>
      <form class="col" id="st-f" onsubmit="event.preventDefault();P.salvarStudio()">
        <div class="row">${UI.logoStudio(db, 56)}<label class="btn sec sm">${ic('camera')} Trocar logo<input type="file" accept="image/*" class="hide" onchange="P.logo(this)"></label>${st.logo ? `<button type="button" class="btn ghost sm" onclick="P.cfg('studio.logo',null);P._r()">Usar padrão</button>` : ''}</div>
        <label class="f"><span>Nome do studio</span><input class="inp" name="nome" required value="${esc(st.nome)}"></label>
        <label class="f"><span>Frase de boas-vindas</span><input class="inp" name="slogan" value="${esc(st.slogan)}"></label>
        <label class="f"><span>Endereço</span><input class="inp" name="endereco" value="${esc(st.endereco)}"></label>
        <div class="grid g2"><label class="f"><span>WhatsApp</span><input class="inp" name="whatsapp" inputmode="tel" value="${N.fmtFone(st.whatsapp)}"></label><label class="f"><span>Instagram</span><input class="inp" name="instagram" value="${esc(st.instagram)}"></label></div>
        <div class="row wrap"><button class="btn">Salvar dados</button><button type="button" class="btn sec" onclick="P.horarioFunc()">${ic('clock')} Horário de funcionamento</button></div>
      </form></section>
    <section class="card"><div class="card-h"><h3>Agendamento online</h3></div>
      ${sw('regras.online', R.online, 'Agendamento online ligado', 'Quando desligado, o app mostra só o WhatsApp')}
      <div class="linha-cfg"><div><div>Confirmação</div><div class="tiny soft">Pedidos do app</div></div><div class="seg"><button class="${R.confirmacao === 'pendente' ? 'on' : ''}" onclick="P.cfg('regras.confirmacao','pendente');P._r()">Eu aprovo</button><button class="${R.confirmacao === 'auto' ? 'on' : ''}" onclick="P.cfg('regras.confirmacao','auto');P._r()">Automática</button></div></div>
      ${nm('regras.antecedenciaMinH', R.antecedenciaMinH, 'Antecedência mínima', 'horas', 0, 72)}
      ${nm('regras.janelaDias', R.janelaDias, 'Janela máxima', 'dias', 1, 180)}
      ${nm('regras.cancelarH', R.cancelarH, 'Cancelar até', 'h antes', 0, 72)}
      ${nm('regras.remarcarH', R.remarcarH, 'Remarcar até', 'h antes', 0, 72)}
      ${nm('regras.gradeMin', R.gradeMin, 'Grade de horários a cada', 'min', 5, 60, 5)}
      ${nm('regras.limiteDia', R.limiteDia, 'Limite por cliente/dia', 'agend.', 1, 5)}
    </section>
    <section class="card"><div class="card-h"><h3>Lembretes e notificações</h3></div>
      ${sw('regras.lembrete24', R.lembrete24, 'Lembrete 24 h antes')}
      ${sw('regras.lembrete2', R.lembrete2, 'Lembrete 2 h antes')}
      ${sw('regras.lembreteWhats', R.lembreteWhats, 'Enviar por WhatsApp', 'Mensagem pronta para a cliente')}
      ${sw('regras.lembretePush', R.lembretePush, 'Notificação no celular da cliente')}
      <div class="linha-cfg"><div><div>Notificações neste aparelho</div><div class="tiny soft">Status: ${perm === 'granted' ? 'ativadas' : perm === 'denied' ? 'bloqueadas no navegador' : perm}</div></div><button class="btn sec sm" onclick="P.ativarNotif()">${perm === 'granted' ? 'Testar' : 'Ativar'}</button></div>
    </section>
    <section class="card"><div class="card-h"><h3>Segurança</h3></div>
      <form class="col" onsubmit="event.preventDefault();P.trocarSenha()">
        <label class="f"><span>Senha atual</span><input class="inp" type="password" id="sg-a" autocomplete="current-password"></label>
        <div class="grid g2"><label class="f"><span>Nova senha</span><input class="inp" type="password" id="sg-n" minlength="6" autocomplete="new-password"></label><label class="f"><span>Repetir</span><input class="inp" type="password" id="sg-r" autocomplete="new-password"></label></div>
        <div><button class="btn sec">Alterar senha</button></div></form>
      <div class="linha-cfg mt"><div><div>Verificação em duas etapas</div><div class="tiny soft">${sg.totpAtivo ? 'Ativa — código do app autenticador no login' : 'Use Google Authenticator, Microsoft Authenticator ou similar'}</div></div>${sg.totpAtivo ? `<button class="btn sec sm" onclick="P.desativar2fa()">Desativar</button>` : `<button class="btn sm" onclick="P.ativar2fa()">Ativar</button>`}</div>
    </section>
    <section class="card"><div class="card-h"><h3>Aparência e app</h3></div>
      <div class="linha-cfg"><span>Modo escuro</span><label class="switch"><input type="checkbox" ${document.documentElement.dataset.theme === 'dark' ? 'checked' : ''} onchange="P.tema()"><i></i></label></div>
      <div class="linha-cfg"><span>Instalar o painel no aparelho</span><button class="btn sec sm" onclick="UI.instalar()">Instalar</button></div>
      <div class="linha-cfg"><span>Link do app da cliente</span><button class="btn sec sm" onclick="P.copiarLink()">Copiar link</button></div>
      <div class="linha-cfg"><div><div>Dados de demonstração</div><div class="tiny soft">Apaga tudo e recarrega o exemplo</div></div><button class="btn sec sm" onclick="P.resetDemo()">Restaurar</button></div>
    </section></div>`;
  };
  P._r = () => rerender();
  P.cfg = (path, v) => { const db = D(); const ks = path.split('.'); let o = db; ks.slice(0, -1).forEach(k => (o = o[k])); o[ks[ks.length - 1]] = v; N.save(db); toast('Configuração salva.'); };
  P.salvarStudio = () => { const f = Object.fromEntries(new FormData($('#st-f')).entries()); const db = D(); Object.assign(db.studio, { nome: f.nome.trim() || '[NOME DO STUDIO]', slogan: f.slogan.trim(), endereco: f.endereco.trim(), whatsapp: N.soDigitos(f.whatsapp), instagram: f.instagram.trim() }); N.save(db); toast('Dados do studio salvos.'); rerender(); };
  P.logo = async inp => { const f = inp.files[0]; if (!f) return; try { const u = await UI.arquivoParaDataURL(f, 256); P.cfg('studio.logo', u); rerender(); } catch (e) { toast('Imagem inválida.', 'erro'); } };
  P.ativarNotif = async () => { if (Notification.permission !== 'granted' && !await UI.pedirNotificacoes()) return rerender(); UI.notificarSistema('Notificações ativas', 'Você vai receber os novos pedidos de agendamento aqui.'); rerender(); };
  P.copiarLink = () => { const u = location.origin + UI.BASE + 'cliente/'; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Link copiado: ' + u)).catch(() => prompt('Copie o link:', u)); };
  P.resetDemo = async () => { if (!await confirmar('Restaurar os dados de demonstração? Tudo o que foi alterado será perdido.', { perigo: true, sim: 'Restaurar' })) return; N.reset(); S.novo = null; toast('Dados de demonstração restaurados.'); render(); };
  P.trocarSenha = () => {
    const db = D(); if (N.hash($('#sg-a').value) !== db.seguranca.senhaHash) return toast('Senha atual incorreta.', 'erro');
    const n = $('#sg-n').value; if (n.length < 6) return toast('A nova senha precisa de ao menos 6 caracteres.', 'erro'); if (n !== $('#sg-r').value) return toast('As senhas não conferem.', 'erro');
    db.seguranca.senhaHash = N.hash(n); N.save(db); toast('Senha alterada.'); rerender();
  };
  P.ativar2fa = () => {
    const seg = N.totpSegredo(); const uri = `otpauth://totp/${encodeURIComponent(D().studio.nome)}:dona?secret=${seg}&issuer=Nexosys&digits=6&period=30`;
    const m = modal(`<ol class="small muted" style="padding-left:18px;margin:0 0 14px"><li>Abra seu app autenticador e escaneie o QR code.</li><li>Ou digite a chave manualmente.</li><li>Informe o código de 6 dígitos para confirmar.</li></ol>
      <div id="qr" style="display:grid;place-items:center;min-height:180px;background:#fff;border-radius:16px;padding:10px"><span class="small muted">Gerando QR code…</span></div>
      <p class="small mt" style="word-break:break-all;text-align:center"><b style="letter-spacing:.1em">${seg.match(/.{1,4}/g).join(' ')}</b></p>
      <form class="col mt" id="tf-f"><input class="inp codigo" id="tf-c" inputmode="numeric" maxlength="6" placeholder="000000" autocomplete="one-time-code"><button class="btn bloco">Ativar verificação</button></form>`, { titulo: 'Verificação em duas etapas' });
    const pintaQR = () => { try { const q = qrcode(0, 'M'); q.addData(uri); q.make(); $('#qr', m).innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }).replace('<svg ', '<svg style="width:180px;height:180px" '); } catch (e) { $('#qr', m).innerHTML = '<span class="small muted">Use a chave abaixo.</span>'; } };
    if (window.qrcode) pintaQR(); else { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = pintaQR; s.onerror = () => ($('#qr', m).innerHTML = '<span class="small muted">Sem internet para o QR code — use a chave abaixo.</span>'); document.head.appendChild(s); }
    $('#tf-f', m).onsubmit = async e => { e.preventDefault(); if (!await N.totpVerificar(seg, $('#tf-c', m).value)) return toast('Código incorreto. Confira o horário do celular.', 'erro'); const db = D(); db.seguranca.totpAtivo = true; db.seguranca.totpSegredo = seg; N.save(db); toast('Verificação em duas etapas ativada.'); fecharERender(); };
  };
  P.desativar2fa = () => {
    const m = modal(`<p class="small muted mb">Para desativar, digite um código atual do seu app autenticador.</p><form class="col" id="td-f"><input class="inp codigo" id="td-c" inputmode="numeric" maxlength="6" autofocus><button class="btn perigo bloco">Desativar</button></form>`, { titulo: 'Desativar duas etapas' });
    $('#td-f', m).onsubmit = async e => { e.preventDefault(); const db = D(); if (!await N.totpVerificar(db.seguranca.totpSegredo, $('#td-c', m).value)) return toast('Código incorreto.', 'erro'); db.seguranca.totpAtivo = false; db.seguranca.totpSegredo = ''; N.save(db); toast('Verificação em duas etapas desativada.'); fecharERender(); };
  };

  /* ============================ PRIVACIDADE (LGPD) ============================ */
  const TIPO_PED = { acesso: 'Acesso aos dados', correcao: 'Correção', exclusao: 'Exclusão', revogacao: 'Revogação de consentimento' };
  TELAS.privacidade = db => {
    const aba = S.priv.aba; const L = db.lgpd; const hj = H();
    let corpo = '';
    if (aba === 'pedidos') {
      const l = L.pedidos.slice().sort((a, b) => (a.status === 'aberto' ? 0 : 1) - (b.status === 'aberto' ? 0 : 1) || b.em.localeCompare(a.em));
      corpo = l.length ? `<div class="lista">${l.map(p => { const c = N.cliente(db, p.clienteId) || { nome: '—' }; const rest = N.diffDias(hj, p.prazo); return `<div class="item"><div class="grow"><div class="t">${TIPO_PED[p.tipo]} · ${esc(c.nome)}</div><div class="s">${esc(p.detalhe || '')}</div><div class="tiny soft">Recebido ${N.fmtDataHora(p.em)} · prazo ${N.fmtData(p.prazo)}${p.status === 'aberto' ? ` (<b style="color:${rest < 3 ? 'var(--err)' : 'var(--warn)'}">${rest >= 0 ? rest + ' dias restantes' : 'vencido'}</b>)` : ''}</div>${p.resposta ? `<div class="tiny mt-s">Resposta: ${esc(p.resposta)}</div>` : ''}</div>
        ${p.status === 'aberto' ? `<button class="btn sm" onclick="P.atenderPedido('${p.id}')">Atender</button>` : `<span class="badge ${p.status === 'atendido' ? 'st-concluido' : 'st-cancelado'}">${p.status === 'atendido' ? 'Atendido' : 'Recusado'}</span>`}</div>`; }).join('')}</div>` : `<div class="vazio">${ic('shield')}<p>Nenhum pedido de titular.</p></div>`;
    }
    if (aba === 'aceites') corpo = `<div class="tabela-w"><table class="t resp"><thead><tr><th>Data/hora</th><th>Cliente</th><th>Documento</th><th>Versão</th></tr></thead><tbody>${L.aceites.slice().sort((a, b) => b.em.localeCompare(a.em)).slice(0, 150).map(a => `<tr><td data-l="Data/hora">${N.fmtDataHora(a.em)}</td><td data-l="Cliente">${a.anonimizado ? '<i class="soft">anonimizada</i>' : esc((N.cliente(db, a.clienteId) || {}).nome)}</td><td data-l="Documento">${esc(a.doc)}${a.revogado ? ' <span class="badge st-cancelado">revogado</span>' : ''}</td><td data-l="Versão">${a.versao}</td></tr>`).join('')}</tbody></table></div>`;
    if (aba === 'log') corpo = L.log.length ? `<div class="lista">${L.log.map(l => `<div class="item"><div class="grow"><div class="t">${esc(l.acao)}</div><div class="s">${esc(l.detalhe)}</div></div><div class="tiny soft" style="text-align:right">${N.fmtDataHora(l.em)}<br>${l.quem === 'dona' ? 'Profissional' : 'Cliente'}</div></div>`).join('')}</div>` : '<p class="muted">Sem registros.</p>';
    if (aba === 'docs') {
      const desat = db.clientes.filter(c => !c.anonimizada && c.consent && c.consent.termosVersao && c.consent.termosVersao !== db.termos.versao).length;
      corpo = `<div class="grid g2">${[['termos', 'Termos de Uso'], ['privacidade', 'Política de Privacidade']].map(([k, l]) => `<div class="card flat"><h4>${l}</h4><p class="small muted mt-s">Versão <b>${db[k].versao}</b> · publicada em ${N.fmtData(db[k].data)}</p><div class="row wrap mt"><button class="btn sec sm" onclick="P.verDoc('${k}')">${ic('file')} Ver</button><button class="btn sm" onclick="P.publicarDoc('${k}')">${ic('edit')} Nova versão</button></div></div>`).join('')}</div>
        <p class="small muted mt">${desat} cliente(s) ainda precisam aceitar a versão atual — elas verão “Termos atualizados” ao abrir o app.</p>`;
    }
    const abertos = L.pedidos.filter(p => p.status === 'aberto').length;
    return topo('Privacidade (LGPD)', 'Aceites, pedidos das titulares e histórico') + `
      <div class="seg mb seg-scroll">${[['pedidos', `Pedidos${abertos ? ' (' + abertos + ')' : ''}`], ['aceites', 'Aceites'], ['log', 'Histórico'], ['docs', 'Documentos']].map(([k, l]) => `<button class="${aba === k ? 'on' : ''}" onclick="P.privAba('${k}')">${l}</button>`).join('')}</div>
      <div class="card">${corpo}</div>
      <p class="tiny soft mt">Prazo de resposta adotado: 15 dias (LGPD, art. 19). Dados de anamnese são sensíveis e ficam restritos à profissional.</p>`;
  };
  P.privAba = a => { S.priv.aba = a; rerender(); };
  P.atenderPedido = id => {
    const db = D(); const p = db.lgpd.pedidos.find(x => x.id === id); const c = N.cliente(db, p.clienteId);
    const acao = p.tipo === 'acesso' ? `<button class="btn sec sm" onclick="P.baixarDados('${c.id}')">${ic('down')} Baixar dados da cliente</button>` : p.tipo === 'correcao' ? `<button class="btn sec sm" onclick="UI.fecharModais();setTimeout(()=>P.editarCliente('${c.id}'),200)">${ic('edit')} Corrigir cadastro</button>` : p.tipo === 'exclusao' ? '<p class="small" style="color:var(--err)">Ao atender, os dados pessoais serão apagados e o financeiro anonimizado.</p>' : '';
    const m = modal(`<p class="mb"><b>${TIPO_PED[p.tipo]}</b> — ${esc(c.nome)}</p><p class="small muted mb">${esc(p.detalhe || '')}</p>${acao}
      <label class="f mt"><span>Resposta para a cliente</span><textarea class="inp" id="pd-r" placeholder="Descreva o que foi feito"></textarea></label>
      <div class="acoes"><button class="btn sec" id="pd-no">Recusar (justificar)</button><button class="btn" id="pd-ok">${ic('check')} Marcar como atendido</button></div>`, { titulo: 'Pedido da titular' });
    const fim = st => { const r = $('#pd-r', m).value.trim(); if (st === 'recusado' && !r) return toast('Escreva a justificativa.', 'erro'); const d2 = D(); const x = d2.lgpd.pedidos.find(y => y.id === id); x.status = st; x.resposta = r || 'Pedido atendido.'; x.atendidoEm = N.isoAgora(); if (st === 'atendido' && x.tipo === 'exclusao') N.anonimizarCliente(d2, x.clienteId, 'dona'); N.notificar(d2, x.clienteId, 'Seu pedido de privacidade', `${TIPO_PED[x.tipo]}: ${x.resposta}`); N.logLGPD(d2, 'dona', 'Pedido ' + (st === 'atendido' ? 'atendido' : 'recusado'), `${TIPO_PED[x.tipo]} — ${c.nome}`); N.save(d2); toast('Pedido registrado.'); fecharERender(); };
    $('#pd-ok', m).onclick = () => fim('atendido'); $('#pd-no', m).onclick = () => fim('recusado');
  };
  P.verDoc = k => { const db = D(); modal(`<div style="white-space:pre-line" class="small">${esc(db[k].texto)}</div>`, { titulo: `${k === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'} v${db[k].versao}`, largo: true }); };
  P.publicarDoc = k => {
    const db = D(); const d = db[k]; const [ma, mi] = d.versao.split('.').map(Number);
    const m = modal(`<p class="small muted mb">Ao publicar, todas as clientes verão “Termos atualizados” e precisarão ler e aceitar de novo.</p>
      <label class="f"><span>Nova versão</span><input class="inp" id="dc-v" value="${ma}.${mi + 1}"></label>
      <label class="f mt"><span>Texto</span><textarea class="inp" id="dc-t" style="min-height:280px">${esc(d.texto)}</textarea></label>
      <div class="acoes"><button class="btn" id="dc-ok">Publicar versão</button></div>`, { titulo: 'Publicar nova versão', largo: true });
    $('#dc-ok', m).onclick = () => { const v = $('#dc-v', m).value.trim(); if (!v || v === d.versao) return toast('Informe uma versão diferente.', 'erro'); const d2 = D(); d2[k] = { versao: v, data: H(), texto: $('#dc-t', m).value }; if (k === 'termos' && d2.privacidade.versao !== v) { /* mantém versões independentes */ } N.logLGPD(d2, 'dona', 'Nova versão publicada', `${k === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'} v${v}`); N.save(d2); toast('Nova versão publicada.'); fecharERender(); };
  };

  /* ============================ GALERIA ============================ */
  TELAS.galeria = db => {
    const g = db.galeria || []; const temEx = g.some(f => f.exemplo);
    return topo('Galeria', `${g.length} foto${g.length === 1 ? '' : 's'} no app`, `<label class="btn sm">${ic('plus')} Adicionar<input type="file" accept="image/*" multiple class="hide" onchange="P.galAdd(this)"></label>`) + `
    <p class="dica mb">Publique só fotos de clientes que <b>autorizaram o uso de imagem</b>. As fotos aparecem na tela inicial do app, nesta ordem.</p>
    ${temEx ? `<div class="card mb col" style="align-items:flex-start;gap:10px"><div><b>As imagens com a etiqueta “Ilustração” são de exemplo</b><div class="small muted">Troque pelas fotos do seu trabalho.</div></div><button class="btn sec sm" onclick="P.galLimparEx()">${ic('trash')} Remover exemplos</button></div>` : ''}
    ${g.length ? `<div class="gal-adm">${g.map((f, i) => `<figure class="card">
      <div class="gal-img"><img src="${esc(f.url)}" alt="${esc(f.legenda)}" loading="lazy">${f.exemplo ? '<span class="gal-tag">Ilustração</span>' : ''}</div>
      <figcaption><span class="ellip grow">${esc(f.legenda) || '<span class="soft">Sem legenda</span>'}</span></figcaption>
      <div class="row sp"><div class="row" style="gap:2px"><button class="btn-ic" ${i ? '' : 'disabled'} onclick="P.galMover('${f.id}',-1)" aria-label="Mover para antes">${ic('left')}</button><button class="btn-ic" ${i < g.length - 1 ? '' : 'disabled'} onclick="P.galMover('${f.id}',1)" aria-label="Mover para depois">${ic('right')}</button></div>
        <div class="row" style="gap:2px"><button class="btn-ic" onclick="P.galLegenda('${f.id}')" aria-label="Editar legenda">${ic('edit')}</button><button class="btn-ic" onclick="P.galDel('${f.id}')" aria-label="Apagar foto">${ic('trash')}</button></div></div>
    </figure>`).join('')}</div>` : `<div class="card vazio">${ic('camera')}<p>Nenhuma foto ainda. Adicione fotos do seu trabalho para mostrar no app.</p></div>`}`;
  };
  P.galAdd = async inp => {
    const fs = [...inp.files]; if (!fs.length) return;
    const db = D(); db.galeria = db.galeria || []; let n = 0;
    for (const f of fs) { try { db.galeria.unshift({ id: N.uid('g'), url: await UI.arquivoParaDataURL(f, 900), legenda: '', em: N.isoAgora() }); n++; } catch (e) { toast(`Não deu para abrir ${f.name}.`, 'erro'); } }
    N.save(db); if (n) toast(n === 1 ? 'Foto adicionada. Toque no lápis para pôr a legenda.' : `${n} fotos adicionadas.`); rerender();
  };
  P.galLegenda = id => {
    const f = (D().galeria || []).find(x => x.id === id); if (!f) return;
    const m = modal(`<form class="col" id="gl-f"><label class="f"><span>Legenda (ex.: nome do serviço)</span><input class="inp" name="l" maxlength="60" value="${esc(f.legenda)}" autofocus></label><div class="acoes"><button class="btn">Salvar</button></div></form>`, { titulo: 'Legenda da foto' });
    $('#gl-f', m).onsubmit = e => { e.preventDefault(); const db = D(); db.galeria.find(x => x.id === id).legenda = e.target.l.value.trim(); N.save(db); m.fechar(); rerender(); };
  };
  P.galMover = (id, d) => { const db = D(); const g = db.galeria; const i = g.findIndex(x => x.id === id), j = i + d; if (i < 0 || j < 0 || j >= g.length) return; [g[i], g[j]] = [g[j], g[i]]; N.save(db); rerender(); };
  P.galDel = async id => { if (!await confirmar('Apagar esta foto da galeria?', { sim: 'Apagar', perigo: true })) return; const db = D(); db.galeria = db.galeria.filter(x => x.id !== id); N.save(db); toast('Foto apagada.'); rerender(); };
  P.galLimparEx = async () => { if (!await confirmar('Remover as imagens de exemplo da galeria?', { sim: 'Remover', perigo: true })) return; const db = D(); db.galeria = db.galeria.filter(x => !x.exemplo); N.save(db); toast('Exemplos removidos.'); rerender(); };

  /* ============================ MAIS ============================ */
  TELAS.mais = db => topo('Mais', '') + `<div class="mais-grid">${MAIS.map(([k, l, i, s]) => `<a class="card" href="#/${k}">${ic(i)}<b>${l}</b><span>${s}</span></a>`).join('')}
    <a class="card" href="cliente/" target="_blank">${ic('heart')}<b>App da cliente</b><span>Ver como a cliente vê</span></a>
    <a class="card" href="javascript:UI.instalar()">${ic('down')}<b>Instalar painel</b><span>Ícone na tela inicial</span></a>
    <a class="card" href="javascript:P.tema()">${icTema()}<b>${escuro() ? 'Modo claro' : 'Modo escuro'}</b><span>Alternar aparência</span></a>
    <a class="card" href="javascript:P.sair()">${ic('out')}<b>Sair</b><span>Encerrar sessão</span></a></div>`;

  /* ============================ Inicialização ============================ */
  const vistos = new Set(D().notificacoes.map(n => n.id));
  N.onChange(() => {
    const db = D(); const novas = db.notificacoes.filter(n => n.para === 'dona' && !vistos.has(n.id));
    db.notificacoes.forEach(n => vistos.add(n.id));
    novas.forEach(n => { toast(n.titulo + ': ' + n.texto); UI.notificarSistema(n.titulo, n.texto, UI.BASE + '#/inicio'); });
    if (!sessaoOK()) return;
    const ativo = document.activeElement; const digitando = ativo && /INPUT|TEXTAREA|SELECT/.test(ativo.tagName);
    if (novas.length && !document.querySelector('.modal-bg') && !digitando) rerender();
  });
  addEventListener('hashchange', () => { UI.fecharModais(); if (!location.hash.startsWith('#/novo')) S.novo = S.novo && S.novo.passo > 1 ? S.novo : null; render(); });
  UI.tema(); UI.pwa();
  setInterval(() => { if (sessaoOK()) N.processarLembretes(D()); }, 60000);
  setTimeout(() => N.processarLembretes(D()), 1500);
  render();
})();
