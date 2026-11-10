/* API do Studio — sincroniza o "banco" dos dois apps (painel e cliente) entre aparelhos.
   Cloudflare Worker + D1. Etapa de VALIDAÇÃO: sem autenticação no servidor ainda
   (ver README → "O que falta para lançar"). Desenvolvido por Nexosys.

   Modelo: cada registro é uma linha (col, id). "_cfg" guarda as configurações
   (studio, horário, regras…). Cada gravação recebe um número de sequência (seq),
   e os apps pedem "o que mudou desde o seq X". Exclusões viram "apagado = 1". */

const ORIGENS = [
  'https://p3dr0he19-svg.github.io',
  'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174',
];
const COLS = new Set(['_cfg', 'servicos', 'clientes', 'agendamentos', 'bloqueios', 'despesas', 'avaliacoes', 'notificacoes',
  'filaWhats', 'galeria', 'lgpd.aceites', 'lgpd.pedidos', 'lgpd.log']);
const MAX_CORPO = 12 * 1024 * 1024;      // 12 MB por requisição
const MAX_LOTE = 1_500_000;
const CHAVE_OK = /^[A-Za-z0-9_]{1,60}$/;
const MAX_PARCIAIS = 40;            // instruções individuais por requisição (limite do D1 no plano gratuito: 50)              // ~1,5 MB de JSON por instrução (limite do D1: 2 MB por valor)

