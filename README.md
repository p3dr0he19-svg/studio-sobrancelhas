# Studio de Sobrancelhas — protótipo PWA

Sistema de agendamento para studio de sobrancelhas e estética feminina com **uma única profissional** (a dona também atende).
Desenvolvido por **Nexosys**.

São dois apps sobre o **mesmo banco de dados**:

| Rota | App | Para quem |
|---|---|---|
| `/` | Painel da dona | gestão do studio |
| `/cliente` | App da cliente | vitrine + agendamento em 3 passos |

## Como rodar

```bash
node server.js
```

- Painel: http://localhost:5173/ — usuária **dona**, senha **demo123**
- App da cliente: http://localhost:5173/cliente — demo: WhatsApp **(11) 98888-0001** ou **mariana@exemplo.com**, senha **demo123**

Não precisa de `npm install` nem de build. Abra os dois apps em abas lado a lado: um pedido feito no app da cliente aparece na hora no painel (com notificação), e uma aprovação no painel avisa a cliente.

> Para instalar no celular (PWA), o app precisa estar em **HTTPS** (ou em `localhost`). Publique a pasta em qualquer hospedagem estática com HTTPS.

## Estrutura

```
index.html                  Painel (/)
cliente/index.html          App da cliente (/cliente)
assets/core.js              "Banco", regras de agenda, reserva atômica, LGPD, TOTP, dados de exemplo
assets/ui.js                ícones de linha, modais, toasts, tema, calendário, PWA/notificações
assets/painel.js            telas do painel
assets/cliente.js           telas do app da cliente
assets/styles.css           identidade visual (claro/escuro)
sw.js                       service worker (offline + Web Push)
manifest-painel.webmanifest / cliente/manifest.webmanifest   nomes e ícones próprios
icons/                      ícones (sobrancelha em traço contínuo); regenerar: node tools/gerar-icones.js
server.js                   servidor estático de desenvolvimento
```

## Configurar o studio

Painel → **Configurações**: nome (padrão `[NOME DO STUDIO]`), logo, frase, endereço, WhatsApp, Instagram, horário de funcionamento, regras do agendamento online, lembretes, senha e verificação em duas etapas.
Para voltar aos dados de exemplo: Configurações → Dados de demonstração → **Restaurar**.

## Servidor de sincronização (fase de validação)

Os dois apps compartilham um banco na nuvem: **Cloudflare Worker + D1**, código em `api/`.

- Publicado na conta Cloudflare **pessoal** (validação): `https://studio-sobrancelhas-api.importa-cssbuy.workers.dev`
- Site: GitHub Pages em `https://p3dr0he19-svg.github.io/studio-sobrancelhas/`
- Cada registro (cliente, agendamento, foto…) é uma linha; o app envia **só os campos que mudou** e busca as novidades a cada ~4 s. Assim, dois aparelhos mexendo em coisas diferentes ao mesmo tempo não se apagam.
- O endereço do servidor fica em `API_PADRAO` (`assets/core.js`). Sem servidor (`API_PADRAO = ''`), o app volta a guardar tudo só no navegador.
- Para testar contra outro servidor sem mudar o código: no console do navegador, `localStorage.nexo_api = 'http://localhost:8787'` (ou `'local'` para o modo só-navegador) e recarregue.

```bash
# servidor local (banco D1 local, não mexe na nuvem)
cd api && npx wrangler dev --local --port 8787
# publicar (usa a conta pessoal, login separado do da Nexosys)
cd api && XDG_CONFIG_HOME=~/.cf-pessoal npx wrangler deploy
```

**Restaurar a demonstração** (Painel → Configurações → Dados de demonstração) agora apaga e recarrega o banco **para todos os aparelhos**.

## O que falta para lançar

A sincronização já funciona entre aparelhos, mas o servidor ainda **não tem autenticação**: quem souber o endereço da API consegue ler e gravar. Por isso, na validação, **use só dados de teste**. Antes de receber clientes reais:

1. **Autenticação no servidor** — login da dona e das clientes validado pela API (sessão/token), cada cliente só lê os próprios dados, e senhas com hash forte (Argon2/bcrypt) feito no servidor. Hoje o hash é só demonstrativo e roda no navegador.
2. **Reserva atômica** — hoje `reservar()` busca o estado mais recente do servidor antes de gravar, o que barra a maioria dos conflitos, mas duas reservas no mesmo segundo ainda podem passar. A garantia final deve vir do próprio banco (verificação de sobreposição no Worker, dentro da gravação):
   ```sql
   create extension if not exists btree_gist;
   alter table agendamentos add constraint sem_sobreposicao
     exclude using gist (studio_id with =, tstzrange(inicio, fim) with &&)
     where (status in ('pendente','confirmado','concluido'));
   ```
3. **Mover para a conta da Nexosys** — Worker, D1 e GitHub da empresa, depois da validação.
4. **Notificações com o app fechado** — o `sw.js` já trata o evento `push`; falta o servidor enviar Web Push (chaves VAPID) para a inscrição de cada aparelho. No protótipo, as notificações aparecem quando algum dos apps está aberto.
5. **Lembretes 24 h / 2 h e WhatsApp** — hoje são gerados por quem estiver com o app aberto, e o WhatsApp abre com a mensagem pronta. Em produção: um job agendado no servidor e a API oficial do WhatsApp Business.
6. **Fotos** — hoje ficam dentro do banco (compactadas). Em produção: armazenamento de arquivos (ex.: Cloudflare R2), privado para as fotos de ficha.
7. **Exportações** — Caixa → PDF (impressão do navegador → "Salvar como PDF") e Excel (CSV com `;` e vírgula decimal, abre direto no Excel em pt-BR).

## Regras implementadas (padrões, todas configuráveis)

Agendamento online ligado · antecedência mínima 2 h · janela de 45 dias · cancelar até 4 h antes · remarcar até 6 h antes · grade de 15 min respeitando duração, pausa e bloqueios · confirmação pendente (a dona aprova) · até 2 agendamentos por cliente/dia · nunca dois agendamentos no mesmo horário · lembretes 24 h e 2 h antes.

## LGPD

- Termos de Uso e Política de Privacidade com versão e data; leitura em tela cheia com rolagem até o fim antes de liberar "Li e aceito"; data/hora e versão do aceite registradas.
- Nova versão publicada no painel → a cliente vê "Termos atualizados" e precisa aceitar de novo.
- Consentimentos separados e opcionais: fotos antes/depois e marketing (podem ser revogados).
- Anamnese marcada como dado sensível, visível só no painel.
- "Meus dados": ver, corrigir, baixar (JSON), pedir algo (prazo de 15 dias) e encerrar a conta. A exclusão apaga os dados pessoais e mantém só o financeiro anonimizado.
- Painel → Privacidade: pedidos com prazo, registro de aceites, histórico de alterações e versões dos documentos.

*Os textos legais são modelos e devem ser revisados por um advogado antes do uso real.*
