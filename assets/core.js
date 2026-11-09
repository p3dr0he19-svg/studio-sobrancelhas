/* =====================================================================
   Núcleo compartilhado — Painel da dona (/) e App da cliente (/cliente)
   "Banco de dados" do protótipo: localStorage (mesma origem = mesmo banco).
   Em produção, trocar por API + Postgres (ver README: reserva atômica).
   Desenvolvido por Nexosys
   ===================================================================== */
(function (g) {
  'use strict';
  const KEY = 'nexosys_studio_db_v1';
  const TZ = 'America/Sao_Paulo';

  /* ---------------- Utilidades de data (fuso America/Sao_Paulo) ---------------- */
  const pad = n => String(n).padStart(2, '0');
  function agora() {
    const p = {};
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(x => (p[x.type] = x.value));
    return { data: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute };
  }
  const hoje = () => agora().data;
  const dUTC = d => new Date(d + 'T12:00:00Z');
  const addDias = (d, n) => { const x = dUTC(d); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const diaSemana = d => dUTC(d).getUTCDay();
  const diffDias = (a, b) => Math.round((dUTC(b) - dUTC(a)) / 864e5); // b - a
  const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const mh = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const abs = (data, hora) => Math.round(dUTC(data) / 6e4) + (typeof hora === 'number' ? hora : hm(hora)); // minutos absolutos
  const absAgora = () => { const a = agora(); return abs(a.data, a.min); };
  const inicioSemana = d => addDias(d, -diaSemana(d)); // domingo
  const fmtData = d => { if (!d) return ''; const [y, m, dd] = d.slice(0, 10).split('-'); return `${dd}/${m}/${y}`; };
  const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const DIAS_C = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const fmtDataLonga = d => { const x = dUTC(d); const s = `${DIAS[x.getUTCDay()]}, ${x.getUTCDate()} de ${MESES[x.getUTCMonth()]}`; return s[0].toUpperCase() + s.slice(1); };
  const fmtDataHora = iso => {
    if (!iso) return '';
    return new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  };
  const fmtMoeda = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
  const fmtDur = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? pad(m % 60) : ''}`;
  const fmtFone = f => { const d = String(f || '').replace(/\D/g, ''); return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : f || ''; };
  const soDigitos = s => String(s || '').replace(/\D/g, '');
  const uid = p => (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const isoAgora = () => new Date().toISOString();

  /* Hash de senha do protótipo (síncrono). Em produção: Argon2/bcrypt no servidor. */
  function hash(s) {
    let h1 = 0xdeadbeef ^ 7, h2 = 0x41c6ce57 ^ 7; s = 'nexosys:' + s;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }

  /* ---------------- TOTP (RFC 6238) para verificação em duas etapas ---------------- */
  const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function totpSegredo() { const b = crypto.getRandomValues(new Uint8Array(20)); let bits = '', out = ''; b.forEach(x => (bits += x.toString(2).padStart(8, '0'))); for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)]; return out; }
  function b32bytes(s) { let bits = ''; s.replace(/=+$/, '').toUpperCase().split('').forEach(c => { const v = B32.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, '0'); }); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return new Uint8Array(out); }
  async function totpCodigo(segredo, passo) {
    const key = await crypto.subtle.importKey('raw', b32bytes(segredo), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const msg = new ArrayBuffer(8); const v = new DataView(msg); v.setUint32(4, passo >>> 0); v.setUint32(0, Math.floor(passo / 2 ** 32));
    const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg)); const o = h[19] & 15;
    const n = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6;
    return String(n).padStart(6, '0');
  }
  async function totpVerificar(segredo, codigo) {
    const p = Math.floor(Date.now() / 30000); codigo = soDigitos(codigo);
    for (const d of [-1, 0, 1]) if (await totpCodigo(segredo, p + d) === codigo) return true;
    return false;
  }

  /* ---------------- Textos legais ---------------- */
  const TERMOS_TXT = `1. Sobre o serviço
Este aplicativo permite que você consulte serviços, valores e solicite horários no studio. O agendamento só é garantido quando aparece como "Confirmado".

2. Cadastro
Você se compromete a informar dados verdadeiros (nome, WhatsApp e e-mail) e a manter sua senha em sigilo. A conta é pessoal e intransferível.

3. Agendamentos, cancelamentos e remarcações
• Os horários respeitam antecedência mínima e janela máxima definidas pelo studio.
• Cancelamentos e remarcações pelo aplicativo seguem os prazos informados na tela do seu horário.
• Faltas sem aviso podem limitar novos agendamentos online.
• Cada cliente pode ter um número limitado de agendamentos por dia.

4. Valores e pagamento
Os preços exibidos são de referência e podem ser ajustados após avaliação presencial (por exemplo, correções de trabalhos anteriores). O pagamento é feito no studio por Pix, dinheiro ou cartão.

5. Avaliações
Você pode avaliar seu atendimento. Comentários ofensivos ou com dados de terceiros podem ser removidos.

6. Responsabilidades
Informe alergias, sensibilidades, uso de medicamentos, gestação ou procedimentos recentes antes do atendimento. Isso é essencial para sua segurança.

7. Alterações destes termos
Quando estes termos mudarem, você verá o aviso "Termos atualizados" e precisará ler e aceitar a nova versão para continuar usando o agendamento online.

8. Contato
Dúvidas: fale com o studio pelo WhatsApp informado no aplicativo.`;

  const PRIV_TXT = `1. Quem trata seus dados
O studio é o controlador dos seus dados pessoais. A plataforma é fornecida pela Nexosys, que atua como operadora, seguindo as instruções do studio.

2. Quais dados coletamos
• Cadastro: nome, WhatsApp, e-mail e senha (armazenada de forma protegida).
• Agendamentos: serviços, datas, horários, status e forma de pagamento.
• Ficha de atendimento (anamnese): alergias, sensibilidades e observações técnicas. São dados pessoais sensíveis (dados de saúde) e ficam visíveis somente para a profissional responsável.
• Fotos de antes/depois: somente com seu consentimento específico e separado.

3. Para que usamos
Para agendar e lembrar seus horários, realizar o atendimento com segurança, emitir registros financeiros e, se você autorizar, enviar novidades e promoções.

4. Bases legais (LGPD — Lei 13.709/2018)
Execução de contrato (agendamentos), cumprimento de obrigação legal (registros financeiros), tutela da saúde e consentimento (anamnese, fotos e marketing).

5. Compartilhamento
Não vendemos seus dados. Lembretes podem ser enviados pelo WhatsApp. Os dados ficam em servidores com controle de acesso.

6. Por quanto tempo guardamos
Enquanto sua conta estiver ativa. Ao encerrar a conta, apagamos seus dados pessoais e mantemos apenas registros financeiros anonimizados exigidos por lei.

7. Seus direitos
Você pode, a qualquer momento: confirmar e acessar seus dados, corrigi-los, baixar uma cópia, revogar consentimentos e pedir a exclusão. Use "Meus dados" no aplicativo. Respondemos em até 15 dias.

8. Segurança
Usamos senha protegida, conexão criptografada e acesso restrito à profissional do studio.`;

  /* ---------------- Dados de exemplo ---------------- */
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function seed() {
    const r = rng(20261109); const pick = a => a[Math.floor(r() * a.length)];
    const H = hoje();
    const servicos = [
      { id: 's1', nome: 'Design de sobrancelhas', duracao: 45, preco: 60, descricao: 'Mapeamento do rosto e design personalizado com pinça e linha.', visivel: true, retornoMin: 15, retornoMax: 20, icone: 'brow' },
      { id: 's2', nome: 'Design com henna', duracao: 60, preco: 85, descricao: 'Design + henna para preencher falhas e definir o formato.', visivel: true, retornoMin: 15, retornoMax: 20, icone: 'drop' },
      { id: 's3', nome: 'Brow lamination', duracao: 60, preco: 160, descricao: 'Fios alinhados, efeito penteado e volume por semanas.', visivel: true, retornoMin: 45, retornoMax: 60, icone: 'wave' },
      { id: 's4', nome: 'Micropigmentação fio a fio', duracao: 150, preco: 690, descricao: 'Fios desenhados um a um, efeito natural. Retoque incluso.', visivel: true, retornoMin: 30, retornoMax: 40, icone: 'pen' },
      { id: 's5', nome: 'Retoque de micropigmentação', duracao: 90, preco: 0, descricao: 'Retoque da micropigmentação (incluso no procedimento).', visivel: true, retornoMin: 300, retornoMax: 365, icone: 'spark' },
      { id: 's6', nome: 'Lash lifting', duracao: 60, preco: 140, descricao: 'Curvatura natural dos cílios, sem extensão.', visivel: true, retornoMin: 45, retornoMax: 60, icone: 'eye' },
      { id: 's7', nome: 'Depilação de buço', duracao: 15, preco: 25, descricao: 'Remoção delicada com linha ou cera.', visivel: true, retornoMin: 15, retornoMax: 20, icone: 'leaf' },
      { id: 's8', nome: 'Coloração de sobrancelhas', duracao: 30, preco: 45, descricao: 'Tintura para realçar fios claros ou grisalhos.', visivel: true, retornoMin: 20, retornoMax: 30, icone: 'drop' }
    ];
    const nomes = ['Mariana Alves', 'Juliana Costa', 'Camila Rocha', 'Fernanda Lima', 'Beatriz Souza', 'Larissa Martins', 'Patrícia Gomes', 'Amanda Ribeiro', 'Gabriela Ferreira', 'Letícia Carvalho', 'Bruna Oliveira', 'Renata Dias', 'Carolina Mendes', 'Isabela Nunes', 'Vanessa Teixeira', 'Aline Barbosa', 'Débora Pires', 'Natália Freitas', 'Tatiane Moraes', 'Sofia Castro'];
    const consentEm = addDias(H, -120) + 'T13:00:00.000Z';
    const clientes = nomes.map((nome, i) => {
      const prim = nome.split(' ')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      return {
        id: 'c' + (i + 1), nome, whatsapp: '119' + String(88880001 + i * 137).slice(0, 8), email: `${prim}@exemplo.com`,
        senhaHash: hash('demo123'), criadoEm: consentEm, nascimento: '',
        consent: { termosVersao: i === 3 ? '1.1' : '1.2', privVersao: i === 3 ? '1.1' : '1.2', termosEm: consentEm, fotos: i % 3 === 0, fotosEm: i % 3 === 0 ? consentEm : null, marketing: i % 2 === 0, marketingEm: i % 2 === 0 ? consentEm : null },
        anamnese: {
          alergias: pick(['Nenhuma conhecida', 'Nenhuma conhecida', 'Alergia a PPD (evitar henna com PPD)', 'Sensível a cera quente', 'Nenhuma conhecida']),
          sensibilidade: pick(['Pele normal', 'Pele sensível, avermelha fácil', 'Pele oleosa', 'Pele normal']),
          formato: pick(['Arqueado suave', 'Reto natural', 'Ascendente', 'Arqueado suave', 'Natural, sem muito arco']),
          tecnica: pick(['Pinça + linha', 'Henna castanho médio', 'Linha', 'Pinça', 'Henna castanho claro']),
          medicamentos: '', obs: pick(['', '', 'Prefere horários pela manhã', 'Gosta de conversar pouco', 'Vem com a filha às vezes'])
        },
        fotos: [], anonimizada: false
      };
    });
    clientes[0].whatsapp = '11988880001'; clientes[0].email = 'mariana@exemplo.com';

    const horario = {
      0: { aberto: false, ini: '09:00', fim: '18:00', pausaIni: '', pausaFim: '' },
      1: { aberto: true, ini: '09:00', fim: '19:00', pausaIni: '12:00', pausaFim: '13:00' },
      2: { aberto: true, ini: '09:00', fim: '19:00', pausaIni: '12:00', pausaFim: '13:00' },
      3: { aberto: true, ini: '09:00', fim: '19:00', pausaIni: '12:00', pausaFim: '13:00' },
      4: { aberto: true, ini: '09:00', fim: '19:00', pausaIni: '12:00', pausaFim: '13:00' },
      5: { aberto: true, ini: '09:00', fim: '19:00', pausaIni: '12:00', pausaFim: '13:00' },
      6: { aberto: true, ini: '09:00', fim: '15:00', pausaIni: '', pausaFim: '' }
    };

    const db = {
      schema: 1,
      studio: { nome: '[NOME DO STUDIO]', slogan: 'Sobrancelhas que valorizam a sua beleza natural.', endereco: 'Rua das Flores, 123 — Sala 4, Jardim Paulista, São Paulo/SP', whatsapp: '11999990000', instagram: '@nomedostudio', logo: null },
      horario,
      regras: { online: true, antecedenciaMinH: 2, janelaDias: 45, cancelarH: 4, remarcarH: 6, gradeMin: 15, confirmacao: 'pendente', limiteDia: 2, lembrete24: true, lembrete2: true, lembreteWhats: true, lembretePush: true, sumidasDias: 45 },
      servicos, clientes, agendamentos: [], bloqueios: [], despesas: [], avaliacoes: [], notificacoes: [], filaWhats: [],
      termos: { versao: '1.2', data: '2026-10-01', texto: TERMOS_TXT },
      privacidade: { versao: '1.2', data: '2026-10-01', texto: PRIV_TXT },
      lgpd: { aceites: [], pedidos: [], log: [] },
      seguranca: { usuario: 'dona', senhaHash: hash('demo123'), totpAtivo: false, totpSegredo: '' }
    };

    // Aceites registrados
    clientes.forEach(c => {
      db.lgpd.aceites.push({ id: uid('a'), clienteId: c.id, doc: 'Termos de Uso', versao: c.consent.termosVersao, em: consentEm, origem: 'app' });
      db.lgpd.aceites.push({ id: uid('a'), clienteId: c.id, doc: 'Política de Privacidade', versao: c.consent.privVersao, em: consentEm, origem: 'app' });
      if (c.consent.fotos) db.lgpd.aceites.push({ id: uid('a'), clienteId: c.id, doc: 'Consentimento de fotos', versao: '—', em: consentEm, origem: 'app' });
      if (c.consent.marketing) db.lgpd.aceites.push({ id: uid('a'), clienteId: c.id, doc: 'Mensagens de marketing', versao: '—', em: consentEm, origem: 'app' });
    });

    const PAG = ['pix', 'pix', 'pix', 'dinheiro', 'debito', 'credito', 'credito'];
    const pesoServ = ['s1', 's1', 's1', 's1', 's2', 's2', 's2', 's3', 's3', 's6', 's6', 's7', 's8', 's4'];
    const sumidas = new Set(['c6', 'c9', 'c13', 'c17', 'c20']);
    const ocupado = {}; // data -> [{i,f}]
    function tenta(data, dur) {
      const h = horario[diaSemana(data)]; if (!h.aberto) return null;
      const ini = hm(h.ini), fim = hm(h.fim), pi = h.pausaIni ? hm(h.pausaIni) : -1, pf = h.pausaFim ? hm(h.pausaFim) : -1;
      for (let k = 0; k < 12; k++) {
        const t = ini + Math.floor(r() * ((fim - ini - dur) / 15 + 1)) * 15;
        if (t + dur > fim) continue;
        if (pi >= 0 && t < pf && t + dur > pi) continue;
        const oc = ocupado[data] || (ocupado[data] = []);
        if (oc.some(o => t < o.f && t + dur > o.i)) continue;
        oc.push({ i: t, f: t + dur }); return t;
      }
      return null;
    }
    function cria(data, clienteId, sids, status, origem) {
      const dur = sids.reduce((s, id) => s + servicos.find(x => x.id === id).duracao, 0);
      const t = tenta(data, dur); if (t == null) return null;
      const preco = sids.reduce((s, id) => s + servicos.find(x => x.id === id).preco, 0);
      const a = { id: uid('ag'), clienteId, servicoIds: sids, data, hora: mh(t), duracao: dur, preco, status, pagamento: status === 'concluido' ? pick(PAG) : '', origem: origem || 'painel', criadoEm: addDias(data, -Math.ceil(r() * 6)) + 'T14:00:00.000Z', obs: '' };
      db.agendamentos.push(a); return a;
    }
    const ativas = clientes.filter(c => !sumidas.has(c.id));
    const now = agora();
    for (let d = -95; d <= 0; d++) {
      const data = addDias(H, d); if (!horario[diaSemana(data)].aberto) continue;
      const n = d === 0 ? 4 : 2 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const idSum = pick([...sumidas]);
        let c = d < -60 && r() < 0.35 ? clientes.find(x => x.id === idSum) : pick(ativas);
        if (c.id === 'c1' && d > -25) c = ativas[1 + Math.floor(r() * (ativas.length - 1))];
        let sids = [pick(pesoServ)]; if (r() < 0.25 && sids[0] !== 's4') sids.push(pick(['s7', 's8', 's6']));
        sids = [...new Set(sids)];
        const a = cria(data, c.id, sids, 'concluido');
        if (!a) continue;
        if (d === 0 && hm(a.hora) > now.min) { a.status = 'confirmado'; a.pagamento = ''; }
        else if (r() < 0.06) { a.status = 'faltou'; a.pagamento = ''; }
        else if (r() < 0.05) { a.status = 'cancelado'; a.pagamento = ''; }
      }
    }
    // Mariana (cliente demo): design há 18 dias e sem avaliação
    const mPas = cria(addDias(H, -18), 'c1', ['s2'], 'concluido') || cria(addDias(H, -19), 'c1', ['s2'], 'concluido');
    // Próximos dias
    for (let d = 1; d <= 9; d++) {
      const data = addDias(H, d); if (!horario[diaSemana(data)].aberto) continue;
      const n = d <= 6 ? 3 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2);
      for (let k = 0; k < n; k++) {
        const c = pick(ativas.slice(1)); const sids = [pick(pesoServ)];
        cria(data, c.id, sids, r() < 0.25 ? 'pendente' : 'confirmado', r() < 0.6 ? 'app' : 'painel');
      }
    }
    // Mariana (demo) fica sem horário futuro: o app mostra "Já está na hora da sua manutenção".

    // Bloqueios
    let folga = addDias(H, 8); while (!horario[diaSemana(folga)].aberto) folga = addDias(folga, 1);
    db.bloqueios.push({ id: uid('b'), tipo: 'folga', motivo: 'Curso de atualização', dataIni: folga, dataFim: folga, ini: null, fim: null });
    db.agendamentos = db.agendamentos.filter(a => a.data !== folga);
    db.bloqueios.push({ id: uid('b'), tipo: 'ferias', motivo: 'Férias', dataIni: addDias(H, 35), dataFim: addDias(H, 41), ini: null, fim: null });
    let dent = addDias(H, 2); while (!horario[diaSemana(dent)].aberto) dent = addDias(dent, 1);
    if (!(ocupado[dent] || []).some(o => o.i < hm('17:00') && o.f > hm('16:00'))) db.bloqueios.push({ id: uid('b'), tipo: 'outro', motivo: 'Dentista', dataIni: dent, dataFim: dent, ini: '16:00', fim: '17:00' });

    // Avaliações
    const coments = ['Amei o resultado, ficou super natural!', 'Atendimento impecável, ambiente lindo e cheiroso.', 'Melhor design que já fiz. Voltarei sempre!', 'Muito cuidadosa e atenciosa. Recomendo demais.', 'Ficou exatamente como eu queria 💕', 'Pontual e caprichosa. Só achei a henna um pouco escura no primeiro dia.', 'Profissional maravilhosa, explicou tudo.', '', 'Me senti super à vontade. Obrigada!', 'Brow lamination perfeito, durou bastante.'];
    db.agendamentos.filter(a => a.status === 'concluido' && a.clienteId !== 'c1' && diffDias(a.data, H) < 60).forEach(a => {
      if (r() < 0.32) db.avaliacoes.push({ id: uid('av'), agendamentoId: a.id, clienteId: a.clienteId, nota: r() < 0.8 ? 5 : 4, comentario: pick(coments), data: addDias(a.data, 1) + 'T20:00:00.000Z' });
    });
    if (mPas) mPas.avaliado = false;

    // Despesas (3 meses)
    for (let m = 0; m < 3; m++) {
      const base = addDias(H, -30 * m);
      const ym = base.slice(0, 7);
      [['Aluguel da sala', 'Aluguel', 1200, 5], ['Henna, pigmentos e linhas', 'Produtos', 380 + Math.round(r() * 200), 8], ['Energia', 'Contas', 140 + Math.round(r() * 40), 10], ['Internet e telefone', 'Contas', 120, 12], ['Impulsionamento Instagram', 'Marketing', 150, 15], ['Descartáveis e higienização', 'Produtos', 90 + Math.round(r() * 60), 20]]
        .forEach(([descricao, categoria, valor, dia]) => { const data = `${ym}-${pad(dia)}`; if (data <= H) db.despesas.push({ id: uid('d'), data, descricao, categoria, valor }); });
    }

    // LGPD: pedidos e histórico
    db.lgpd.pedidos.push({ id: uid('p'), clienteId: 'c5', tipo: 'correcao', detalhe: 'Meu e-mail mudou para beatriz.souza@exemplo.com', em: addDias(H, -3) + 'T15:20:00.000Z', prazo: addDias(H, 12), status: 'aberto', resposta: '' });
    db.lgpd.pedidos.push({ id: uid('p'), clienteId: 'c12', tipo: 'acesso', detalhe: 'Quero uma cópia dos meus dados.', em: addDias(H, -20) + 'T11:00:00.000Z', prazo: addDias(H, -5), status: 'atendido', resposta: 'Cópia enviada por e-mail em PDF.', atendidoEm: addDias(H, -18) + 'T10:00:00.000Z' });
    db.lgpd.log.push({ id: uid('l'), em: addDias(H, -40) + 'T12:00:00.000Z', quem: 'dona', acao: 'Termos publicados', detalhe: 'Termos de Uso e Política de Privacidade v1.2' });
    db.lgpd.log.push({ id: uid('l'), em: addDias(H, -18) + 'T10:00:00.000Z', quem: 'dona', acao: 'Pedido atendido', detalhe: 'Acesso aos dados — Renata Dias' });

    db.notificacoes.push({ id: uid('n'), para: 'dona', titulo: 'Bem-vinda ao seu painel', texto: 'Os dados de demonstração já estão carregados.', em: isoAgora(), lida: false });
    db.agendamentos.sort((a, b) => abs(a.data, a.hora) - abs(b.data, b.hora));
    return db;
  }

  /* ---------------- Persistência ---------------- */
  let cache = null;
  function load(fresh) {
    if (cache && !fresh) return cache;
    try { const raw = localStorage.getItem(KEY); if (raw) { cache = JSON.parse(raw); return cache; } } catch (e) { /* segue */ }
    cache = seed(); persist(cache); return cache;
  }
  function persist(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { alert('Não foi possível salvar (armazenamento cheio?). Remova fotos grandes.'); } }
  const ouvintes = [];
  function save(db) { cache = db || cache; persist(cache); ouvintes.forEach(f => f()); }
  function onChange(f) { ouvintes.push(f); }
  g.addEventListener('storage', e => { if (e.key === KEY) { cache = null; load(); ouvintes.forEach(f => f()); } });
  function reset() { localStorage.removeItem(KEY); cache = null; return load(); }

  /* Trava entre abas (Web Locks). Garante que leitura+verificação+gravação sejam atômicas. */
  async function comTrava(fn) {
    if (navigator.locks && navigator.locks.request) return navigator.locks.request('nexosys-agenda', async () => { cache = null; const db = load(true); return fn(db); });
    cache = null; return fn(load(true));
  }

  /* ---------------- Regras de agenda ---------------- */
  const ATIVOS = ['pendente', 'confirmado', 'concluido'];
  const servico = (db, id) => db.servicos.find(s => s.id === id);
  const cliente = (db, id) => db.clientes.find(c => c.id === id);
  const nomesServ = (db, ids) => ids.map(i => (servico(db, i) || { nome: 'Serviço removido' }).nome).join(' + ');
  const somaServ = (db, ids) => ids.reduce((acc, i) => { const s = servico(db, i); if (s) { acc.duracao += s.duracao; acc.preco += s.preco; } return acc; }, { duracao: 0, preco: 0 });

  function bloqueiosDoDia(db, data) { return db.bloqueios.filter(b => data >= b.dataIni && data <= b.dataFim); }
  function diaFechado(db, data) { const h = db.horario[diaSemana(data)]; return !h || !h.aberto || bloqueiosDoDia(db, data).some(b => !b.ini); }

  function ocupacoes(db, data, ignorarId) {
    const oc = db.agendamentos.filter(a => a.data === data && ATIVOS.includes(a.status) && a.id !== ignorarId).map(a => ({ i: hm(a.hora), f: hm(a.hora) + a.duracao }));
    const h = db.horario[diaSemana(data)];
    if (h && h.pausaIni && h.pausaFim) oc.push({ i: hm(h.pausaIni), f: hm(h.pausaFim) });
    bloqueiosDoDia(db, data).forEach(b => oc.push(b.ini ? { i: hm(b.ini), f: hm(b.fim) } : { i: 0, f: 1440 }));
    return oc;
  }

  /* Horários livres reais. paraCliente aplica antecedência mínima e janela máxima. */
  function horariosLivres(db, data, duracao, opt) {
    opt = opt || {};
    const h = db.horario[diaSemana(data)];
    if (!h || !h.aberto || !duracao) return [];
    const R = db.regras, ini = hm(h.ini), fim = hm(h.fim), g = R.gradeMin || 15;
    const oc = ocupacoes(db, data, opt.ignorarId);
    const minAbs = opt.paraCliente ? absAgora() + R.antecedenciaMinH * 60 : absAgora();
    if (opt.paraCliente && diffDias(hoje(), data) > R.janelaDias) return [];
    const out = [];
    for (let t = ini; t + duracao <= fim; t += g) {
      if (oc.some(o => t < o.f && t + duracao > o.i)) continue;
      if (!opt.permitirPassado && abs(data, t) < minAbs) continue;
      out.push(mh(t));
    }
    return out;
  }

  function conflito(db, data, hora, duracao, ignorarId) {
    const t = hm(hora); return ocupacoes(db, data, ignorarId).some(o => t < o.f && t + duracao > o.i);
  }

  /* Reserva atômica: dentro da trava, relê o banco, revalida e grava. */
  async function reservar(dados, opt) {
    opt = opt || {};
    return comTrava(db => {
      const { duracao, preco } = somaServ(db, dados.servicoIds);
      const dur = dados.duracao || duracao;
      if (!dur) throw new Error('Escolha ao menos um serviço.');
      if (conflito(db, dados.data, dados.hora, dur, opt.ignorarId)) throw new Error('Esse horário acabou de ser reservado ou está bloqueado. Escolha outro, por favor.');
      const h = db.horario[diaSemana(dados.data)];
      if (!opt.encaixe && (!h.aberto || hm(dados.hora) < hm(h.ini) || hm(dados.hora) + dur > hm(h.fim))) throw new Error('Fora do horário de funcionamento.');
      if (opt.origem === 'app') {
        const R = db.regras;
        if (!R.online) throw new Error('O agendamento online está pausado no momento. Fale com o studio pelo WhatsApp.');
        if (abs(dados.data, dados.hora) < absAgora() + R.antecedenciaMinH * 60) throw new Error(`Agende com pelo menos ${R.antecedenciaMinH} h de antecedência.`);
        if (diffDias(hoje(), dados.data) > R.janelaDias) throw new Error(`Agendamentos até ${R.janelaDias} dias à frente.`);
        const noDia = db.agendamentos.filter(a => a.clienteId === dados.clienteId && a.data === dados.data && ['pendente', 'confirmado'].includes(a.status) && a.id !== opt.ignorarId).length;
        if (noDia >= R.limiteDia) throw new Error(`Limite de ${R.limiteDia} agendamentos por dia atingido.`);
      }
      let ag;
      if (opt.ignorarId) {
        ag = db.agendamentos.find(a => a.id === opt.ignorarId);
        const antes = `${fmtData(ag.data)} ${ag.hora}`;
        Object.assign(ag, { data: dados.data, hora: dados.hora, lembretesEnviados: {} });
        if (opt.origem === 'app' && db.regras.confirmacao === 'pendente') ag.status = 'pendente';
        ag.historico = (ag.historico || []).concat({ em: isoAgora(), acao: `Remarcado de ${antes} para ${fmtData(ag.data)} ${ag.hora}`, por: opt.origem || 'painel' });
      } else {
        ag = Object.assign({ id: uid('ag'), duracao: dur, preco: dados.preco != null ? dados.preco : preco, status: 'confirmado', pagamento: '', origem: opt.origem || 'painel', criadoEm: isoAgora(), obs: '', lembretesEnviados: {} }, dados, { duracao: dur });
        if (opt.origem === 'app') ag.status = db.regras.confirmacao === 'auto' ? 'confirmado' : 'pendente';
        db.agendamentos.push(ag);
      }
      db.agendamentos.sort((a, b) => abs(a.data, a.hora) - abs(b.data, b.hora));
      if (opt.origem === 'app') notificar(db, 'dona', opt.ignorarId ? 'Horário remarcado' : (ag.status === 'pendente' ? 'Novo pedido de agendamento' : 'Novo agendamento'), `${(cliente(db, ag.clienteId) || {}).nome} — ${nomesServ(db, ag.servicoIds)} em ${fmtData(ag.data)} às ${ag.hora}`);
      save(db);
      return Object.assign({}, ag);
    });
  }

  function notificar(db, para, titulo, texto) {
    db.notificacoes.unshift({ id: uid('n'), para, titulo, texto, em: isoAgora(), lida: false });
    db.notificacoes = db.notificacoes.slice(0, 200);
    if (g.NexoNotificar) g.NexoNotificar(para, titulo, texto);
  }

  function logLGPD(db, quem, acao, detalhe) { db.lgpd.log.unshift({ id: uid('l'), em: isoAgora(), quem, acao, detalhe }); }

  /* Prazos da cliente */
  function podeCancelar(db, a) { return ['pendente', 'confirmado'].includes(a.status) && abs(a.data, a.hora) - absAgora() >= db.regras.cancelarH * 60; }
  function podeRemarcar(db, a) { return ['pendente', 'confirmado'].includes(a.status) && abs(a.data, a.hora) - absAgora() >= db.regras.remarcarH * 60; }

  /* Lembretes automáticos 24 h / 2 h (executados por quem estiver com o app aberto; em produção: job no servidor) */
  function processarLembretes(db) {
    const R = db.regras; const now = absAgora(); let mudou = false;
    db.agendamentos.forEach(a => {
      if (a.status !== 'confirmado') return;
      const falta = abs(a.data, a.hora) - now; a.lembretesEnviados = a.lembretesEnviados || {};
      const c = cliente(db, a.clienteId); if (!c || c.anonimizada) return;
      [['h24', R.lembrete24, 24 * 60, 'amanhã'], ['h2', R.lembrete2, 120, 'daqui a pouco']].forEach(([k, on, lim, quando]) => {
        if (!on || a.lembretesEnviados[k] || falta > lim || falta < 0) return;
        a.lembretesEnviados[k] = isoAgora(); mudou = true;
        const txt = `Oi, ${c.nome.split(' ')[0]}! Lembrete do seu horário ${quando}: ${nomesServ(db, a.servicoIds)} em ${fmtData(a.data)} às ${a.hora}. ${db.studio.nome}`;
        if (R.lembretePush) notificar(db, c.id, 'Lembrete do seu horário', txt);
        if (R.lembreteWhats) db.filaWhats.unshift({ id: uid('w'), clienteId: c.id, fone: c.whatsapp, texto: txt, em: isoAgora(), enviado: false });
      });
    });
    db.filaWhats = (db.filaWhats || []).slice(0, 100);
    if (mudou) save(db);
  }

  /* Faturamento (concluídos) */
  function faturamento(db, de, ate) {
    const ags = db.agendamentos.filter(a => a.status === 'concluido' && a.data >= de && a.data <= ate);
    const total = ags.reduce((s, a) => s + (a.preco || 0), 0);
    const porPag = {}; ags.forEach(a => (porPag[a.pagamento || 'outro'] = (porPag[a.pagamento || 'outro'] || 0) + a.preco));
    return { total, qtd: ags.length, ticket: ags.length ? total / ags.length : 0, porPag, ags };
  }

  function ultimaVisita(db, cid) { const l = db.agendamentos.filter(a => a.clienteId === cid && a.status === 'concluido'); return l.length ? l[l.length - 1] : null; }
  function proximoHorario(db, cid) { const now = absAgora(); return db.agendamentos.find(a => a.clienteId === cid && ['pendente', 'confirmado'].includes(a.status) && abs(a.data, a.hora) + a.duracao > now); }
  function totalGasto(db, cid) { return db.agendamentos.filter(a => a.clienteId === cid && a.status === 'concluido').reduce((s, a) => s + a.preco, 0); }

  /* Lembrete de retoque: retorna {servico, dias, quando} se já está na hora */
  function manutencao(db, cid) {
    const u = ultimaVisita(db, cid); if (!u) return null;
    const ss = u.servicoIds.map(i => servico(db, i)).filter(Boolean).filter(s => s.retornoMin);
    if (!ss.length) return null;
    const s = ss.reduce((a, b) => (a.retornoMin <= b.retornoMin ? a : b));
    const dias = diffDias(u.data, hoje());
    return { servico: s, dias, ultima: u, naHora: dias >= s.retornoMin, atrasada: dias > s.retornoMax };
  }

  function googleAgendaURL(db, a) {
    const f = (d, m) => d.replace(/-/g, '') + 'T' + mh(m).replace(':', '') + '00';
    const ini = hm(a.hora);
    const p = new URLSearchParams({ action: 'TEMPLATE', text: `${nomesServ(db, a.servicoIds)} — ${db.studio.nome}`, dates: `${f(a.data, ini)}/${f(a.data, ini + a.duracao)}`, ctz: TZ, details: `Seu horário no ${db.studio.nome}. WhatsApp: ${fmtFone(db.studio.whatsapp)}`, location: db.studio.endereco });
    return 'https://calendar.google.com/calendar/render?' + p.toString();
  }
  const waLink = (fone, txt) => `https://wa.me/55${soDigitos(fone)}${txt ? '?text=' + encodeURIComponent(txt) : ''}`;

  /* Exclusão segura da conta: apaga dados pessoais, mantém financeiro anonimizado */
  function anonimizarCliente(db, cid, quem) {
    const c = cliente(db, cid); if (!c) return;
    const nomeAnt = c.nome;
    db.agendamentos.forEach(a => { if (a.clienteId === cid && ['pendente', 'confirmado'].includes(a.status) && abs(a.data, a.hora) > absAgora()) a.status = 'cancelado'; if (a.clienteId === cid) { a.obs = ''; a.historico = []; } });
    db.avaliacoes = db.avaliacoes.filter(v => v.clienteId !== cid);
    db.notificacoes = db.notificacoes.filter(n => n.para !== cid);
    db.filaWhats = (db.filaWhats || []).filter(w => w.clienteId !== cid);
    Object.assign(c, { nome: 'Cliente removida', whatsapp: '', email: '', senhaHash: '', nascimento: '', anamnese: {}, fotos: [], anonimizada: true, anonimizadaEm: isoAgora(), consent: {} });
    db.lgpd.aceites.forEach(x => { if (x.clienteId === cid) x.anonimizado = true; });
    logLGPD(db, quem, 'Conta encerrada e dados apagados', `${quem === 'cliente' ? 'Pedido da própria cliente' : 'Pela dona'} (${nomeAnt.split(' ')[0]} ***). Financeiro mantido anonimizado.`);
  }

  function exportarDadosCliente(db, cid) {
    const c = cliente(db, cid);
    return {
      geradoEm: isoAgora(), controlador: db.studio.nome, plataforma: 'Nexosys',
      cadastro: { nome: c.nome, whatsapp: c.whatsapp, email: c.email, criadoEm: c.criadoEm },
      consentimentos: c.consent,
      aceites: db.lgpd.aceites.filter(a => a.clienteId === cid).map(a => ({ documento: a.doc, versao: a.versao, em: a.em })),
      ficha_anamnese_dado_sensivel: c.anamnese,
      fotos: (c.fotos || []).map(f => ({ data: f.data, tipo: f.tipo, legenda: f.legenda })),
      agendamentos: db.agendamentos.filter(a => a.clienteId === cid).map(a => ({ data: fmtData(a.data), hora: a.hora, servicos: nomesServ(db, a.servicoIds), valor: a.preco, status: a.status })),
      avaliacoes: db.avaliacoes.filter(v => v.clienteId === cid).map(v => ({ nota: v.nota, comentario: v.comentario, em: v.data }))
    };
  }

  function baixar(nome, conteudo, tipo) {
    const b = new Blob([conteudo], { type: tipo || 'text/plain;charset=utf-8' });
    const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000);
  }

  const STATUS = { pendente: 'Pendente', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado', faltou: 'Faltou' };
  const PAGAMENTOS = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Cartão de débito', credito: 'Cartão de crédito', outro: 'Não informado' };

  g.Nexo = {
    TZ, KEY, load, save, reset, onChange, comTrava, uid, hash, isoAgora,
    agora, hoje, addDias, diaSemana, diffDias, hm, mh, abs, absAgora, inicioSemana,
    fmtData, fmtDataLonga, fmtDataHora, fmtMoeda, fmtDur, fmtFone, soDigitos, DIAS, DIAS_C, MESES,
    servico, cliente, nomesServ, somaServ, bloqueiosDoDia, diaFechado, horariosLivres, conflito, reservar, ATIVOS,
    podeCancelar, podeRemarcar, processarLembretes, notificar, logLGPD, faturamento, ultimaVisita, proximoHorario, totalGasto, manutencao,
    googleAgendaURL, waLink, anonimizarCliente, exportarDadosCliente, baixar, STATUS, PAGAMENTOS,
    totpSegredo, totpVerificar, totpCodigo
  };
})(window);