const ESQUEMA = [
  `CREATE TABLE IF NOT EXISTS reg (col TEXT NOT NULL, id TEXT NOT NULL, ordem REAL NOT NULL DEFAULT 0, json TEXT,
     apagado INTEGER NOT NULL DEFAULT 0, seq INTEGER NOT NULL, PRIMARY KEY (col, id))`,
  `CREATE INDEX IF NOT EXISTS reg_seq ON reg (seq)`,
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)`,
];
let esquemaOk = false;
async function garantirEsquema(env) {
  if (esquemaOk) return;
  await env.DB.batch(ESQUEMA.map(s => env.DB.prepare(s)));
  esquemaOk = true;
}

function cors(req) {
  const o = req.headers.get('Origin');
  const h = { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
  if (o && ORIGENS.includes(o)) h['Access-Control-Allow-Origin'] = o;
  return h;
}
const resp = (req, obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors(req) },
});

async function lerCorpo(req) {
  const tam = +req.headers.get('Content-Length') || 0;
  if (tam > MAX_CORPO) throw new ErroHttp(413, 'Corpo grande demais');
  const txt = await req.text();
  if (txt.length > MAX_CORPO) throw new ErroHttp(413, 'Corpo grande demais');
  try { return JSON.parse(txt); } catch { throw new ErroHttp(400, 'JSON inválido'); }
}
class ErroHttp extends Error { constructor(s, m) { super(m); this.status = s; } }

/* Valida e normaliza as operações recebidas */
function validarOps(ops) {
  if (!Array.isArray(ops)) throw new ErroHttp(400, 'ops deve ser uma lista');
  return ops.map(o => {
    if (!o || !COLS.has(o.col) || typeof o.id !== 'string' || !o.id || o.id.length > 120) throw new ErroHttp(400, 'operação inválida');
    if (o.del) return { col: o.col, id: o.id, del: 1 };
    if (typeof o.json !== 'string') throw new ErroHttp(400, 'json deve ser texto');
    const ordem = Number.isFinite(o.ordem) ? o.ordem : 0;
    const op = { col: o.col, id: o.id, ordem, json: o.json };
    // Alteração parcial: só os campos que este aparelho mudou (os outros ficam como estão no servidor)
    if (o.campos || o.rem) {
      const campos = o.campos && typeof o.campos === 'object' ? o.campos : {}; const rem = Array.isArray(o.rem) ? o.rem : [];
      const chaves = Object.keys(campos);
      if (chaves.length + rem.length > 45 || [...chaves, ...rem].some(k => !CHAVE_OK.test(k)) || chaves.some(k => typeof campos[k] !== 'string')) throw new ErroHttp(400, 'campos inválidos');
      op.campos = campos; op.rem = rem;
    }
    return op;
  });
}

/* Grava as operações numa transação: avança o seq e grava todas as linhas com o seq novo */
async function gravar(env, todas) {
  const parciais = todas.filter(o => o.campos); const ops = todas.filter(o => !o.campos);
  if (parciais.length > MAX_PARCIAIS) throw new ErroHttp(413, 'Mudanças demais de uma vez');
  const lotes = []; let atual = [], tam = 0;
  for (const o of ops) {
    const t = (o.json ? o.json.length : 0) + 100;
    if (atual.length && tam + t > MAX_LOTE) { lotes.push(atual); atual = []; tam = 0; }
    atual.push(o); tam += t;
  }
  if (atual.length) lotes.push(atual);
  if (lotes.length + parciais.length > 46) throw new ErroHttp(413, 'Mudanças demais de uma vez');
  const ins = env.DB.prepare(
    `INSERT INTO reg (col, id, ordem, json, apagado, seq)
       SELECT j.value ->> 'col', j.value ->> 'id', COALESCE(j.value ->> 'ordem', 0), j.value ->> 'json',
              COALESCE(j.value ->> 'del', 0), (SELECT v FROM meta WHERE k = 'seq')
       FROM json_each(?1) AS j WHERE true
     ON CONFLICT (col, id) DO UPDATE SET ordem = excluded.ordem, json = excluded.json, apagado = excluded.apagado, seq = excluded.seq`);
  const r = await env.DB.batch([
    env.DB.prepare(`UPDATE meta SET v = v + 1 WHERE k = 'seq'`),
    ...lotes.map(l => ins.bind(JSON.stringify(l))),
    ...parciais.map(o => instrParcial(env, o)),
    env.DB.prepare(`SELECT v FROM meta WHERE k = 'seq'`),
  ]);
  return r[r.length - 1].results[0].v;
}

/* Grava só os campos alterados por cima do que já está no servidor.
   Se o registro não existe (ou estava apagado), grava o registro completo. */
function instrParcial(env, o) {
  const chaves = Object.keys(o.campos);
  const p = k => `'$."${k}"'`; // chaves já validadas (CHAVE_OK)
  let expr = 'reg.json';
  if (chaves.length) expr = `json_set(${expr}, ${chaves.map((k, i) => `${p(k)}, json(?${i + 5})`).join(', ')})`;
  if (o.rem.length) expr = `json_remove(${expr}, ${o.rem.map(p).join(', ')})`;
  return env.DB.prepare(
    `INSERT INTO reg (col, id, ordem, json, apagado, seq) VALUES (?1, ?2, ?3, ?4, 0, (SELECT v FROM meta WHERE k = 'seq'))
     ON CONFLICT (col, id) DO UPDATE SET ordem = excluded.ordem, apagado = 0, seq = excluded.seq,
       json = CASE WHEN reg.apagado = 1 OR reg.json IS NULL THEN excluded.json ELSE ${expr} END`
  ).bind(o.col, o.id, o.ordem, o.json, ...chaves.map(k => o.campos[k]));
}

async function estado(env, desde) {
  const m = await env.DB.prepare(`SELECT v FROM meta WHERE k = 'seq'`).first();
  if (!m) return { iniciado: false, seq: 0, regs: [] };
  const { results } = desde > 0
    ? await env.DB.prepare(`SELECT col, id, ordem, json, apagado, seq FROM reg WHERE seq > ?1`).bind(desde).all()
    : await env.DB.prepare(`SELECT col, id, ordem, json, apagado, seq FROM reg WHERE apagado = 0`).all();
  const seq = results.reduce((mx, r) => Math.max(mx, r.seq), m.v);
  return { iniciado: true, seq, regs: results.map(r => r.apagado ? { col: r.col, id: r.id, del: 1 } : { col: r.col, id: r.id, ordem: r.ordem, json: r.json }) };
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
    const url = new URL(req.url);
    try {
      await garantirEsquema(env);
      if (req.method === 'GET' && url.pathname === '/api/estado') {
        return resp(req, await estado(env, Math.max(0, parseInt(url.searchParams.get('desde') || '0', 10) || 0)));
      }
      if (req.method === 'POST' && url.pathname === '/api/mudancas') {
        const corpo = await lerCorpo(req); const ops = validarOps(corpo.ops);
        if (!(await env.DB.prepare(`SELECT 1 FROM meta WHERE k = 'seq'`).first())) return resp(req, { erro: 'nao_iniciado' }, 409);
        if (!ops.length) return resp(req, { seq: (await env.DB.prepare(`SELECT v FROM meta WHERE k = 'seq'`).first()).v });
        return resp(req, { seq: await gravar(env, ops) });
      }
      if (req.method === 'POST' && url.pathname === '/api/iniciar') {
        // Primeira carga (dados de demonstração). Sem "forcar", só funciona com o banco vazio.
        const corpo = await lerCorpo(req); const ops = validarOps(corpo.ops);
        if (corpo.forcar) {
          await env.DB.batch([env.DB.prepare(`DELETE FROM reg`), env.DB.prepare(`INSERT OR REPLACE INTO meta (k, v) VALUES ('seq', 0)`)]);
        } else {
          try { await env.DB.prepare(`INSERT INTO meta (k, v) VALUES ('seq', 0)`).run(); }
          catch { return resp(req, { erro: 'ja_iniciado' }, 409); }
        }
        return resp(req, { seq: await gravar(env, ops) });
      }
      if (url.pathname === '/' || url.pathname === '/api') return resp(req, { ok: true, servico: 'studio-sobrancelhas-api' });
      return resp(req, { erro: 'nao_encontrado' }, 404);
    } catch (e) {
      return resp(req, { erro: e.message || 'erro' }, e.status || 500);
    }
  },
};
