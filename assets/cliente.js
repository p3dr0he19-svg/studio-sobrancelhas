/* App da cliente — rota "/cliente" · Desenvolvido por Nexosys */
(function () {
  'use strict';
  const N = Nexo, { esc, $, $$, ic, toast, modal, confirmar, badge, estrelas, iniciais } = UI;
  const D = () => N.load();
  const C = window.C = {};
  const app = document.getElementById('app');
  const S = { ag: null, nota: 0 };
  const sessao = () => { try { return localStorage.getItem('nexo_sessao_cliente'); } catch (e) { return null; } };
  const setSessao = id => { try { id ? localStorage.setItem('nexo_sessao_cliente', id) : localStorage.removeItem('nexo_sessao_cliente'); } catch (e) { } };
  const eu = db => { const id = sessao(); const c = id && N.cliente(db || D(), id); return c && !c.anonimizada ? c : null; };
  const rota = () => { const h = (location.hash || '#/').slice(2).split('/'); return { r: h[0] || 'inicio', arg: h[1] }; };

  /* ============================ Estrutura ============================ */
  function shell(r, html, db) {
    const c = eu(db);
    const on = k => (k === r || (k === 'horarios' && r === 'avaliar') || (k === 'conta' && r === 'dados') || (k === 'agendar' && r === 'sucesso')) ? 'on' : '';
    return `<div class="cli">
      <header class="cli-top"><a class="marca" href="#/" style="text-decoration:none;color:inherit">${UI.logoStudio(db, 36)}<span class="ellip">${esc(db.studio.nome)}</span></a>
        <div class="row" style="gap:2px"><button class="btn-ic" onclick="C.tema()" aria-label="Modo claro/escuro">${ic(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon')}</button>
        <a class="btn-ic" href="#/conta" aria-label="Minha conta">${c ? `<span class="avatar sm">${iniciais(c.nome)}</span>` : ic('user')}</a></div></header>
      ${html}
      <div class="nexo-ass">Desenvolvido por <b>Nexosys</b></div>
    </div>
    <nav class="cnav">${[['', 'inicio', 'Início', 'home'], ['agendar', 'agendar', 'Agendar', 'cal'], ['horarios', 'horarios', 'Horários', 'clock'], ['conta', 'conta', 'Conta', 'user']].map(([h, k, l, i]) => `<a href="#/${h}" class="${on(k)}">${ic(i)}<span>${l}</span></a>`).join('')}</nav>`;
  }
  const T = {};
  let depois = null;
  function render() {
    const db = D(); const { r, arg } = rota();
    depois = null;
    app.innerHTML = shell(r, (T[r] || T.inicio)(db, arg), db);
    document.title = db.studio.nome + ' · Agendamento';
    if (depois) depois();
    verificarTermos(db);
  }
  const rerender = () => { const y = scrollY; render(); scrollTo(0, y); };
  C.tema = () => { UI.tema('alternar'); rerender(); };

  /* ============================ VITRINE ============================ */
  T.inicio = db => {
    const c = eu(db); const prox = c && N.proximoHorario(db, c.id); const man = c && N.manutencao(db, c.id);
    const servs = db.servicos.filter(s => s.visivel);
    const st = db.studio;
    const horarioTxt = [1, 2, 3, 4, 5, 6, 0].map(d => { const h = db.horario[d]; return `<div class="lp"><span style="color:var(--text);font-size:14px">${N.DIAS[d]}</span><b>${h.aberto ? `${h.ini} – ${h.fim}` : '<span class="soft">Fechado</span>'}</b></div>`; }).join('');
    return `
    <section class="hero">${UI.logoStudio(db, 76)}
      <h1>${c ? `Oi, ${esc(c.nome.split(' ')[0])}!` : 'Seja bem-vinda'}</h1>
      <p>${esc(st.slogan)}</p>
      ${db.regras.online ? `<a class="btn lg" href="#/agendar">${ic('cal')} Agendar</a>` : `<a class="btn lg" target="_blank" rel="noopener" href="${N.waLink(st.whatsapp, 'Olá! Gostaria de agendar um horário.')}">${ic('whats')} Agendar pelo WhatsApp</a><p class="small mt-s">O agendamento online está pausado no momento.</p>`}
    </section>
    ${prox ? `<a class="prox" href="#/horarios" style="display:block;text-decoration:none;color:inherit"><div class="row sp"><span class="small muted">Seu próximo horário</span>${badge(prox.status)}</div><div class="quando">${N.fmtDataLonga(prox.data)} · ${prox.hora}</div><div class="small muted">${esc(N.nomesServ(db, prox.servicoIds))}</div></a>` : ''}
    ${man && man.naHora && !prox ? `<div class="lembrete-ret">${ic('spark')}<div class="grow"><b>Já está na hora da sua manutenção</b><div class="small muted">${esc(man.servico.nome)} há ${man.dias} dias</div></div><button class="btn sm" onclick="C.agendarServ('${man.servico.id}')">Agendar</button></div>` : ''}

    <div class="sec-t"><h2>O que fazemos</h2></div>
    <div class="servs">${servs.map(s => `<article class="serv-card"><span class="ico">${ic(s.icone || 'spark')}</span><h4>${esc(s.nome)}</h4><p>${esc(s.descricao)}</p><div class="row sp"><span class="pr">${s.preco ? N.fmtMoeda(s.preco) : 'Incluso'}</span><span class="tiny soft">${N.fmtDur(s.duracao)}</span></div></article>`).join('')}</div>

    <div class="sec-t"><h2>Valores</h2></div>
    <div class="card precos">${servs.map(s => `<div class="lp"><div><div style="font-weight:500">${esc(s.nome)}</div><span>${N.fmtDur(s.duracao)} · retorno ${s.retornoMin}–${s.retornoMax} dias</span></div><b>${s.preco ? N.fmtMoeda(s.preco) : 'Incluso'}</b></div>`).join('')}</div>

    <div class="sec-t"><h2>Como funciona</h2></div>
    <div class="card passos3">
      <div><span class="num">1</span><div><b>Escolha os serviços</b><p class="small muted">Pode escolher mais de um — somamos o tempo e o valor.</p></div></div>
      <div><span class="num">2</span><div><b>Escolha o dia e o horário</b><p class="small muted">Só aparecem horários realmente livres.</p></div></div>
      <div><span class="num">3</span><div><b>Confirme</b><p class="small muted">${db.regras.confirmacao === 'pendente' ? 'Seu pedido é aprovado pela profissional e você recebe o aviso.' : 'Seu horário é confirmado na hora.'}</p></div></div>
    </div>

    <div class="sec-t"><h2>Onde estamos</h2></div>
    <div class="mapa"><iframe loading="lazy" title="Mapa" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(st.endereco)}&output=embed"></iframe></div>
    <p class="row mt-s small">${ic('pin')} <span>${esc(st.endereco)}</span></p>
    <div class="contatos"><a class="btn sec" target="_blank" rel="noopener" href="${N.waLink(st.whatsapp, 'Olá!')}">${ic('whats')} WhatsApp</a><a class="btn sec" target="_blank" rel="noopener" href="https://instagram.com/${esc(st.instagram.replace('@', ''))}">${ic('insta')} Instagram</a></div>
    <div class="card precos mt"><h4 class="mb-s">Horário de atendimento</h4>${horarioTxt}</div>
    <p class="small muted mt" style="text-align:center"><a href="#/termos">Termos de Uso</a> · <a href="#/termos">Política de Privacidade</a> · <a href="javascript:UI.instalar()">Instalar app</a></p>`;
  };
  C.agendarServ = id => { S.ag = { passo: 2, servicoIds: [id], data: null, mes: N.hoje().slice(0, 7), hora: null }; location.hash = '#/agendar'; };

  T.termos = db => `<div class="etapa-h"><h2>Termos e privacidade</h2></div>
    <div class="card mb"><h3>Termos de Uso</h3><p class="tiny soft mb-s">Versão ${db.termos.versao} · ${N.fmtData(db.termos.data)}</p><div style="white-space:pre-line" class="small">${esc(db.termos.texto)}</div></div>
    <div class="card"><h3>Política de Privacidade</h3><p class="tiny soft mb-s">Versão ${db.privacidade.versao} · ${N.fmtData(db.privacidade.data)}</p><div style="white-space:pre-line" class="small">${esc(db.privacidade.texto)}</div></div>`;

  /* ============================ AGENDAR (3 passos) ============================ */
  T.agendar = db => {
    if (!db.regras.online) return `<div class="vazio" style="padding-top:60px">${ic('ban')}<h3 class="mt-s">Agendamento online pausado</h3><p class="mt-s">Fale com a gente pelo WhatsApp.</p><a class="btn mt" target="_blank" rel="noopener" href="${N.waLink(db.studio.whatsapp, 'Olá! Gostaria de agendar.')}">${ic('whats')} WhatsApp</a></div>`;
    if (!S.ag) S.ag = { passo: 1, servicoIds: [], data: null, mes: N.hoje().slice(0, 7), hora: null };
    const a = S.ag; const soma = N.somaServ(db, a.servicoIds); const remarcando = !!a.remarcarId;
    const hj = N.hoje(), max = N.addDias(hj, db.regras.janelaDias);
    let corpo = '';
    if (a.passo === 1) {
      corpo = `<div class="etapa-h"><div class="n">Passo 1 de 3</div><h2>Quais serviços?</h2><p class="small muted mt-s">Você pode escolher mais de um.</p></div>
        <div class="col">${db.servicos.filter(s => s.visivel).map(s => `<div class="serv-op ${a.servicoIds.includes(s.id) ? 'on' : ''}" onclick="C.serv('${s.id}')" role="checkbox" aria-checked="${a.servicoIds.includes(s.id)}" tabindex="0"><span class="marca-chk">${ic('check')}</span><span class="ico">${ic(s.icone || 'spark')}</span><div class="grow"><b>${esc(s.nome)}</b><div class="small muted">${N.fmtDur(s.duracao)}</div></div><b>${s.preco ? N.fmtMoeda(s.preco) : 'Incluso'}</b></div>`).join('')}</div>`;
    } else if (a.passo === 2) {
      const temVaga = {}; const cacheVaga = d => (d in temVaga ? temVaga[d] : (temVaga[d] = !N.diaFechado(db, d) && N.horariosLivres(db, d, soma.duracao, { paraCliente: true, ignorarId: a.remarcarId }).length > 0));
      if (!a.data) { let d = hj; for (let i = 0; i <= db.regras.janelaDias; i++, d = N.addDias(d, 1)) if (cacheVaga(d)) { a.data = d; a.mes = d.slice(0, 7); break; } }
      const livres = a.data ? N.horariosLivres(db, a.data, soma.duracao, { paraCliente: true, ignorarId: a.remarcarId }) : [];
      corpo = `<div class="etapa-h"><div class="n">Passo 2 de 3</div><h2>Escolha o dia e o horário</h2><p class="small muted mt-s">${esc(N.nomesServ(db, a.servicoIds))} · ${N.fmtDur(soma.duracao)}</p></div>
        <div class="card mb">${UI.calendario({ mes: a.mes, sel: a.data, min: hj, max, desab: d => !cacheVaga(d), onDia: 'C.dia', onMes: 'C.mes' })}</div>
        ${a.data ? `<h3 class="mb-s">${N.fmtDataLonga(a.data)}</h3>${livres.length ? UI.gradeSlots(livres, a.hora, 'C.hora') : '<p class="muted">Sem horários livres neste dia. Escolha outra data.</p>'}` : '<p class="muted">Nenhuma data disponível nos próximos dias. Fale com a gente pelo WhatsApp.</p>'}
        <p class="tiny soft mt">Agendamentos com ao menos ${db.regras.antecedenciaMinH} h de antecedência e até ${db.regras.janelaDias} dias à frente.</p>`;
    } else {
      const c = eu(db);
      corpo = `<div class="etapa-h"><div class="n">Passo 3 de 3</div><h2>${remarcando ? 'Confirme a remarcação' : 'Confirme seu horário'}</h2></div>
        <div class="card mb"><div class="quando" style="font-family:var(--serif);font-size:21px">${N.fmtDataLonga(a.data)}</div><div class="muted">${a.hora} às ${N.mh(N.hm(a.hora) + soma.duracao)} · ${N.fmtDur(soma.duracao)}</div>
          <div class="precos mt">${a.servicoIds.map(id => { const s = N.servico(db, id); return `<div class="lp"><span style="color:var(--text);font-size:14px">${esc(s.nome)}</span><b>${s.preco ? N.fmtMoeda(s.preco) : 'Incluso'}</b></div>`; }).join('')}<div class="lp"><b>Total</b><b>${N.fmtMoeda(soma.preco)}</b></div></div>
          <p class="tiny soft mt-s">Pagamento no studio: Pix, dinheiro ou cartão.</p></div>
        ${!remarcando ? `<label class="f mb"><span>Quer avisar algo? (opcional)</span><textarea class="inp" id="ag-obs" placeholder="Ex.: é minha primeira vez, tenho pele sensível…" oninput="C._obs=this.value">${esc(C._obs || '')}</textarea></label>` : ''}
        ${c ? `<p class="small muted mb">Agendando como <b>${esc(c.nome)}</b> · ${N.fmtFone(c.whatsapp)}</p>` : `<div class="dica mb">Para confirmar, entre ou crie sua conta — leva menos de 1 minuto.</div>`}
        <div class="small muted mb">Cancelamento até ${db.regras.cancelarH} h antes · remarcação até ${db.regras.remarcarH} h antes.</div>`;
    }
    const pode = a.passo === 1 ? a.servicoIds.length > 0 : a.passo === 2 ? !!a.hora : true;
    return `${a.passo > 1 || remarcando ? `<button class="btn ghost" style="margin-left:-12px" onclick="C.voltar()">${ic('left')} Voltar</button>` : ''}
      <div class="passos">${[1, 2, 3].map(i => `<div class="${i <= a.passo ? 'on' : ''}"></div>`).join('')}</div>${corpo}
      <div class="resumo-fixo"><div class="grow"><div class="small" style="opacity:.75">${a.servicoIds.length ? `${a.servicoIds.length} serviço${a.servicoIds.length > 1 ? 's' : ''} · ${N.fmtDur(soma.duracao)}` : 'Nenhum serviço'}${a.hora && a.passo >= 2 ? ` · ${N.fmtData(a.data)} ${a.hora}` : ''}</div><b>${N.fmtMoeda(soma.preco)}</b></div>
        ${a.passo < 3 ? `<button class="btn" ${pode ? '' : 'disabled'} onclick="C.avancar()">Continuar</button>` : `<button class="btn" onclick="C.confirmar()">${ic('check')} ${eu(db) ? 'Confirmar' : 'Entrar e confirmar'}</button>`}</div>`;
  };
  C.serv = id => { const l = S.ag.servicoIds; const i = l.indexOf(id); i >= 0 ? l.splice(i, 1) : l.push(id); S.ag.hora = null; S.ag.data = null; rerender(); };
  C.dia = d => { S.ag.data = d; S.ag.hora = null; rerender(); };
  C.mes = m => { S.ag.mes = m; rerender(); };
  C.hora = h => { S.ag.hora = h; rerender(); setTimeout(() => { const b = $('.resumo-fixo .btn'); if (b) b.focus({ preventScroll: true }); }, 30); };
  C.avancar = () => { S.ag.passo++; render(); scrollTo(0, 0); };
  C.voltar = () => { if (S.ag.remarcarId && S.ag.passo <= 2) { S.ag = null; location.hash = '#/horarios'; return; } S.ag.passo = Math.max(1, S.ag.passo - 1); render(); };
  C.confirmar = async () => {
    if (!eu()) { const ok = await abrirAuth('entrar'); if (!ok) return; }
    const db = D(); const c = eu(db); const a = S.ag;
    if (c.consent.termosVersao !== db.termos.versao || c.consent.privVersao !== db.privacidade.versao) { if (!await aceitarTermosAtualizados()) return; }
    try {
      const ag = await N.reservar({ clienteId: c.id, servicoIds: a.servicoIds.slice(), data: a.data, hora: a.hora, obs: (C._obs || '').trim() }, { origem: 'app', ignorarId: a.remarcarId });
      S.ag = null; C._obs = ''; location.hash = '#/sucesso/' + ag.id;
    } catch (e) { toast(e.message, 'erro'); S.ag.passo = 2; S.ag.hora = null; render(); }
  };

  T.sucesso = (db, id) => {
    const a = db.agendamentos.find(x => x.id === id); if (!a) return T.inicio(db);
    const pend = a.status === 'pendente';
    return `<div class="sucesso"><div class="selo ${pend ? 'pend' : ''}">${ic(pend ? 'clock' : 'check')}</div>
      <h1>${pend ? 'Agendamento solicitado' : 'Horário confirmado'}</h1>
      <p class="muted mt-s">${pend ? 'Assim que a profissional aprovar, você recebe uma notificação. 💕' : 'Te esperamos! Você vai receber lembretes antes do horário.'}</p>
      <div class="card mt" style="text-align:left"><div style="font-family:var(--serif);font-size:20px">${N.fmtDataLonga(a.data)} · ${a.hora}</div><div class="small muted">${esc(N.nomesServ(db, a.servicoIds))} · ${N.fmtMoeda(a.preco)}</div><div class="small muted mt-s">${ic('pin')} ${esc(db.studio.endereco)}</div></div>
      <div class="col mt"><a class="btn sec bloco" target="_blank" rel="noopener" href="${N.googleAgendaURL(db, a)}">${ic('google')} Adicionar ao Google Agenda</a>
      ${'Notification' in window && Notification.permission === 'default' ? `<button class="btn sec bloco" onclick="C.notif()">${ic('bell')} Receber avisos no celular</button>` : ''}
      <a class="btn bloco" href="#/horarios">Ver meus horários</a></div></div>`;
  };
  C.notif = async () => { if (await UI.pedirNotificacoes()) UI.notificarSistema('Tudo certo!', 'Você vai receber lembretes e confirmações por aqui.'); rerender(); };

  /* ============================ SEUS HORÁRIOS ============================ */
  T.horarios = db => {
    const c = eu(db);
    if (!c) return `<div class="vazio" style="padding-top:50px">${ic('clock')}<h3 class="mt-s">Seus horários</h3><p class="mt-s">Entre para ver e gerenciar seus agendamentos.</p><button class="btn mt" onclick="C.auth('entrar')">Entrar</button><button class="btn ghost mt" onclick="C.auth('cadastro')">Criar conta</button></div>`;
    const now = N.absAgora();
    const meus = db.agendamentos.filter(a => a.clienteId === c.id);
    const prox = meus.filter(a => ['pendente', 'confirmado'].includes(a.status) && N.abs(a.data, a.hora) + a.duracao > now);
    const ant = meus.filter(a => !prox.includes(a)).reverse();
    const man = N.manutencao(db, c.id);
    const avaliado = id => db.avaliacoes.some(v => v.agendamentoId === id);
    const pendAval = ant.find(a => a.status === 'concluido' && !avaliado(a.id) && N.diffDias(a.data, N.hoje()) <= 30);
    return `<div class="etapa-h"><h2>Seus horários</h2></div>
      ${pendAval ? `<div class="card mb" style="border-color:var(--gold)"><div class="row"><span style="color:var(--gold)">${ic('star')}</span><div class="grow"><b>Como foi seu atendimento?</b><div class="small muted">${esc(N.nomesServ(db, pendAval.servicoIds))} em ${N.fmtData(pendAval.data)}</div></div><a class="btn sm" href="#/avaliar/${pendAval.id}">Avaliar</a></div></div>` : ''}
      ${man && man.naHora && !prox.length ? `<div class="lembrete-ret mb">${ic('spark')}<div class="grow"><b>Já está na hora da sua manutenção</b><div class="small muted">${esc(man.servico.nome)} · última há ${man.dias} dias</div></div><button class="btn sm" onclick="C.agendarServ('${man.servico.id}')">Agendar</button></div>` : ''}
      <h3 class="mb-s">Próximos</h3>
      ${prox.length ? prox.map(a => {
        const pc = N.podeCancelar(db, a), pr = N.podeRemarcar(db, a);
        return `<div class="card mb"><div class="row sp"><div style="font-family:var(--serif);font-size:19px">${N.fmtDataLonga(a.data)}</div>${badge(a.status)}</div>
          <div class="muted small">${a.hora} – ${N.mh(N.hm(a.hora) + a.duracao)} · ${esc(N.nomesServ(db, a.servicoIds))} · ${N.fmtMoeda(a.preco)}</div>
          <div class="row wrap mt"><a class="btn sec sm" target="_blank" rel="noopener" href="${N.googleAgendaURL(db, a)}">${ic('google')} Google Agenda</a>
          ${pr ? `<button class="btn sec sm" onclick="C.remarcar('${a.id}')">${ic('clock')} Remarcar</button>` : ''}
          ${pc ? `<button class="btn ghost sm" onclick="C.cancelar('${a.id}')">Cancelar</button>` : ''}</div>
          ${!pc || !pr ? `<p class="tiny soft mt-s">${!pr ? `Remarcação só até ${db.regras.remarcarH} h antes` : ''}${!pr && !pc ? ' e cancelamento' : !pc ? `Cancelamento só` : ''}${!pc ? ` até ${db.regras.cancelarH} h antes` : ''}. Precisa mudar? <a target="_blank" rel="noopener" href="${N.waLink(db.studio.whatsapp, `Olá! Preciso falar sobre meu horário de ${N.fmtData(a.data)} às ${a.hora}.`)}">Fale no WhatsApp</a>.</p>` : ''}</div>`;
      }).join('') : `<div class="card mb vazio">${ic('cal')}<p>Nenhum horário marcado.</p><a class="btn sm mt-s" href="#/agendar">Agendar agora</a></div>`}
      <h3 class="mb-s mt">Anteriores</h3>
      <div class="card" style="padding:6px 14px">${ant.length ? `<div class="lista">${ant.slice(0, 30).map(a => `<div class="item"><div class="grow"><div class="t">${esc(N.nomesServ(db, a.servicoIds))}</div><div class="s">${N.fmtData(a.data)} · ${a.hora}</div></div>${a.status === 'concluido' && !avaliado(a.id) ? `<a class="btn sm sec" href="#/avaliar/${a.id}">Avaliar</a>` : a.status === 'concluido' ? estrelas((db.avaliacoes.find(v => v.agendamentoId === a.id) || {}).nota || 0) : badge(a.status)}</div>`).join('')}</div>` : '<p class="muted small" style="padding:10px 0">Ainda não há atendimentos anteriores.</p>'}</div>`;
  };
  C.remarcar = id => { const db = D(); const a = db.agendamentos.find(x => x.id === id); if (!N.podeRemarcar(db, a)) return toast('Fora do prazo para remarcar.', 'erro'); S.ag = { passo: 2, servicoIds: a.servicoIds.slice(), data: null, mes: N.hoje().slice(0, 7), hora: null, remarcarId: id }; location.hash = '#/agendar'; };
  C.cancelar = async id => {
    if (!await confirmar('Cancelar este horário? Ele ficará livre para outra cliente.', { sim: 'Cancelar horário', nao: 'Manter', perigo: true, titulo: 'Cancelar horário' })) return;
    await N.comTrava(db => {
      const a = db.agendamentos.find(x => x.id === id);
      if (!N.podeCancelar(db, a)) { toast('Fora do prazo de cancelamento. Fale no WhatsApp.', 'erro'); return; }
      a.status = 'cancelado'; a.historico = (a.historico || []).concat({ em: N.isoAgora(), acao: 'Cancelado pela cliente' });
      N.notificar(db, 'dona', 'Cancelamento', `${(N.cliente(db, a.clienteId) || {}).nome} cancelou ${N.fmtData(a.data)} às ${a.hora}.`);
      N.save(db); toast('Horário cancelado.');
    });
    rerender();
  };

  /* ============================ AVALIAR ============================ */
  T.avaliar = (db, id) => {
    const a = db.agendamentos.find(x => x.id === id); const c = eu(db);
    if (!a || !c || a.clienteId !== c.id) return T.horarios(db);
    if (db.avaliacoes.some(v => v.agendamentoId === id)) return `<div class="sucesso"><div class="selo">${ic('heart')}</div><h1>Obrigada!</h1><p class="muted mt-s">Você já avaliou este atendimento.</p><a class="btn mt" href="#/horarios">Voltar</a></div>`;
    return `<div class="sucesso" style="padding-bottom:0"><h1>Como foi seu atendimento?</h1><p class="muted mt-s">${esc(N.nomesServ(db, a.servicoIds))} · ${N.fmtData(a.data)}</p>
      <div class="estrelas-in mt" role="radiogroup" aria-label="Nota">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${n <= S.nota ? 'on' : ''}" onclick="C.nota(${n})" aria-label="${n} estrela${n > 1 ? 's' : ''}">${ic('star')}</button>`).join('')}</div>
      <p class="small muted mt-s">${['Toque nas estrelas', 'Não gostei', 'Poderia ser melhor', 'Bom', 'Muito bom', 'Amei!'][S.nota]}</p></div>
      <label class="f mt"><span>Conte um pouco (opcional)</span><textarea class="inp" id="av-c" maxlength="500" placeholder="O que você achou?">${esc(C._av || '')}</textarea></label>
      <button class="btn bloco mt" ${S.nota ? '' : 'disabled'} onclick="C.enviarAval('${id}')">Enviar avaliação</button>`;
  };
  C.nota = n => { C._av = ($('#av-c') || {}).value || ''; S.nota = n; rerender(); };
  C.enviarAval = id => {
    const db = D(); const c = eu(db); if (db.avaliacoes.some(v => v.agendamentoId === id)) return;
    db.avaliacoes.push({ id: N.uid('av'), agendamentoId: id, clienteId: c.id, nota: S.nota, comentario: ($('#av-c').value || '').trim(), data: N.isoAgora() });
    N.notificar(db, 'dona', 'Nova avaliação', `${c.nome.split(' ')[0]} deu ${S.nota} estrela${S.nota > 1 ? 's' : ''}.`);
    N.save(db); S.nota = 0; C._av = ''; toast('Obrigada pela avaliação! 💕'); location.hash = '#/horarios';
  };

  /* ============================ CONTA ============================ */
  T.conta = db => {
    const c = eu(db);
    if (!c) return `<div class="etapa-h" style="text-align:center;padding-top:20px">${UI.logoStudio(db, 64)}<h2 class="mt">Sua conta</h2><p class="muted small mt-s">Entre para agendar, acompanhar e avaliar seus horários.</p></div>
      <div class="col"><button class="btn bloco lg" onclick="C.auth('entrar')">Entrar</button><button class="btn sec bloco" onclick="C.auth('cadastro')">Criar conta</button><button class="btn ghost" onclick="C.auth('recuperar')">Recuperar acesso</button></div>
      <p class="dica mt">Demonstração: WhatsApp <b>(11) 98888-0001</b> ou <b>mariana@exemplo.com</b> · senha <b>demo123</b></p>`;
    const perm = 'Notification' in window ? Notification.permission : 'nao';
    return `<div class="card mb"><div class="row"><div class="avatar" style="width:56px;height:56px;font-size:20px;font-family:var(--serif)">${iniciais(c.nome)}</div><div class="grow"><h3>${esc(c.nome)}</h3><div class="small muted">${N.fmtFone(c.whatsapp)}</div><div class="small muted ellip">${esc(c.email)}</div></div></div></div>
      <div class="card" style="padding:4px 18px">
        <a class="linha-cfg" href="#/horarios" style="text-decoration:none;color:inherit"><span class="row">${ic('clock')} Seus horários</span>${ic('right')}</a>
        <a class="linha-cfg" href="#/dados" style="text-decoration:none;color:inherit"><span class="row">${ic('shield')} Meus dados e privacidade</span>${ic('right')}</a>
        <div class="linha-cfg"><span class="row">${ic('bell')} Notificações no celular</span>${perm === 'granted' ? '<span class="badge st-concluido">Ativas</span>' : perm === 'denied' ? '<span class="badge st-cancelado">Bloqueadas</span>' : perm === 'nao' ? '<span class="tiny soft">Indisponível</span>' : `<button class="btn sm sec" onclick="C.notif()">Ativar</button>`}</div>
        <a class="linha-cfg" href="javascript:UI.instalar()" style="text-decoration:none;color:inherit"><span class="row">${ic('down')} Instalar o app</span>${ic('right')}</a>
        <a class="linha-cfg" href="#/termos" style="text-decoration:none;color:inherit"><span class="row">${ic('file')} Termos e privacidade</span>${ic('right')}</a>
        <a class="linha-cfg" href="javascript:C.sair()" style="text-decoration:none;color:var(--err)"><span class="row">${ic('out')} Sair</span></a>
      </div>`;
  };
  C.sair = async () => { if (await confirmar('Sair da sua conta neste aparelho?', { sim: 'Sair' })) { setSessao(null); location.hash = '#/'; render(); } };
  C.auth = m => abrirAuth(m).then(ok => ok && render());

  /* Leitor de termos em tela cheia: precisa rolar até o fim */
  function abrirLeitor(titulo) {
    const db = D();
    return new Promise(res => {
      let ok = false;
      const m = modal(`<div class="leitor-top"><div><h3>${titulo || 'Termos de Uso e Política de Privacidade'}</h3><p class="tiny soft mt-s">Termos v${db.termos.versao} (${N.fmtData(db.termos.data)}) · Privacidade v${db.privacidade.versao} (${N.fmtData(db.privacidade.data)})</p></div><button class="btn-ic" data-fechar aria-label="Fechar">${ic('x')}</button></div>
        <div class="leitor-txt" id="lt" tabindex="0"><h3>Termos de Uso</h3>${esc(db.termos.texto)}<h3>Política de Privacidade</h3>${esc(db.privacidade.texto)}<p class="small muted" style="margin-top:28px">— Fim do documento —</p></div>
        <div class="leitor-pe"><div class="progresso"><i id="lt-p"></i></div><p class="tiny soft mb-s" id="lt-h">Role até o fim para liberar o aceite.</p>
          <label class="chk mb-s"><input type="checkbox" id="lt-c" disabled> <span>Li e aceito os Termos de Uso e a Política de Privacidade.</span></label>
          <button class="btn bloco" id="lt-ok" disabled>Continuar</button></div>`, { cheia: true, fixo: true, aoFechar: () => res(ok) });
      const t = $('#lt', m), p = $('#lt-p', m), cb = $('#lt-c', m), bt = $('#lt-ok', m);
      const chk = () => { const f = t.scrollHeight - t.clientHeight; const pr = f <= 4 ? 1 : t.scrollTop / f; p.style.width = Math.min(100, pr * 100) + '%'; if (pr > 0.985 && cb.disabled) { cb.disabled = false; $('#lt-h', m).textContent = 'Obrigada por ler. Agora você pode aceitar.'; } };
      t.addEventListener('scroll', chk, { passive: true }); setTimeout(chk, 100);
      cb.onchange = () => (bt.disabled = !cb.checked);
      bt.onclick = () => { ok = true; m.fechar(); };
    });
  }
  function registrarAceite(db, c) {
    const em = N.isoAgora();
    c.consent = Object.assign(c.consent || {}, { termosVersao: db.termos.versao, privVersao: db.privacidade.versao, termosEm: em });
    db.lgpd.aceites.push({ id: N.uid('a'), clienteId: c.id, doc: 'Termos de Uso', versao: db.termos.versao, em, origem: 'app' }, { id: N.uid('a'), clienteId: c.id, doc: 'Política de Privacidade', versao: db.privacidade.versao, em, origem: 'app' });
  }
  let checandoTermos = false, adiado = false;
  async function verificarTermos(db) {
    const c = eu(db); if (!c || checandoTermos || adiado || document.querySelector('.modal-bg')) return;
    if (c.consent.termosVersao === db.termos.versao && c.consent.privVersao === db.privacidade.versao) return;
    checandoTermos = true; await aceitarTermosAtualizados(); checandoTermos = false;
  }
  function aceitarTermosAtualizados() {
    const db = D(); const c = eu(db); const primeira = !c.consent.termosVersao;
    return new Promise(res => {
      const m = modal(`<div class="aviso-termos mb"><b>${primeira ? 'Aceite pendente' : 'Termos atualizados'}</b><p class="small mt-s">${primeira ? 'Seu cadastro foi feito pelo studio. Para usar o agendamento online, leia e aceite os termos.' : `Atualizamos nossos Termos de Uso (v${db.termos.versao}) e/ou Política de Privacidade (v${db.privacidade.versao}). Para continuar agendando, leia e aceite a nova versão.`}</p></div>
        <div class="acoes"><button class="btn sec" id="ta-s">Agora não</button><button class="btn" id="ta-l">${ic('file')} Ler e aceitar</button></div>`, { titulo: primeira ? 'Bem-vinda!' : 'Termos atualizados', fixo: true });
      $('#ta-s', m).onclick = () => { adiado = true; m.fechar(); res(false); };
      $('#ta-l', m).onclick = async () => {
        m.fechar(); const ok = await abrirLeitor();
        if (ok) { const d2 = D(); const c2 = N.cliente(d2, c.id); registrarAceite(d2, c2); N.save(d2); toast('Obrigada! Aceite registrado.'); }
        res(ok);
      };
    });
  }

  function abrirAuth(modo) {
    return new Promise(res => {
      let ok = false; let lido = false; let rec = null;
      const m = modal('<div id="au"></div>', { titulo: '', aoFechar: () => res(ok) });
      const w = $('#au', m);
      const vai = md => { modo = md; desenha(); };
      function desenha() {
        if (modo === 'entrar') w.innerHTML = `<h2 class="mb">Entrar</h2><form class="col" id="f">
          <label class="f"><span>WhatsApp ou e-mail</span><input class="inp" name="id" required autocomplete="username" autofocus></label>
          <label class="f"><span>Senha</span><input class="inp" name="senha" type="password" required autocomplete="current-password"></label>
          <button class="btn bloco">Entrar</button></form>
          <div class="row sp mt"><button class="btn ghost sm" data-v="recuperar">Recuperar acesso</button><button class="btn ghost sm" data-v="cadastro">Criar conta</button></div>
          <p class="dica mt">Demo: <b>(11) 98888-0001</b> · senha <b>demo123</b></p>`;
        else if (modo === 'cadastro') w.innerHTML = `<h2 class="mb">Criar conta</h2><form class="col" id="f">
          <label class="f"><span>Nome completo</span><input class="inp" name="nome" required minlength="3" autocomplete="name" autofocus></label>
          <label class="f"><span>WhatsApp</span><input class="inp" name="whatsapp" required inputmode="tel" autocomplete="tel" placeholder="(11) 90000-0000"></label>
          <label class="f"><span>E-mail</span><input class="inp" name="email" type="email" required autocomplete="email"></label>
          <label class="f"><span>Senha (mín. 6 caracteres)</span><input class="inp" name="senha" type="password" required minlength="6" autocomplete="new-password"></label>
          <div class="card flat" style="padding:14px;background:var(--surface-2);border:0">
            <button type="button" class="btn sec bloco" id="ler">${ic('file')} ${lido ? 'Termos lidos ✓' : 'Ler Termos e Política de Privacidade'}</button>
            <label class="chk mt-s"><input type="checkbox" name="aceite" ${lido ? 'checked' : 'disabled'}> <span>Li e aceito os Termos de Uso e a Política de Privacidade. <span class="tiny soft">(obrigatório)</span></span></label>
          </div>
          <label class="chk"><input type="checkbox" name="fotos"> <span>Autorizo fotos de antes/depois do meu atendimento para meu histórico. <span class="tiny soft">(opcional)</span></span></label>
          <label class="chk"><input type="checkbox" name="marketing"> <span>Quero receber novidades e promoções pelo WhatsApp. <span class="tiny soft">(opcional)</span></span></label>
          <button class="btn bloco">Criar conta</button></form>
          <p class="mt small" style="text-align:center">Já tem conta? <a href="javascript:void 0" data-v="entrar">Entrar</a></p>`;
        else if (modo === 'recuperar') w.innerHTML = `<h2 class="mb">Recuperar acesso</h2>${!rec ? `<p class="small muted mb">Enviaremos um código para o seu WhatsApp ou e-mail cadastrado.</p><form class="col" id="f">
          <label class="f"><span>WhatsApp ou e-mail</span><input class="inp" name="id" required autofocus></label><button class="btn bloco">Enviar código</button></form>`
          : `<div class="dica mb">Demonstração: o código enviado é <b>${rec.codigo}</b></div><form class="col" id="f">
          <label class="f"><span>Código recebido</span><input class="inp codigo" name="codigo" inputmode="numeric" maxlength="6" required autofocus></label>
          <label class="f"><span>Nova senha</span><input class="inp" name="senha" type="password" minlength="6" required autocomplete="new-password"></label><button class="btn bloco">Salvar nova senha</button></form>`}
          <p class="mt small" style="text-align:center"><a href="javascript:void 0" data-v="entrar">Voltar para entrar</a></p>`;
        $$('[data-v]', w).forEach(b => b.onclick = e => { e.preventDefault(); vai(b.dataset.v); });
        const zap = $('[name=whatsapp]', w); if (zap) UI.mascaraFone(zap);
        const ler = $('#ler', w); if (ler) ler.onclick = async () => { const keep = Object.fromEntries(new FormData($('#f', w)).entries()); if (await abrirLeitor()) lido = true; desenha(); Object.entries(keep).forEach(([k, v]) => { const el = $(`[name=${k}]`, w); if (el && el.type !== 'checkbox') el.value = v; else if (el && k !== 'aceite') el.checked = v === 'on'; }); };
        $('#f', w).onsubmit = e => { e.preventDefault(); enviar(Object.fromEntries(new FormData(e.target).entries())); };
        setTimeout(() => { const f = $('[autofocus]', w); if (f) f.focus(); }, 50);
      }
      const acha = (db, id) => { id = id.trim().toLowerCase(); const d = N.soDigitos(id); return db.clientes.find(c => !c.anonimizada && ((c.email && c.email.toLowerCase() === id) || (d.length >= 10 && c.whatsapp === d))); };
      function enviar(f) {
        const db = D();
        if (modo === 'entrar') {
          const c = acha(db, f.id);
          if (!c || !c.senhaHash || c.senhaHash !== N.hash(f.senha)) return toast(c && !c.senhaHash ? 'Sua ficha foi criada pelo studio. Use “Recuperar acesso” para criar uma senha.' : 'Dados de acesso incorretos.', 'erro');
          setSessao(c.id); ok = true; toast(`Que bom te ver, ${c.nome.split(' ')[0]}!`); m.fechar();
        } else if (modo === 'cadastro') {
          if (!lido || !f.aceite) return toast('Leia e aceite os termos para continuar.', 'erro');
          const zap = N.soDigitos(f.whatsapp); if (zap.length < 10) return toast('Informe o WhatsApp com DDD.', 'erro');
          const ex = db.clientes.find(c => !c.anonimizada && (c.whatsapp === zap || (c.email && c.email.toLowerCase() === f.email.toLowerCase())));
          if (ex && ex.senhaHash) return toast('Já existe conta com esse WhatsApp ou e-mail. Tente entrar.', 'erro');
          const em = N.isoAgora();
          const c = ex || { id: N.uid('c'), criadoEm: em, anamnese: {}, fotos: [], anonimizada: false };
          Object.assign(c, { nome: f.nome.trim(), whatsapp: zap, email: f.email.trim().toLowerCase(), senhaHash: N.hash(f.senha), consent: { fotos: !!f.fotos, fotosEm: f.fotos ? em : null, marketing: !!f.marketing, marketingEm: f.marketing ? em : null } });
          if (!ex) db.clientes.push(c);
          registrarAceite(db, c);
          if (f.fotos) db.lgpd.aceites.push({ id: N.uid('a'), clienteId: c.id, doc: 'Consentimento de fotos', versao: '—', em, origem: 'app' });
          if (f.marketing) db.lgpd.aceites.push({ id: N.uid('a'), clienteId: c.id, doc: 'Mensagens de marketing', versao: '—', em, origem: 'app' });
          N.notificar(db, 'dona', 'Nova cliente cadastrada', c.nome);
          N.save(db); setSessao(c.id); ok = true; toast('Conta criada! Bem-vinda 💕'); m.fechar();
        } else if (!rec) {
          const c = acha(db, f.id); rec = { codigo: String(Math.floor(100000 + Math.random() * 900000)), id: c && c.id };
          toast('Se houver uma conta, enviamos o código.'); desenha();
        } else {
          if (f.codigo !== rec.codigo || !rec.id) return toast('Código inválido.', 'erro');
          const c = N.cliente(db, rec.id); c.senhaHash = N.hash(f.senha); N.save(db); setSessao(c.id); ok = true; toast('Senha alterada. Você já está conectada.'); m.fechar();
        }
      }
      desenha();
    });
  }

  /* ============================ MEUS DADOS (LGPD) ============================ */
  T.dados = db => {
    const c = eu(db); if (!c) return T.conta(db);
    depois = ligarDados;
    const k = c.consent || {};
    const peds = db.lgpd.pedidos.filter(p => p.clienteId === c.id);
    return `<a class="btn ghost" style="margin-left:-12px" href="#/conta">${ic('left')} Conta</a>
      <div class="etapa-h"><h2>Meus dados</h2><p class="small muted mt-s">Você controla seus dados. Veja, corrija, baixe ou apague quando quiser.</p></div>
      <section class="card mb"><h3 class="mb">Cadastro</h3><form class="col" id="md-f">
        <label class="f"><span>Nome</span><input class="inp" name="nome" required value="${esc(c.nome)}"></label>
        <label class="f"><span>WhatsApp</span><input class="inp" name="whatsapp" required inputmode="tel" value="${N.fmtFone(c.whatsapp)}"></label>
        <label class="f"><span>E-mail</span><input class="inp" name="email" type="email" required value="${esc(c.email)}"></label>
        <div><button class="btn sec">${ic('check')} Salvar correções</button></div></form>
        <p class="tiny soft mt-s">Conta criada em ${N.fmtDataHora(c.criadoEm)}. Sua ficha técnica (anamnese) é um dado de saúde, guardado com sigilo e visível só para a profissional. Ela vem inclusa no arquivo “Baixar meus dados”.</p></section>
      <section class="card mb"><h3 class="mb-s">Consentimentos</h3>
        <div class="linha-cfg"><div><div>Termos e Política de Privacidade</div><div class="tiny soft">Aceitos v${k.termosVersao || '—'} em ${N.fmtDataHora(k.termosEm)}</div></div><a class="btn ghost sm" href="#/termos">Ver</a></div>
        <div class="linha-cfg"><div><div>Fotos antes/depois</div><div class="tiny soft">Opcional · ${k.fotos ? 'autorizado em ' + N.fmtDataHora(k.fotosEm) : 'não autorizado'}</div></div><label class="switch"><input type="checkbox" ${k.fotos ? 'checked' : ''} onchange="C.consent('fotos',this.checked)"><i></i></label></div>
        <div class="linha-cfg"><div><div>Novidades e promoções</div><div class="tiny soft">Opcional · ${k.marketing ? 'autorizado em ' + N.fmtDataHora(k.marketingEm) : 'não autorizado'}</div></div><label class="switch"><input type="checkbox" ${k.marketing ? 'checked' : ''} onchange="C.consent('marketing',this.checked)"><i></i></label></div>
      </section>
      <section class="card mb"><h3 class="mb-s">Senha</h3><form class="col" id="ms-f"><label class="f"><span>Senha atual</span><input class="inp" name="a" type="password" required autocomplete="current-password"></label><label class="f"><span>Nova senha</span><input class="inp" name="n" type="password" minlength="6" required autocomplete="new-password"></label><div><button class="btn sec">Alterar senha</button></div></form></section>
      <section class="card mb"><h3 class="mb-s">Seus direitos</h3>
        <div class="col"><button class="btn sec bloco" onclick="C.baixar()">${ic('down')} Baixar meus dados</button>
        <button class="btn sec bloco" onclick="C.pedido()">${ic('file')} Fazer uma solicitação de privacidade</button>
        <button class="btn perigo bloco" onclick="C.encerrar()">${ic('trash')} Encerrar conta e apagar dados</button></div>
        ${peds.length ? `<h4 class="mt mb-s">Suas solicitações</h4>${peds.map(p => `<div class="small mb-s"><b>${{ acesso: 'Acesso', correcao: 'Correção', exclusao: 'Exclusão', revogacao: 'Revogação' }[p.tipo]}</b> · ${N.fmtData(p.em)} · ${p.status === 'aberto' ? `em análise (até ${N.fmtData(p.prazo)})` : p.status}${p.resposta ? `<div class="muted">${esc(p.resposta)}</div>` : ''}</div>`).join('')}` : ''}
      </section>`;
  };
  function ligarDados() {
    const f = $('#md-f'); if (!f) return;
    UI.mascaraFone($('[name=whatsapp]', f));
    f.onsubmit = e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(f).entries()); v.whatsapp = N.soDigitos(v.whatsapp); v.email = v.email.trim().toLowerCase(); v.nome = v.nome.trim();
      if (v.whatsapp.length < 10) return toast('WhatsApp com DDD, por favor.', 'erro');
      const db = D(); const c = eu(db);
      if (db.clientes.some(x => x.id !== c.id && !x.anonimizada && (x.whatsapp === v.whatsapp || x.email === v.email))) return toast('Esse WhatsApp ou e-mail já está em outra conta.', 'erro');
      const mud = ['nome', 'whatsapp', 'email'].filter(k => c[k] !== v[k]); if (!mud.length) return toast('Nada para alterar.');
      Object.assign(c, v); N.logLGPD(db, 'cliente', 'Dados corrigidos pela titular', `${c.nome}: ${mud.join(', ')}`); N.save(db); toast('Dados corrigidos.'); rerender();
    };
    $('#ms-f').onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target).entries()); const db = D(); const c = eu(db); if (c.senhaHash !== N.hash(v.a)) return toast('Senha atual incorreta.', 'erro'); c.senhaHash = N.hash(v.n); N.save(db); toast('Senha alterada.'); e.target.reset(); };
  }
  C.consent = (k, v) => {
    const db = D(); const c = eu(db); const em = N.isoAgora(); c.consent[k] = v; c.consent[k + 'Em'] = v ? em : null;
    const doc = k === 'fotos' ? 'Consentimento de fotos' : 'Mensagens de marketing';
    if (v) db.lgpd.aceites.push({ id: N.uid('a'), clienteId: c.id, doc, versao: '—', em, origem: 'app' });
    else db.lgpd.aceites.forEach(a => { if (a.clienteId === c.id && a.doc === doc) a.revogado = em; });
    N.logLGPD(db, 'cliente', v ? 'Consentimento dado' : 'Consentimento revogado', `${c.nome}: ${doc}`); N.save(db); toast(v ? 'Autorização registrada.' : 'Autorização revogada.'); rerender();
  };
  C.baixar = () => { const db = D(); const c = eu(db); N.baixar('meus-dados.json', JSON.stringify(N.exportarDadosCliente(db, c.id), null, 2), 'application/json'); N.logLGPD(db, 'cliente', 'Titular baixou seus dados', c.nome); N.save(db); toast('Arquivo baixado.'); };
  C.pedido = () => {
    const m = modal(`<form class="col" id="pd-f"><label class="f"><span>Tipo</span><select class="inp" name="tipo"><option value="acesso">Confirmar/acessar meus dados</option><option value="correcao">Corrigir dados da ficha</option><option value="revogacao">Revogar um consentimento</option><option value="exclusao">Excluir meus dados</option></select></label>
      <label class="f"><span>Detalhes</span><textarea class="inp" name="detalhe" required placeholder="Conte o que você precisa"></textarea></label>
      <p class="tiny soft">Respondemos em até 15 dias.</p><div class="acoes"><button class="btn">Enviar solicitação</button></div></form>`, { titulo: 'Solicitação de privacidade' });
    $('#pd-f', m).onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target).entries()); const db = D(); const c = eu(db); db.lgpd.pedidos.push({ id: N.uid('p'), clienteId: c.id, tipo: v.tipo, detalhe: v.detalhe.trim(), em: N.isoAgora(), prazo: N.addDias(N.hoje(), 15), status: 'aberto', resposta: '' }); N.logLGPD(db, 'cliente', 'Pedido de titular recebido', `${c.nome}: ${v.tipo}`); N.notificar(db, 'dona', 'Pedido de privacidade (LGPD)', `${c.nome} — prazo de 15 dias.`); N.save(db); m.fechar(); toast('Solicitação enviada.'); setTimeout(rerender, 200); };
  };
  C.encerrar = () => {
    const m = modal(`<p class="mb">Isso vai <b>apagar seus dados pessoais</b>: nome, contatos, senha, ficha técnica, fotos e avaliações. Seus horários futuros serão cancelados.</p>
      <p class="small muted mb">Por obrigação legal, mantemos apenas os registros financeiros dos atendimentos já realizados, <b>sem nenhum dado que identifique você</b>.</p>
      <form class="col" id="ec-f"><label class="f"><span>Confirme sua senha</span><input class="inp" type="password" name="s" required autocomplete="current-password"></label>
      <label class="chk"><input type="checkbox" name="ok" required> <span>Entendo que essa ação não pode ser desfeita.</span></label>
      <div class="acoes"><button type="button" class="btn sec" data-fechar>Voltar</button><button class="btn perigo">Apagar minha conta</button></div></form>`, { titulo: 'Encerrar conta' });
    $('#ec-f', m).onsubmit = async e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target).entries());
      await N.comTrava(db => {
        const c = eu(db); if (!c || c.senhaHash !== N.hash(v.s)) { toast('Senha incorreta.', 'erro'); return; }
        const id = c.id; db.lgpd.pedidos.push({ id: N.uid('p'), clienteId: id, tipo: 'exclusao', detalhe: 'Encerramento de conta pelo app', em: N.isoAgora(), prazo: N.hoje(), status: 'atendido', resposta: 'Dados pessoais apagados automaticamente; financeiro anonimizado.', atendidoEm: N.isoAgora() });
        N.anonimizarCliente(db, id, 'cliente'); N.notificar(db, 'dona', 'Conta encerrada (LGPD)', 'Uma cliente encerrou a conta e teve os dados apagados.'); N.save(db);
        setSessao(null); m.fechar(); toast('Sua conta foi encerrada e seus dados apagados.'); location.hash = '#/';
      });
    };
  };

  /* ============================ Inicialização ============================ */
  const vistos = new Set(D().notificacoes.map(n => n.id));
  N.onChange(() => {
    const db = D(); const c = eu(db);
    const novas = c ? db.notificacoes.filter(n => n.para === c.id && !vistos.has(n.id)) : [];
    db.notificacoes.forEach(n => vistos.add(n.id));
    novas.forEach(n => { toast(n.titulo + ' — ' + n.texto); UI.notificarSistema(n.titulo, n.texto, '/cliente/#/horarios'); });
    const ativo = document.activeElement;
    if (!document.querySelector('.modal-bg') && !(ativo && /INPUT|TEXTAREA|SELECT/.test(ativo.tagName))) rerender();
  });
  const renderBase = render;
  addEventListener('hashchange', () => { UI.fecharModais(); const r = rota().r; if (r !== 'agendar' && r !== 'sucesso' && S.ag && S.ag.remarcarId) S.ag = null; renderBase(); scrollTo(0, 0); });
  UI.tema(); UI.pwa();
  setInterval(() => N.processarLembretes(D()), 60000);
  render();
})();
