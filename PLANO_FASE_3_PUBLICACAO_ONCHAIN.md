# Plano — Fase 3: publicação on-chain self-service pelo emissor (Etapa 0: inspeção)

Documento produzido sem alterar nenhum arquivo de código, sem migration, sem commit —
só leitura do repositório (`niara-PMEs`) e do artefato de build do `niara-contracts-PMEs`
(`out/OfertaOrquestrador.sol/OfertaOrquestrador.json`), conforme pedido.

**Revisão 3 — nenhuma decisão pendente.** A revisão 2 resolveu os pontos 1/2/4 da seção 1
original e propôs, para o ponto 3 (RLS/titularidade), uma opção sem coluna pré-registrada. Esta
revisão incorpora suas quatro decisões sobre aquela proposta: (1) recomendação de titularidade
aceita, com o relatório pedido sobre `saveWallet()` (seção 2.3.1); (2) imutabilidade de
`onchain_emissor_wallet` reforçada por trigger no banco, não só por guarda de aplicação (seção
3.1); (3) `divergente` mantido, mas redirecionado para cobrir drift de parâmetros
(`metaMaxima`/`precoPorCota`/`metaMinima`/`prazo`) entre Supabase e chain, não titularidade
(seções 4.2/5); (4) nome da coluna confirmado, `onchain_emissor_wallet`. Nada pendente — ver
"Decisões consolidadas" e "Sub-etapas para liberar a Etapa 1" no final do documento.

---

## 1. Decisões desta revisão

### 1.1 Não existe hoje nenhuma "aprovação off-chain (KYB)" no código — e o botão que seria o equivalente já foi desligado de propósito

A Decisão 1 pressupõe um fluxo `formulário → Supabase → triggers → aprovação (KYB) →
publicação on-chain`. Inspecionando `src/app/empresa/ofertas/actions.ts` e
`supabase/migrations/0001_core.sql`:

- O único estado entre "rascunho" e "vivo" hoje é `offerings.status`, com os valores
  `draft | active | funded | failed | settled | cancelled` (`0001_core.sql:43-44`). Não há
  `pending_review`, `approved`, nem qualquer coluna de aprovação por humano da Niara.
- A transição `draft → active` é feita pelo **próprio emissor**, sozinho, clicando "Ativar"
  (`activateOffering()`, `src/app/empresa/ofertas/actions.ts:161-227`) — não existe, e nunca
  existiu, uma revisão de staff no meio.
- **O botão "Ativar" está desabilitado agora** (`src/components/empresa/OfertasPage.tsx:234-244`,
  `disabled aria-disabled="true"`, rótulo "Em breve"), e o texto que o acompanha diz por quê:
  *"Ativação de novas ofertas pausada nesta demonstração — a captação está migrando para
  rodar direto em Sepolia real, sem passar por este fluxo simulado."*
  (`src/lib/i18n/pt-br.ts:1318-1319`). Isso foi feito no commit mais recente do repositório
  (`441d764`, "feat: taxa real da plataforma (Sepolia) + ajustes de UI"), ou seja: **alguém
  já começou a preparar terreno para esta própria Fase 3**, desligando o caminho mock antigo
  antes de o caminho real existir.

Ou seja: "oferta já aprovada" não corresponde a nenhum estado gravável hoje. O que existe de
mais próximo de um "gate de aprovação" já é, coincidentemente, uma das suas próprias seis
gates: **gate 4, "endereço em `emissoresAutorizados` no orquestrador"** — quem coloca um
emissor nessa allowlist é o AGENTE da Niara (`autorizarEmissor`, ver
`niara-contracts-PMEs/CLAUDE.md`), um passo humano, off-chain no sentido de "alguém da Niara
decidiu", só que registrado on-chain em vez de numa coluna do Supabase.

**Decisão (aceita por você): aprovação = `emissoresAutorizados` on-chain.** Não construo uma
nova tela/tabela de aprovação por staff nesta fase. Trato `status = 'draft'` (que já passou
pelos CHECKs da Res. 88 na criação) como a única pré-condição do lado Supabase, e a
autorização em `emissoresAutorizados` como o gate de aprovação de fato — exatamente como a
decisão 5 original já listava.

**Registro explícito pedido por você**: `autorizarEmissor(emissor)` — a chamada que o AGENTE
da Niara faz para colocar uma carteira em `emissoresAutorizados` — é o **registro on-chain de
uma decisão de KYB tomada fora deste sistema**, não a decisão em si. O contrato não verifica
identidade, documento societário nem nada parecido; ele só grava "alguém com `AGENTE_ROLE`
decidiu habilitar esta carteira agora". Hoje essa decisão é manual/informal (alguém da Niara
decide e chama a função); um processo de KYB futuro (verificação de documentos, dados
societários, o que for) **alimentaria** esse ato — seria a ferramenta que informa a decisão de
quem autorizar —, mas **nunca o substituiria**: tecnicamente, autorizar um emissor sempre vai
continuar sendo, na prática, uma chamada a `autorizarEmissor` por quem detém `AGENTE_ROLE`,
KYB manual ou automatizado por trás dela. Vou deixar essa distinção escrita no `CLAUDE.md` do
`niara-contracts-PMEs` quando a implementação chegar lá (não altero aquele arquivo nesta
etapa, que é só o plano do lado frontend) e replico o mesmo texto no comentário de qualquer
componente que explique o gate 4 ao emissor.

**Consequência prática**: o botão "Publicar on-chain" (Decisão 2b) aparece em ofertas
`status = 'draft'`, não `status = 'active'` — ver seção 1.2 sobre por que `active` não pode
ser reaproveitado.

### 1.2 `offerings.status = 'active'` já tem um significado incompatível — não pode virar sinônimo de "publicada on-chain"

`src/lib/investments.ts:78` filtra `status = 'active'` para listar ofertas na tela mock de
investidor (`/investir`, reserva/aporte **simulado**, sem relação com a chain). Se eu
reaproveitasse `active` para "publicada on-chain", qualquer oferta real em Sepolia passaria a
aceitar reservas **falsas** em paralelo pelo fluxo antigo — o oposto do que a Decisão 1
existe para evitar.

**Decisão (aceita por você, sem ressalva): colunas ortogonais, `status` intocado.**
`offerings.status` continua imutável nesta fase — sem nova transição, sem novo valor no
`CHECK`. A publicação on-chain vive inteiramente nas colunas novas (`sync_status` e
companhia, seção 3), ortogonais a `status`. Uma oferta publicada on-chain fica para sempre
com `status = 'draft'` do ponto de vista do Supabase — o que é correto: ela nunca deveria
aparecer na listagem mock de `/investir` de qualquer forma.

### 1.3 Titularidade da carteira: por que a coluna pré-registrada foi descartada, e o desenho que a substitui

> "Existe `auth.uid()` e o RLS se apoia nele."

Isso não é o que o código faz hoje — RLS é default-deny em `offerings` (e em toda tabela de
domínio), sem nenhuma policy, nem para `select` nem para `update` (`0001_core.sql:230-241`,
confirmado também pelo comentário explícito de `0003_auth_link.sql:20-24`: *"RLS segue
default-deny; acesso continua via service_role no servidor (...) NAO habilitamos [a policy
`using (user_id = auth.uid())`] agora para nao afrouxar nada sem necessidade."*). Isso eu já
tinha levantado certo.

Onde eu errei foi na conclusão: propus que a proteção de `emissor_wallet` fosse só "nenhuma
Server Action aceita esse valor do cliente" — uma garantia de **disciplina de código**, não
de **estrutura de dado**. Você está certo em recusar isso especificamente aqui: `RLS
default-deny` protege contra alguém usando a `anon key` para falar direto com a API REST do
Supabase (nenhuma policy = PostgREST recusa a escrita, com ou sem a chave) — mas não protege
contra um bug ou uma mudança futura no código que roda com a `service_role` (que ignora RLS
por definição), e não é algo que o próprio banco consiga impor sozinho. Para um campo comum
isso seria aceitável (é o padrão do resto do schema); para um campo que decide **qual carteira
assina uma transação real, pública e irreversível**, não é — a consequência de errar é
diferente em ordem de grandeza.

**Recomendação: opção (a), refinada — a coluna de "carteira designada" não existe.** Em vez
de inventar `offerings.emissor_wallet` como um valor pré-registrado que alguém (mesmo que só
o servidor) precisa gravar e depois comparar, elimino essa coluna do desenho inteiramente.
A verificação de titularidade fica assim, em duas partes:

1. **Antes de assinar (gate 5, ao vivo, sem gravar nada novo)**: comparo a carteira
   conectada no navegador contra `issuers.wallet_address` — a coluna **que já existe**
   (`0006_profile_details.sql:31`), vinculada pelo próprio emissor em `/perfil`, lida direto
   a cada verificação (nunca copiada para uma segunda coluna). Isso já resolve o problema
   original da Decisão 4 (empresa A não pode assinar com a carteira da empresa B): a
   comparação é sempre contra a carteira que a CONTA logada (`resolveAccount().accountId`)
   tem vinculada agora, não contra uma cópia que alguém precisaria manter sincronizada.
   Combinado com o gate 4 (a mesma carteira também precisa estar em `emissoresAutorizados`
   on-chain), as duas condições juntas reconstroem exatamente a mesma garantia da Decisão 4
   — sem introduzir nenhuma coluna nova gravável antes da assinatura.
2. **Depois de confirmada (auditoria, não designação)**: uma coluna nova,
   `offerings.onchain_emissor_wallet`, gravada **uma única vez**, só pela rotina de
   confirmação do servidor (`confirmarPublicacao()`, seção 4.2), com o valor **lido
   diretamente do evento `OfertaCompletaCriada` já minerado** — nunca uma alegação de
   ninguém, sempre uma leitura verificada de um fato já público e imutável na chain. Essa
   coluna não "decide" titularidade nenhuma — ela só registra, depois do fato, o que a chain
   já provou ser verdade. Ver seção 3.1/4.2 para o desenho exato.

**Por que isso responde precisamente a "funcionar mesmo se a anon key vazar"**: na fase
pré-assinatura, não existe mais nenhuma coluna nova para atacar — a única coisa gravável
(`issuers.wallet_address`) já existia antes desta fase e seu mecanismo de escrita não muda
aqui. Na fase pós-confirmação, mesmo que alguém conseguisse invocar a rotina de confirmação
fora de hora (via `anon key` vazada, via bug, o que for), o único valor possível de sair dali
é **exatamente o que a transação já minerada diz** — não há como essa rotina persistir uma
mentira, porque ela não aceita entrada nenhuma além de "confirme esta oferta", e todo o resto
vem de uma leitura RPC contra o estado público da chain.

Descartei a opção (b) ("coluna existe, só gravada por rota de servidor com service role")
porque ela é, na prática, o que eu já tinha proposto — toda Server Action deste projeto já
roda com `service_role`; formalizar isso como "uma rota" não muda a superfície de risco que
você apontou (ainda seria uma coluna cujo único guardião é disciplina de código do lado do
servidor, não uma propriedade estrutural do dado). A opção (a) é estritamente mais forte
porque **remove o dado arriscado da fase em que ele seria uma alegação**, e só o admite depois
de virar fato verificável.

### 1.4 Achado menor, mas relevante para o texto do termo (Decisão 6): a carteira do site já assina transações hoje, só não do lado do emissor

> "É a primeira vez que o site pede assinatura de transação; até hoje a carteira era só
> leitura."

Isso é verdade só para a seção Carteira de `/perfil` (`ConnectWallet.tsx` +
`ConnectionPanel.tsx` — conectar/trocar de rede/ler saldo, nunca uma escrita). Mas
`src/lib/web3/hooks/useOnChainActions.ts` já expõe `useMintMockBrl`, `useInvestirOnChain`,
`useEncerrarOferta`, `useResgatarCotas` e `useLiberarParaEmissor` — todos usando
`useWriteContract` de verdade — consumidos por
`src/components/investir-onchain/RealOnChainInvestPanel.tsx`, montado tanto em
`/investir/onchain` quanto dentro de `OfertaDetailPage` para as ofertas reais da categoria
Token PMEs. Ou seja, **investidores já assinam transações reais neste site desde a Fase
6** (aportar, resgatar, etc.) — só o **emissor** nunca assinou nada ainda.

**Decisão (aceita por você — "era erro meu"): mantenho o termo ajustado.** Em vez de "é a
primeira vez que o site pede uma assinatura", o termo diz "é a primeira vez que **você, como
emissor**, assina uma transação real — diferente do investidor, que já usa carteira para
aportar/resgatar em Sepolia" (texto completo na seção 7, sem mudança nesta revisão). Mantém a
honestidade sem afirmar algo que um investidor que já usou `/investir/onchain` saberia ser
falso.

---

## 2. Resultados da inspeção, item a item

### 2.1 Conexão de carteira hoje

- `wagmi@^3.7.4` + `viem@^2.55.8` + `@tanstack/react-query@^5.101.4` (`package.json`).
- Config única em `src/lib/web3/config.ts`: `createConfig({ chains: [sepolia], connectors:
  [injected()], storage: cookieStorage, ssr: true, transports: { [sepolia.id]:
  http(NEXT_PUBLIC_SEPOLIA_RPC_URL) } })`. Uma rede só (Sepolia).
- Montada em `src/app/providers.tsx` (`WagmiProvider` + `QueryClientProvider`), no layout
  raiz — disponível em qualquer rota, não só `/perfil`.
- `src/components/web3/ConnectWallet.tsx`: conectar/desconectar/trocar de rede — **nenhuma
  chamada a `useWriteContract`** aqui. `src/components/web3/ConnectionPanel.tsx`: só
  `useBalance` (leitura). **Confirmado: a seção Carteira de `/perfil` é 100% leitura.**
- Mas (ver achado 1.4): `src/lib/web3/hooks/useOnChainActions.ts` já assina transações reais
  em outras telas (`/investir/onchain`, `OfertaDetailPage` para PMEs). O padrão de escrita já
  existe e pode ser reaproveitado tal e qual — não seria a primeira vez que este código-base
  monta um `useWriteContract` + `waitForTransactionReceipt`.

### 2.2 Autenticação

- `src/proxy.ts` (Next 16, era `middleware.ts`): só chama `supabase.auth.getUser()` a cada
  navegação para refrescar o cookie de sessão — sem lógica de negócio.
- `src/lib/supabase/server.ts`: client para Server Components/Actions, anon key + cookies,
  respeita RLS (mas RLS é default-deny — não é ele quem autoriza nada na prática).
- `src/lib/supabase/admin.ts`: client service_role, ignora RLS por completo, `import
  "server-only"` — é o client usado por toda action de negócio.
- `src/lib/auth/resolveInvestor.ts:22-53` (`resolveAccount()`): lê `auth.getUser()`, depois
  procura uma linha em `investors.user_id` ou `issuers.user_id` (nessa ordem — o primeiro que
  bater ganha) via client admin. Devolve `{ userId, role, accountId }`. **Esta função é a
  única fonte de identidade em toda action de negócio já existente** (`createOffering`,
  `activateOffering`, `closeOffering`, `saveWallet` etc.) — nenhuma delas aceita
  `issuer_id`/`investor_id` vindo do cliente.
- **A documentação do projeto NÃO está desatualizada quanto a "login em Em breve".** Conferi
  diretamente `src/components/entrar/EntrarPage.tsx`: `handleEntrar` chama
  `supabase.auth.signInWithPassword` de verdade (linha 76); só o botão "Continuar com Google"
  é `disabled aria-disabled="true"` com rótulo "(Em breve)" (linhas 201-206). Login por
  email/senha é real, funcionando, hoje.
- RLS: nenhuma tabela de domínio (`issuers`, `offerings`, `investors`, `investments`,
  `payment_events`) tem policy — ver achado 1.3.

### 2.3 Vinculação conta ↔ carteira

- `issuers.wallet_address` já existe (`0006_profile_details.sql:31`), `unique`
  (`0007_wallet_unique.sql:13`), nullable.
- `saveWallet(addressInput)`/`unlinkWallet()` (`src/app/perfil/actions.ts:399-458`): o próprio
  emissor troca esse endereço **livremente, a qualquer momento**, sem nenhuma trava — é
  literalmente a seção Carteira de `/perfil` (`WalletSection.tsx`).
- **Isso levou à primeira versão deste plano a propor um "snapshot congelado"** de
  `issuers.wallet_address` numa coluna nova por oferta (`emissor_wallet`), para não deixar o
  gate 5 mudar de significado se o emissor trocasse a carteira depois. Essa coluna foi
  descartada na revisão 2 (ver seção 1.3) — não porque o problema do snapshot fosse falso,
  mas porque ele só existia *por causa* da coluna nova; sem ela, não há nada para congelar.
- **Desenho atual (pós-decisão 3)**: não existe `offerings.emissor_wallet`. O gate 5 compara
  a carteira conectada contra `issuers.wallet_address` **ao vivo**, a cada verificação — antes
  de qualquer assinatura acontecer, não há "oferta esperando uma carteira específica", só "a
  conta logada precisa estar com a MESMA carteira conectada que ela mesma vinculou em
  `/perfil`". Pré-condição implícita: se `issuers.wallet_address` for `null`, a tela de
  publicação mostra um estado "sem carteira vinculada" com link para `/perfil`, antes mesmo
  de chegar aos seis gates.
- Depois que a transação confirma, o que fica gravado (`offerings.onchain_emissor_wallet`,
  seção 3.1) não é mais uma comparação com `issuers.wallet_address` — é o valor que o próprio
  evento on-chain relatou, ponto final. Se o emissor trocar a carteira em `/perfil` depois
  disso, isso não afeta o registro da oferta já confirmada (que é histórico), nem precisa
  afetar: o gate 5 só importa antes de assinar.
- "Como o RLS protege": não protege — ver seção 1.3. A proteção real, pós-decisão 3, é
  estrutural, não só de disciplina: não existe mais nenhuma coluna pré-assinatura para
  proteger (não há dado a atacar), e a única coluna pós-confirmação só aceita um valor que a
  própria chain já provou publicamente. Toda leitura/escrita continua também escopada por
  `resolveAccount().accountId`, mesmo padrão de `activateOffering`.

### 2.3.1 Relatório pedido: como `saveWallet()` grava hoje, e se o cliente pode alterá-lo livremente

Lido em `src/app/perfil/actions.ts:374-424`, função por função:

- **Formato, não posse.** `walletAddressSchema` (linhas 379-383) valida só que a string
  parece um endereço (`^0x[0-9a-fA-F]{40}$`, normalizado para minúsculas). Não há desafio de
  assinatura nenhum — não se pede ao usuário para assinar uma mensagem provando que controla
  aquele endereço.
- **O próprio comentário do código já admite isso.** Linhas 374-378: *"só o FORMATO do
  endereço é validado aqui (...); a unicidade é responsabilidade do UNIQUE do banco (...). A
  LINHA gravada é sempre a resolvida por `resolveAccount()` (sessão no servidor); o endereço
  em si vem do cliente (wagmi/MetaMask), mas nunca a conta-alvo."* Ou seja: o desenho já
  documentado do projeto garante **quem** grava (a conta certa, via sessão) mas nunca
  verificou **o quê** — o valor do endereço em si é uma alegação do cliente, aceita como
  está.
- **`saveWallet(addressInput)` (linhas 399-424)**: recebe o endereço como parâmetro comum de
  Server Action — hoje a UI (`WalletSection.tsx`) sempre manda `connection.address` do wagmi,
  mas a própria função aceitaria qualquer string no formato certo, vinda de qualquer chamada
  (não precisa ser via essa UI — uma requisição direta à Server Action, sem MetaMask nenhum
  envolvido, funcionaria igual). Grava com `admin.from(table).update({ wallet_address:
  parsed.data }).eq("id", accountId)` — sem checar se já havia um valor antes, sem cooldown,
  sem limite de trocas. `unlinkWallet()` (linhas 430-458) é igualmente livre.
- **Único freio existente**: o `unique` do Postgres (`0007_wallet_unique.sql:12-13`) — um
  mesmo endereço não pode estar em duas linhas de `issuers` ao mesmo tempo. Se o endereço que
  alguém tentar gravar já pertencer a outra conta, a gravação falha (`23505`,
  `translateWalletDbError`).

**Resposta direta à sua pergunta — "se o gate 5 é contornável trocando o próprio
endereço"**: depende do que se entende por "contornar". Distingo dois riscos, porque eles têm
consequência muito diferente:

1. **Forjar uma assinatura de uma carteira que você não controla — não é possível através
   disso.** Mesmo que a conta A grave `wallet_address = <endereço da empresa B>` em
   `issuers`, isso não faz o MetaMask de A "se tornar" a carteira de B — para o gate 5 passar
   de verdade (carteira **conectada** == `wallet_address`) e, principalmente, para a
   transação real ser **assinada**, A precisaria da chave privada de B, que gravar uma string
   num banco de dados não dá a ninguém. `saveWallet()` sem prova de posse não é, sozinho, um
   caminho para assinar como outra pessoa.
2. **"Sequestrar" um endereço que ainda não foi vinculado por seu dono real — isso, sim, é
   possível hoje**, e é uma vulnerabilidade genuína, só que de um tipo diferente do que a
   Decisão 4 original mirava. Se a carteira W já está autorizada em `emissoresAutorizados`
   on-chain (uma allowlist da plataforma inteira, não amarrada a nenhuma conta específica do
   Supabase) mas o dono real de W **ainda não vinculou** W em `/perfil`, qualquer conta A
   poderia chamar `saveWallet(W)` diretamente (sem nunca ter conectado W de verdade via
   MetaMask — só mandando a string) e "reservar" esse endereço para si. Quando o dono real de
   W tentasse vincular depois, receberia "Esta carteira já está vinculada a outra conta." —
   um bloqueio, não uma perda de fundos, mas ainda assim uma falha real de integridade de
   dado (a conta A passaria a mostrar, em `/perfil`, uma carteira que nunca foi dela de fato,
   e nenhuma transação real seria assinável por A usando W mesmo assim — voltando ao ponto
   1).

**Conclusão sobre o Fase 3**: o gate 5, do jeito desenhado (comparar carteira conectada contra
`issuers.wallet_address`), **não é contornável para produzir uma assinatura indevida** — quem
assina sempre precisa da chave privada real, e isso `saveWallet()` não entrega a ninguém. O
que falta em `saveWallet()` é **prova de posse** (um desafio de assinatura, tipo "assine esta
mensagem para provar que você controla este endereço", antes de gravar), que fecharia
completamente o risco 2 (sequestro de endereço). Essa falha já existe hoje, independente da
Fase 3 — é da Fase 6 (`/perfil`), não introduzida por este plano, mas o gate 5 herda essa
premissa de confiança ao reusar a coluna. **Recomendo tratar isso como um item de
hardening separado, fora do caminho crítico desta fase** (não bloqueia a Etapa 1, porque o
risco residual não permite assinatura indevida) — mas registrado aqui, como pedido, para você
decidir se quer resolver antes, junto, ou depois. Se quiser resolver agora, a correção é
localizada (`saveWallet()` passa a exigir uma assinatura `personal_sign` de um nonce antes de
aceitar o endereço) e não muda nada do desenho da Fase 3 em si.

### 2.4 Schema do Supabase

Tabela `offerings` hoje (união de `0001`, `0008`, `0009`):

```
id, issuer_id, status, target_min_cents, base_cap_cents, hard_cap_cents,
opens_at, closes_at, is_demo, created_at, share_price_cents, category
```

Nenhuma coluna de reconciliação on-chain existe nela hoje. (`onchain_sync_state`, de
`0012`/`0013`, é uma tabela **completamente diferente** — cache de eventos para o painel
`/socios`, nada a ver com `offerings`; não há colisão de nome nem de propósito.)

CHECKs/triggers relevantes (`0001_core.sql`): `cap_le_15m` (≤ R$15M), `additional_lot`
(lote ≤ 25%), `min_le_hardcap`, `window_le_180d` (≤ 180 dias), `window_valid`. Todos batem
exatamente com os limites que `OfertaOrquestrador.criarOfertaCompleta` valida de novo
on-chain — a Res. 88 é checada duas vezes, em dois sistemas, por desenho (a chain não confia
cegamente no que o Supabase mandou).

RLS: default-deny, sem policies, em todas as tabelas de domínio (confirmado, ver 1.3).

### 2.5 Fluxo "Iniciar captação"

`src/components/hero/Hero.tsx:30-35`: já é um link real e habilitado,
`href="/entrar?intent=captacao"` — **não está mais "Em breve"**. `EntrarPage` recebe
`isCaptacaoIntent` via `searchParams` e troca só título/subtítulo para enfatizar "criar conta
para estruturar captação"; o resto do fluxo (login/cadastro) é o mesmo de sempre. Isso já
está pronto e não precisa de nenhum trabalho nesta fase.

### 2.6 Banner de demonstração

**Não existe um componente compartilhado.** Busquei por `export function ... Banner` em todo
`src/` — só existem `BannerUpload` (upload de imagem de capa do emissor) e `OfertaBanner`
(foto + logo de uma oferta), nada relacionado ao aviso de demonstração. O aviso é o mesmo
trecho JSX copiado em pelo menos 6 lugares (`AtivosPage.tsx`, `PerfilPage.tsx`,
`OfertaDetailPage.tsx`, `HubPage.tsx`, `CategoryPage.tsx`, `OrderTicket.tsx`), cada um com sua
própria chave de i18n (`ptBr.ativos.demoBanner`, etc.), mas a mesma classe visual:

```tsx
<div className="border-b border-panel-border bg-panel px-4 py-2 text-center text-xs text-on-military-muted sm:text-sm">
  <span className="font-semibold text-salmon">{...label}</span> — {...text}
</div>
```

Para o termo de assinatura (seção 7), não dá para simplesmente importar um componente
existente — vou **reaproveitar a mesma classe/estrutura visual** (consistência com o resto do
site), mas como texto novo e mais extenso (o termo precisa de bem mais que uma linha). Como
sub-etapa de baixo risco e opcional (seção 9), proponho extrair um `<DemoBanner/>`
compartilhado agora que uma quinta+ tela vai precisar do mesmo padrão — mas isso pode ficar
fora do caminho crítico da Fase 3 sem prejuízo nenhum.

### 2.7 Variáveis de ambiente

- `NIARA_ENV=demo` (lido em `createOffering`, `.env.example:17-18`) marca `is_demo: true` nas
  linhas gravadas — nenhuma lógica de autorização depende dela, é só rótulo de proveniência.
- Chaves do Supabase: `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` públicas (RLS
  protegeria se houvesse policy — hoje só limita o que a anon key *poderia* fazer, que é
  nada, já que não há policy alguma); `SUPABASE_SERVICE_ROLE_KEY` secreta, nunca no cliente,
  protegida por `import "server-only"`.
- Padrão para endereço de contrato **sem virar segredo**: `NEXT_PUBLIC_*`, sempre lido através
  de um módulo central (`src/lib/web3/addresses.ts`), nunca hardcoded num componente — mesmo
  padrão já em uso. Endereço de contrato não é segredo (é público na blockchain); a única
  regra é nunca inventar um fallback silencioso — `readAddress()` retorna `null` em vez de um
  valor inválido, e a UI trata `null` como "contrato não configurado", nunca quebra.
- Para o orquestrador, só preciso de **um** endereço novo (`NEXT_PUBLIC_ORQUESTRADOR_ADDRESS`)
  — diferente do padrão de `addresses.ts` (que lista `mockBrl` + várias ofertas), porque o
  frontend só fala diretamente com `OfertaOrquestrador`; `tokenFactory`/`gateway`/
  `captacaoFactory` são detalhes internos do contrato, nunca chamados pelo frontend.

### 2.8 ABI do orquestrador

Extraí (não escrevi à mão) de
`niara-contracts-PMEs/out/OfertaOrquestrador.sol/OfertaOrquestrador.json` — 85 entradas no
total (herda `AccessControl`/`Pausable`/`TimelockedAccessControl`, a maioria delas
irrelevante para o frontend). Proposta: **um ABI mínimo**, no mesmo espírito das interfaces
locais que o próprio `OfertaOrquestrador.sol` usa para falar com os outros contratos — só o
que o frontend realmente chama:

- Função de escrita: `criarOfertaCompleta(...)`.
- Função de leitura (gate 4): `emissoresAutorizados(address) view returns (bool)`.
- Evento: `OfertaCompletaCriada(address indexed emissor, address indexed token, address
  indexed oferta, uint256 metaMinima, uint256 metaMaxima, uint256 precoPorCota, uint256
  prazo)` — usado para decodificar o endereço do token/oferta a partir do recibo da
  transação, sem precisar de uma segunda chamada RPC.
- Todos os 10 `error` customizados do próprio contrato (`ZeroAddress`,
  `EmissorNaoAutorizado`, `OfertaAnteriorAindaAberta`, `PrecoInvalido`, `PrazoInvalido`,
  `PrazoExcedeLimite`, `MetaMaximaExcedeTeto`, `LoteAdicionalExcedeLimite`,
  `PrecoNaoDivideMetaMaxima`, `TaxaExcedeMaximo`) — necessários para o `viem` conseguir
  decodificar o **nome** de um revert; sem a entrada do erro no ABI passado à chamada, ele só
  decodifica o seletor cru.

Isso dá ~15 entradas em vez de 85, e cobre exatamente a superfície que o emissor pode
alcançar. Sigo a mesma convenção já usada em `src/lib/web3/abis/ofertaCaptacao.ts` (comentário
citando a origem exata, nunca escrito de memória) — proponho copiar manualmente essas ~15
entradas do JSON, do mesmo jeito que já é feito para os outros três ABIs deste projeto.
(Se preferir automatizar — um script que lê o JSON do repositório irmão e gera o `.ts` sozinho
— é possível e reduziria erro de cópia, mas seria uma mudança de convenção em relação ao que
já existe; posso incluir como sub-etapa opcional se você quiser.)

### 2.9 Erros customizados

`src/lib/web3/errors.ts` já tem exatamente o mecanismo certo: `describeOnChainError()`
decodifica `ContractFunctionRevertedError` via `error.walk`, casa `errorName` contra um
dicionário `CUSTOM_ERROR_MESSAGES`, cai num fallback nomeado (`"A transação reverteu
(${errorName})."`) se o nome não estiver mapeado, e trata separadamente rejeição de usuário,
saldo insuficiente e falha de RPC. **Não preciso de um decodificador novo** — só estender o
mesmo dicionário (mesmo arquivo, sem risco de colisão de nome com os erros de
`OfertaCaptacao` já lá). Mapeamento proposto — ver seção 8.

---

## 3. Migration do Supabase (proposta — texto para revisão, nenhum arquivo criado)

### 3.1 Novo arquivo: `supabase/migrations/0015_offering_onchain_publish.sql`

```sql
-- ============================================================================
-- Niara-PMEs -- 0015_offering_onchain_publish
-- Fase 3: publicacao self-service da oferta em Sepolia, pelo proprio emissor.
-- offerings.status NAO MUDA nesta migration -- publicacao on-chain e um
-- conjunto de colunas ORTOGONAL, nunca um novo valor do CHECK de status (ver
-- secao 1.2 do plano: 'active' ja tem outro significado, incompativel).
--
-- NAO existe coluna "emissor designado" pre-assinatura (ver secao 1.3 do
-- plano): a titularidade antes de assinar e checada AO VIVO contra
-- issuers.wallet_address (coluna ja existente, 0006_profile_details.sql) +
-- emissoresAutorizados on-chain -- nenhuma das duas precisa de coluna nova
-- aqui. onchain_emissor_wallet abaixo NAO e uma designacao: e um registro de
-- auditoria, gravado uma unica vez, so pela rotina de confirmacao do
-- servidor, com o valor lido direto do evento OfertaCompletaCriada ja
-- minerado -- nunca uma alegacao aceita de ninguem.
--
-- 'divergente' cobre duas coisas DIFERENTES (ver secao 5 do plano): (a) uma
-- anomalia na leitura do recibo (raro, quase nao deveria acontecer) e (b) o
-- caso principal esperado -- a oferta on-chain e IMUTAVEL depois de criada,
-- mas a linha de offerings NAO E, nada aqui impede um UPDATE manual em
-- hard_cap_cents/share_price_cents/opens_at/closes_at depois da publicacao.
-- Por isso opens_at/closes_at sao "congelados" no exato prazo enviado a
-- chain no momento da publicacao (ver Server Action registrarTentativa,
-- secao 4.2) -- so assim uma comparacao futura contra o valor imutavel
-- on-chain faz sentido.
-- ============================================================================

begin;

alter table offerings
  add column contract_address       text,
  add column token_address          text,
  add column onchain_emissor_wallet text,
  add column tx_hash                text,
  add column chain_id                integer,
  add column sync_status             text not null default 'nao_onchain',
  add column onchain_confirmed_at    timestamptz,
  add column onchain_last_error      text;

-- Formato de endereco/hash -- mesma regex ja usada no frontend
-- (src/lib/web3/addresses.ts HEX_ADDRESS_PATTERN), replicada aqui como
-- ultima linha de defesa (o banco nunca aceita lixo, mesma filosofia dos
-- triggers da Res. 88 em 0001_core.sql).
alter table offerings
  add constraint contract_address_format
    check (contract_address is null or contract_address ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint token_address_format
    check (token_address is null or token_address ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint onchain_emissor_wallet_format
    check (onchain_emissor_wallet is null or onchain_emissor_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  add constraint tx_hash_format
    check (tx_hash is null or tx_hash ~ '^0x[0-9a-fA-F]{64}$');

alter table offerings
  add constraint sync_status_valid
    check (sync_status in ('nao_onchain', 'pendente', 'confirmada', 'divergente'));

-- Consistencia entre sync_status e as colunas que ele descreve -- mesmo
-- principio ja usado pelos CHECKs da Res.88: a invariante mora no banco, nao
-- so na Server Action.
alter table offerings
  add constraint sync_status_pendente_tem_tx
    check (sync_status not in ('pendente', 'confirmada', 'divergente') or tx_hash is not null),
  add constraint sync_status_confirmada_tem_enderecos
    check (
      sync_status <> 'confirmada'
      or (
        contract_address is not null
        and token_address is not null
        and onchain_emissor_wallet is not null
        and chain_id is not null
      )
    );

create index on offerings (sync_status) where sync_status <> 'nao_onchain';

-- Imutabilidade das 4 colunas que registram o que a chain ja confirmou --
-- ISSO NAO E SO UMA GUARDA DE APLICACAO (WHERE sync_status='pendente' na
-- Server Action, secao 4.2): e travado no proprio banco, mesmo padrao ja
-- usado pelos triggers de transicao de investments em 0001_core.sql. Rodar
-- confirmarPublicacao() duas vezes (ou qualquer outro codigo, presente ou
-- futuro) NUNCA sobrescreve um valor ja gravado -- so REVERTER (SQLSTATE
-- 23514/check_violation, mesmo padrao de erro das triggers da Res.88).
-- tx_hash e sync_status ficam DE FORA desta trava de proposito: tx_hash
-- precisa poder ser limpo/trocado numa nova tentativa apos um revert
-- (pendente -> nao_onchain), e sync_status precisa poder ir para
-- 'divergente' a partir de 'confirmada' (drift de parametros, ver secao 5).
create function enforce_onchain_publish_immutable() returns trigger language plpgsql as $fn$
begin
  if old.contract_address is not null and new.contract_address is distinct from old.contract_address then
    raise exception 'offerings.contract_address e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.token_address is not null and new.token_address is distinct from old.token_address then
    raise exception 'offerings.token_address e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.onchain_emissor_wallet is not null and new.onchain_emissor_wallet is distinct from old.onchain_emissor_wallet then
    raise exception 'offerings.onchain_emissor_wallet e imutavel apos gravado' using errcode = '23514';
  end if;
  if old.chain_id is not null and new.chain_id is distinct from old.chain_id then
    raise exception 'offerings.chain_id e imutavel apos gravado' using errcode = '23514';
  end if;
  return new;
end $fn$;

create trigger offerings_onchain_publish_immutable before update on offerings
  for each row execute function enforce_onchain_publish_immutable();

-- RLS: NENHUMA mudanca. offerings continua default-deny, sem policy --
-- acesso as colunas novas passa pelo mesmo client admin (service_role) ja
-- usado em toda Server Action de oferta, escopado por resolveAccount() no
-- codigo da aplicacao. Nao habilito auth.uid() aqui pela mesma razao ja
-- registrada em 0003_auth_link.sql: nao afrouxar sem necessidade -- e porque,
-- apos a decisao 3, nao ha mais nenhuma coluna pre-assinatura cuja escrita
-- dependeria dessa protecao (ver secao 1.3 do plano).

commit;
```

### 3.2 Por que não uma tabela separada

Cogitei `offering_onchain_publications` (1:1 com `offerings`) em vez de colunas soltas.
Descartei: a Decisão 3 já enquadra isso como "a chain é espelho" da própria oferta, não uma
entidade nova; uma tabela separada exigiria um `join` em toda leitura de `/empresa/ofertas` e
não traria nenhum benefício de integridade que o `CHECK` acima não já dê. Mantém o padrão já
usado pelo resto do schema (`share_price_cents`, `category` também entraram como colunas
soltas em migrations posteriores, não como tabelas próprias).

### 3.3 Onde `onchain_emissor_wallet` é escrito (sem RLS policy nova — desenho da seção 1.3)

Única gravação possível, uma única vez: dentro de `confirmarPublicacao(offeringId)` (seção
4.2), depois de o próprio servidor ler o recibo da transação via RPC e decodificar o evento
`OfertaCompletaCriada` dele:

```sql
update offerings
   set contract_address       = $1   -- evento.oferta, lido do recibo pelo servidor
     , token_address          = $2   -- evento.token, idem
     , onchain_emissor_wallet = $3   -- evento.emissor, idem -- NUNCA vindo do cliente
     , sync_status            = 'confirmada'
     , onchain_confirmed_at   = now()
 where id = $4
   and issuer_id = $5                -- accountId de resolveAccount(), nunca do cliente
   and sync_status = 'pendente'      -- write-once: só a partir de uma tentativa registrada
returning id;
```

Não há passo de "designar" a carteira antes disso — a única entrada que qualquer chamador
(cliente incluído) fornece para este fluxo inteiro é `offeringId`; todo o resto (os três
endereços) vem de uma leitura RPC contra a chain, feita pelo próprio servidor, nunca de um
parâmetro. Isso é o que torna a coluna imune a uma `anon key` vazada: não existe um formato de
chamada que aceite "diga que a carteira X publicou esta oferta" — só existe "confirme o que a
transação Y, já minerada, realmente fez".

O `WHERE sync_status = 'pendente'` acima já barra uma segunda chamada na prática (a primeira
já moveu o status para `'confirmada'`), mas quem garante isso de forma que **nenhum** código,
presente ou futuro, consiga sobrescrever é o trigger `offerings_onchain_publish_immutable`
(seção 3.1) — atende à sua exigência do ponto 2: rodar a confirmação duas vezes não
sobrescreve, e isso não depende de nenhuma Server Action lembrar de checar a condição certa.

---

## 4. Estrutura de arquivos proposta

```
src/
  app/
    empresa/ofertas/
      actions.ts                    (existente — sem mudança)
      onchain-actions.ts             NOVO — Server Actions desta fase (4.2)
      [id]/publicar/
        page.tsx                     NOVO — Server Component: valida dono +
                                      elegibilidade, carrega dados, redireciona
                                      se a oferta não existir/não for do issuer
                                      logado/não estiver em status elegível
        not-found.tsx                NOVO — mesmo padrão de
                                      /negociar/oferta/[slug]/not-found.tsx
  components/
    empresa/
      OfertasPage.tsx                existente — ganha o link/botão
                                      "Publicar on-chain" no card de ofertas
                                      status='draft' (substitui visualmente o
                                      "Ativar" desabilitado para essas ofertas)
      publicar/
        PublicarOnChainPage.tsx      NOVO — client, orquestra gates + termo + botão
        GateChecklist.tsx            NOVO — lista visual dos 6 gates + pré-condição de carteira
        TermoPublicacao.tsx          NOVO — texto do termo (seção 7) + checkbox
        SyncStatusBadge.tsx          NOVO — badge nao_onchain/pendente/confirmada/divergente,
                                      reaproveitável no card de "Minhas ofertas" também
    ui/
      DemoBanner.tsx                 NOVO, opcional (ver 2.6 e sub-etapas) — extrai o padrão
                                      já repetido em 6 lugares; usado pela tela de publicar
  lib/
    web3/
      orquestrador.ts                NOVO — pareia NEXT_PUBLIC_ORQUESTRADOR_ADDRESS com o ABI
                                      novo, mesmo papel de contracts.ts mas para 1 contrato só
      abis/
        ofertaOrquestrador.ts        NOVO — ABI mínimo (~15 entradas, ver 2.8)
      hooks/
        useEmissorAutorizado.ts      NOVO — leitura do gate 4 (emissoresAutorizados)
        usePublicarOfertaOnChain.ts  NOVO — hook de escrita (assina + persiste + confirma)
      errors.ts                      existente — CUSTOM_ERROR_MESSAGES ganha as 10 entradas novas
    supabase/
      onchain-reconciliation.ts      NOVO — verificarConsistencia(offeringId), server-only,
                                      reusa publicClient() de eventsCore.ts (ver 4.2/5/6);
                                      a comparação de parâmetros (metaMaxima/precoPorCota/
                                      metaMinima/prazo) usada tanto aqui quanto dentro de
                                      confirmarPublicacao() vive só neste arquivo, importada
                                      por onchain-actions.ts — nunca duplicada
supabase/migrations/
  0015_offering_onchain_publish.sql  NOVO (ver seção 3)
.env.example                         ganha NEXT_PUBLIC_ORQUESTRADOR_ADDRESS (ver 2.7)
```

### 4.1 Rota dedicada vs. seção na mesma página

A Decisão 2 pede duas **telas** distintas. `/empresa/ofertas` já é uma página inteira para
criar/listar; proponho `/empresa/ofertas/[id]/publicar` como rota própria (não um modal nem
uma seção expansível dentro do mesmo componente) — cada card de oferta `draft` na listagem
ganha um link "Publicar on-chain →" que leva para lá. Isso também dá uma URL estável para
voltar depois de assinar (útil no caso "usuário fecha a aba" — ele reabre a mesma URL e vê o
estado `pendente` de novo, sem precisar recriar contexto).

### 4.2 Server Actions novas (`onchain-actions.ts`)

Assinatura proposta (comportamento, não código):

- `carregarElegibilidade(offeringId)`: **só leitura, nada é gravado aqui.** Valida
  `resolveAccount()` (`role==='issuer'`), busca a oferta
  (`.eq("id", offeringId).eq("issuer_id", accountId)`, 404 se não achar), valida
  `status === 'draft'`, lê `issuers.wallet_address` do próprio issuer. Devolve
  `{ walletVinculada, sync_status, ...demais campos onchain já gravados }` para a tela montar
  o `GateChecklist` — se `walletVinculada` for `null`, a UI manda para `/perfil` antes de
  mostrar qualquer gate. Chamada ao entrar na tela (`page.tsx`, Server Component) e de novo
  pelo client a cada verificação do gate 5 (comparação ao vivo, nunca um valor cacheado
  guardado numa oferta).
- `registrarTentativa(offeringId, txHash, prazoUnixSeconds)`: chamada pelo client **assim
  que** a wallet devolve o hash (antes de esperar confirmação). `prazoUnixSeconds` é
  calculado no client, **imediatamente antes** de montar a chamada `criarOfertaCompleta`
  (`Math.floor(Date.now()/1000) + windowDays*86400`, onde `windowDays` vem de
  `closes_at - opens_at` do rascunho original) — o mesmíssimo valor usado como argumento
  `prazo` da transação, nunca recalculado depois. `UPDATE offerings SET tx_hash=$1,
  chain_id=11155111, sync_status='pendente', opens_at=now(), closes_at=to_timestamp($2)
  WHERE id=$3 AND issuer_id=$4 AND sync_status='nao_onchain'` — atômico, quem chegar primeiro
  numa corrida de dois cliques ganha; a segunda chamada recebe 0 linhas e a UI trata como "já
  existe uma tentativa em andamento, aguarde a confirmação". **Por que mexer em
  `opens_at`/`closes_at` aqui**: sem isso, `closes_at` continuaria com o valor calculado na
  criação do rascunho (que pode ter ficado dias parado antes de ser publicado — mesmo
  problema que `activateOffering()` já resolve hoje para o fluxo mock, linhas 186-195 de
  `src/app/empresa/ofertas/actions.ts`), e a comparação de `divergente` da seção 5 nunca
  bateria mesmo sem nada ter "divergido" de verdade.
- `confirmarPublicacao(offeringId)`: **nunca confia em nada vindo do client além do
  `offeringId`.** Lê `tx_hash` da própria linha, chama
  `publicClient().getTransactionReceipt({ hash })` no servidor, confere `status ===
  'success'` **e** que o recibo é de uma chamada ao endereço esperado do
  `OfertaOrquestrador` (`NEXT_PUBLIC_ORQUESTRADOR_ADDRESS` — defesa contra um `tx_hash`
  corrompido apontar para outra transação qualquer), decodifica o log
  `OfertaCompletaCriada` do próprio recibo (`decodeEventLog`). Antes de gravar como
  `confirmada`, faz a MESMA checagem de parâmetros que `verificarConsistencia` (abaixo) faz
  depois — lê `metaMaxima()`/`precoPorCota()`/`prazo()` do `contract_address` recém-obtido
  (via `ofertaCaptacaoAbi`, já existente) e compara contra `hard_cap_cents`/
  `share_price_cents`/`closes_at` **da própria linha, no estado em que
  `registrarTentativa()` os deixou** — devem bater exatamente, já que são os mesmos números
  que viraram os argumentos da transação. Se baterem: grava `contract_address` (evento
  `.oferta`), `token_address` (evento `.token`), `onchain_emissor_wallet` (evento `.emissor`),
  `sync_status='confirmada'`, `onchain_confirmed_at=now()` (ver `UPDATE` exato na seção 3.3).
  Se o recibo ainda não existir (ainda minerando), devolve "continue aguardando", sem gravar
  nada. Se `status === 'reverted'`, volta `sync_status` para `'nao_onchain'`, grava
  `onchain_last_error` com a mensagem traduzida (mesmo `describeOnChainError`) e limpa
  `tx_hash` (permite nova tentativa). Se o recibo existir mas **não** corresponder a uma
  chamada `criarOfertaCompleta` bem-sucedida ao orquestrador esperado, OU se os parâmetros não
  baterem (não deveria acontecer no fluxo normal, mas seria uma corrida real — alguém editando
  a oferta entre a assinatura e a confirmação): marca `sync_status='divergente'` — exige
  intervenção manual (ver máquina de estados, seção 5).
- `verificarConsistencia(offeringId)`: **nova, cobre o ponto 3 da sua última decisão** — a
  oferta on-chain é imutável, a linha do Supabase não é. Só roda em ofertas já
  `sync_status='confirmada'`. Lê ao vivo, do `contract_address` já gravado,
  `metaMaxima()`/`precoPorCota()`/`prazo()` (mais `metaMinima()`, que estendo por simetria —
  avise se preferir tirar) e compara contra os valores **atuais** de
  `hard_cap_cents`/`share_price_cents`/`target_min_cents`/`closes_at` na linha do Supabase
  (convertendo centavos de R$ para a escala de 18 casas do `MockBRL`: `valor_wei =
  centavos * 10^16`). Se **qualquer** um não bater mais, grava `sync_status='divergente'` e
  `onchain_last_error` com o que exatamente diverge (ex.: `"hard_cap_cents do Supabase
  (R$620.000,00) não bate com metaMaxima on-chain (R$600.000,00)"`) — nunca corrige nenhum dos
  dois lados sozinho, só sinaliza (Decisão 3 original: "o leitor compara e exibe divergência").
  Chamada sempre que a tela de detalhe de uma oferta `confirmada` é aberta (uma leitura
  multicall, barata) — **não** roda automaticamente na listagem inteira de `/empresa/ofertas`
  (evitaria N chamadas RPC por carregamento de página; o card na lista mostra só o último
  `sync_status` já conhecido).
- `confirmarPublicacao` e `verificarConsistencia` também rodam — para o caso "fechou a aba" —
  de novo no carregamento de `page.tsx`, conforme o `sync_status` atual da oferta
  (`pendente` → tenta confirmar; `confirmada` → verifica consistência), sem exigir clique.

---

## 5. Máquina de estados de `sync_status`

```
                     ┌─────────────┐
        (nunca        │ nao_onchain │◄────────────────────┐
     tentou publicar)  └──────┬──────┘                     │
                               │ registrarTentativa()        │ confirmarPublicacao()
                               │ (tx assinada, hash obtido)   │   encontra recibo com
                               ▼                              │   status='reverted'
                        ┌─────────────┐                       │   (tx minerada, mas falhou)
                        │  pendente   │───────────────────────┘
                        └──────┬──────┘
                               │ confirmarPublicacao()
                               │ encontra recibo com status='success' e
                               │ um OfertaCompletaCriada decodificável
                               ▼
                        ┌─────────────┐        recibo existe, mas não corresponde a uma
                        │ confirmada  │───┐    chamada criarOfertaCompleta bem-sucedida ao
                        └─────────────┘   │    orquestrador esperado, OU parâmetros não batem
                               ▲          │    logo na primeira confirmação (corrida rara)
                               │          │
                               │          │ verificarConsistencia(), a qualquer momento depois:
                               │          │ hard_cap_cents/share_price_cents/target_min_cents/
                               │          │ closes_at do Supabase não batem MAIS com
                               │          │ metaMaxima/precoPorCota/metaMinima/prazo on-chain
                               │          ▼
                               │  ┌─────────────┐
                    (nenhuma    └─▶│ divergente  │
                     transição     └─────────────┘
                     automática
                     sai daqui —
                     exige correção
                     manual, fora
                     desta fase)
```

Nota sobre a mudança pós-decisão 3: como não existe mais um `emissor_wallet` pré-registrado
para comparar (seção 1.3), `divergente` deixou de significar "a carteira não era a esperada"
— quem pode chamar `criarOfertaCompleta` já é limitado pelo gate 4 (`emissoresAutorizados`) e
pelo gate 5 (carteira == `issuers.wallet_address` no momento de assinar), então titularidade
não é mais uma causa de `divergente`. Por decisão sua (ponto 3), `divergente` continua — e
principalmente — cobrindo **drift de parâmetros**: a oferta on-chain (`metaMaxima`,
`precoPorCota`, `metaMinima`, `prazo`) é imutável assim que criada, mas a linha de `offerings`
não é — nada no schema impede um `UPDATE` manual em `hard_cap_cents`/`share_price_cents`/
`target_min_cents`/`closes_at` depois da publicação (hoje nenhuma UI faz isso, mas o banco não
proíbe). `divergente` é alcançável de dois lugares: (a) `confirmarPublicacao()`, se os
parâmetros já não baterem na primeira confirmação — só aconteceria numa corrida genuína, já
que os valores comparados são os mesmos que viraram os argumentos da transação; (b)
`verificarConsistencia()`, a qualquer momento depois, se o Supabase tiver mudado desde a
confirmação — este é o caso principal que a sua decisão pediu para não perder.

Transições e o que dispara cada uma:

| De → Para | Disparado por | Efeito no banco |
|---|---|---|
| `nao_onchain → pendente` | `registrarTentativa()`, logo após a wallet devolver o hash | grava `tx_hash`, `chain_id`, `sync_status='pendente'`, congela `opens_at`/`closes_at` no prazo real enviado à chain |
| `pendente → confirmada` | `confirmarPublicacao()`, recibo `success`, evento decodificado, parâmetros batendo | grava `contract_address`, `token_address`, `onchain_emissor_wallet`, `onchain_confirmed_at`, `sync_status='confirmada'` |
| `pendente → nao_onchain` | `confirmarPublicacao()`, recibo `reverted` | limpa `tx_hash`, grava `onchain_last_error`, `sync_status='nao_onchain'` (permite nova tentativa) |
| `pendente → divergente` | `confirmarPublicacao()`, recibo não decodifica como esperado, ou parâmetros já não batem na primeira checagem | grava `onchain_last_error`, `sync_status='divergente'`, **mantém** `tx_hash` (evidência) |
| `confirmada → divergente` | `verificarConsistencia()`, algum parâmetro do Supabase não bate mais com o valor imutável on-chain | grava `onchain_last_error` com o detalhe do que diverge, `sync_status='divergente'` — **nunca** toca `contract_address`/`token_address`/`onchain_emissor_wallet` (protegidos pelo trigger da seção 3.1 de qualquer forma) |
| `divergente → *` | **nenhuma automática** | resolução manual (SQL direto por alguém da Niara, ou uma ferramenta futura em `/socios` — fora do escopo desta fase) |
| `confirmada → *` (exceto `divergente`) | **nenhuma** | sem "republicar"/"editar" depois de confirmada |

---

## 6. Tratamento de cada modo de falha

| Cenário | Onde é pego | Comportamento |
|---|---|---|
| Usuário rejeita na MetaMask | `describeOnChainError` já trata (`UserRejectedRequestError`/código 4001) | Mensagem "Você cancelou a assinatura na carteira." Nenhuma escrita no Supabase (nunca saiu de `nao_onchain`). |
| Transação reverte on-chain | `confirmarPublicacao()` lê o recibo, `status='reverted'` | Ver máquina de estados: volta a `nao_onchain`, erro real traduzido gravado e mostrado, permite tentar de novo. |
| Transação "some" (nunca mineda, ou mineda só depois de muito tempo) | `pendente` fica pendente — nenhum timeout automático nesta fase | A tela mostra "aguardando confirmação" com link para o Etherscan (`tx_hash` já é público via URL); o emissor pode voltar quando quiser e a reconciliação roda de novo. Não trato "abandonada" automaticamente — decidir isso exigiria uma política de timeout arbitrária; fica como possível melhoria futura, não bloqueia esta fase. |
| RPC cai no meio | `describeOnChainError` já trata (`HttpRequestError`/`TimeoutError`/`RpcRequestError`) | Se caiu **antes** de obter o hash: nenhuma escrita, mensagem "não foi possível falar com o RPC". Se caiu **depois** de obter o hash (só falha ao esperar confirmação): o hash já foi persistido por `registrarTentativa()` antes da espera — a reconciliação no próximo carregamento da página resolve sozinha, sem depender do mesmo RPC ter voltado a funcionar na mesma sessão. |
| Usuário fecha a aba logo após assinar | Coberto pelo desenho, não é um caso especial | `registrarTentativa()` já rodou (grava antes de esperar confirmação) — ao reabrir `/empresa/ofertas/[id]/publicar`, o Server Component chama `confirmarPublicacao()` automaticamente e resolve para `confirmada`/`nao_onchain`/`divergente` conforme o estado real da chain. |
| Linha do Supabase muda depois da confirmação (edição manual, bug futuro de UI de edição) | `verificarConsistencia()`, chamada sempre que a tela de detalhe de uma oferta `confirmada` abre | `sync_status` vira `divergente`, `onchain_last_error` grava exatamente qual campo diverge e os dois valores (Supabase vs. chain) — nenhum dos dois é corrigido automaticamente, resolução é manual (ver seção 5). |

---

## 7. Texto do termo de demonstração

Aparece como um bloco de leitura obrigatória com checkbox (gate 6), estilo visual herdado do
padrão de banner (seção 2.6) mas expandido, dentro de `TermoPublicacao.tsx`:

> **Antes de publicar, leia com atenção**
>
> Você está prestes a assinar uma transação real na rede de teste **Sepolia**, usando sua
> própria carteira e pagando o próprio gás em ETH de teste. Diferente da conexão de carteira
> em Perfil (que só lê seu endereço e saldo), **esta ação grava dados permanentes numa
> blockchain pública** — a Niara não assina por você e não pode desfazer isso depois.
>
> Antes de continuar, confirme que você entende que:
>
> 1. **É uma rede de teste, sem valor real.** Sepolia ETH e o `MockBRL` usado nesta demonstração
>    não têm lastro nem valor financeiro nenhum. Nenhum dinheiro real muda de mãos aqui.
> 2. **O registro é público e permanente.** O nome da sua empresa e os termos desta oferta
>    (meta, prazo, valor por cota) ficarão gravados para sempre numa blockchain pública,
>    visíveis a qualquer pessoa no Etherscan — inclusive depois de você excluir sua conta na
>    Niara PMEs. Seu CNPJ **não** é gravado em texto — só um hash (`bytes32`) dele, que não
>    pode ser revertido para o número original a partir da chain.
> 3. **Você paga o próprio gás.** A transação custa ETH de teste da sua carteira — a Niara não
>    cobre, não reembolsa e não patrocina essa taxa.
> 4. **Isto não é uma oferta pública de valores mobiliários.** A Niara PMEs não é uma
>    plataforma autorizada pela Comissão de Valores Mobiliários (CVM). Nada aqui constitui
>    oferta real de investimento, e o registro on-chain não substitui os livros societários da
>    Lei 6.404/76 nem o registro em cartório.
> 5. **Diferente de um investidor nesta plataforma, esta é a primeira vez que você, como
>    emissor, assina uma transação aqui.** Depois de publicada, sua oferta poderá receber
>    aportes reais de teste de outras carteiras — revise os termos com cuidado antes de
>    confirmar.
>
> ☐ Li e entendi os pontos acima, e quero prosseguir com a publicação em Sepolia.

(Ponto 5 já reflete a correção do achado 1.4 — não afirma ser "a primeira assinatura do
site", só a primeira do lado do emissor, que é verdade.)

---

## 8. Mapeamento de erro customizado → mensagem em português

Entradas novas para `CUSTOM_ERROR_MESSAGES` em `src/lib/web3/errors.ts` (mesmo arquivo,
mesmo dicionário — nenhum nome colide com os erros já mapeados de `OfertaCaptacao`):

| Erro Solidity | Mensagem pt-BR proposta |
|---|---|
| `ZeroAddress()` | "Configuração inválida do contrato — avise a Niara." (não deveria ser alcançável pelo emissor; só apareceria por endereço mal configurado do lado da plataforma) |
| `EmissorNaoAutorizado(address emissor)` | "Sua carteira ainda não está autorizada a publicar ofertas — fale com a Niara para liberar o acesso." |
| `OfertaAnteriorAindaAberta(address oferta)` | "Você já tem uma oferta em aberto em Sepolia — encerre-a antes de publicar uma nova." |
| `PrecoInvalido()` | "O valor por cota não pode ser zero." |
| `PrazoInvalido(uint256 prazo)` | "O prazo da oferta precisa ser no futuro." |
| `PrazoExcedeLimite(uint256 prazo, uint256 limite)` | "O prazo da oferta ultrapassa o limite de 180 dias da Resolução CVM 88." |
| `MetaMaximaExcedeTeto(uint256 metaMaxima, uint256 teto)` | "O valor da oferta ultrapassa o teto de R$15 milhões por oferta." |
| `LoteAdicionalExcedeLimite(uint256 metaMaxima, uint256 metaMinima)` | "O lote adicional ultrapassa 25% da oferta original." |
| `PrecoNaoDivideMetaMaxima(uint256 metaMaxima, uint256 precoPorCota)` | "O valor da oferta precisa ser múltiplo exato do valor por cota." |
| `TaxaExcedeMaximo(uint256 taxaBps, uint256 maximo)` | "Configuração de taxa da plataforma inválida — avise a Niara." (parâmetro de plataforma, não do emissor) |

Nota: como os valores da oferta já passaram pelos `CHECK`s do Supabase antes de chegar a
`draft` (seção 2.4), os sete primeiros erros de limite/aritmética **não deveriam ser
alcançáveis na prática** — se algum deles aparecer de verdade, é sinal de uma divergência
entre os limites espelhados no Postgres e os limites reais do contrato (ex.: arredondamento).
Mapeados mesmo assim, honestamente, em vez de um "erro genérico" — mesma filosofia do resto
do projeto ("Execution reverted" cru é inaceitável, mas um erro "que não deveria acontecer"
também merece uma frase real, não um alarme falso de bug de UI).

---

## 9. Plano de teste

### 9.1 Sem tocar Sepolia

- ABI mínima (2.8): comparar campo a campo contra o JSON de
  `niara-contracts-PMEs/out/OfertaOrquestrador.sol/OfertaOrquestrador.json` (nomes de função,
  tipos de parâmetro, nomes de erro) — checagem estática, sem rede.
- Migration (3.1): aplicar localmente (`supabase db reset`/CLI local), testar cada `CHECK`
  isoladamente (tentar inserir `sync_status='pendente'` sem `tx_hash`, deve falhar; tentar
  `sync_status='confirmada'` sem `contract_address`, deve falhar; endereço/hash em formato
  errado, deve falhar) — **e testar o trigger de imutabilidade** (3.1): gravar
  `contract_address` uma vez, tentar um segundo `UPDATE` mudando o valor, deve falhar com
  `check_violation`; confirmar que um `UPDATE` que só muda `sync_status`/`onchain_last_error`
  (a transição `confirmada → divergente`) continua permitido.
- `carregarElegibilidade()`: teste de integração contra o Supabase local — confirma 404 para
  oferta de outro `issuer_id`, confirma rejeição se `status != 'draft'`, confirma que devolve
  `walletVinculada: null` quando `issuers.wallet_address` está vazio (sem gravar nada — é só
  leitura).
- `registrarTentativa()`: confirma a corrida de dois cliques (segunda chamada com
  `sync_status` já `'pendente'` não atualiza nada); confirma que `opens_at`/`closes_at` são
  gravados exatamente a partir do `prazoUnixSeconds` recebido, não recalculados de novo no
  servidor.
- `confirmarPublicacao()`: com um recibo **simulado** (mock do `publicClient`, sem RPC real)
  — quatro casos: `success` com `OfertaCompletaCriada` decodificável e parâmetros batendo →
  `confirmada`, com `onchain_emissor_wallet` gravado exatamente igual ao `emissor` do evento
  simulado (nunca a um valor pré-definido no teste); `reverted` → volta a `nao_onchain`;
  recibo que não decodifica como o evento esperado → `divergente`; recibo `success` mas com
  `metaMaxima`/`precoPorCota`/`prazo` simulados **diferentes** do que a linha do Supabase tem
  no momento → `divergente` (a checagem de parâmetros dentro de `confirmarPublicacao`, não só
  em `verificarConsistencia`). Isso cobre a lógica inteira sem gastar ETH de teste nenhuma vez.
- `verificarConsistencia()`: com leituras on-chain simuladas — parâmetros batendo → não muda
  nada (permanece `confirmada`); um parâmetro qualquer (testar os quatro, um de cada vez)
  divergindo → `sync_status='divergente'` com `onchain_last_error` citando o campo certo;
  confirmar que **nenhuma** chamada desta função jamais tenta um `UPDATE` em
  `contract_address`/`token_address`/`onchain_emissor_wallet` (nem precisaria, já que o
  trigger da migration bloquearia de qualquer forma — mas vale testar que o código nem tenta).
- Gate 5 ao vivo: confirmar que a comparação usa sempre a leitura atual de
  `issuers.wallet_address` (mudar o valor entre duas chamadas de `carregarElegibilidade()` e
  ver o gate recalcular, sem nenhum valor cacheado na oferta).
- UI dos 6 gates + pré-condição de carteira: renderizar `GateChecklist` com cada combinação
  de gate falso/verdadeiro (sem MetaMask, rede errada, saldo zero, não autorizado, carteira
  errada, termo não aceito) — puro teste de componente, sem chain.
- Leitura da oferta `PSILVA` de referência (sub-etapa 1, abaixo): como o token/oferta já
  existem e são **imutáveis** (não vão ser fechados de novo só para este teste), a leitura
  pode ser validada a qualquer momento, comparando com os valores já documentados em
  `DEMO_SEPOLIA.md` (nome "PSILVA", `emissorWallet = 0x47d9de93F15E1ebfbEFD5F32c0076cf3090C63c6`,
  meta mínima R$500.000/máxima R$600.000, cota R$1.000, prazo 90 dias).

### 9.2 Só um teste ponta a ponta com a carteira `0x47d9de93…` verifica

- O ciclo completo de assinatura real: MetaMask abre, emissor assina, gás sai da carteira
  dele, `OfertaCompletaCriada` é emitido, o recibo é lido de volta pelo servidor,
  `sync_status` vira `confirmada` com os endereços certos.
- **Pré-requisito a verificar antes**: `0x47d9de93…` só consegue criar uma oferta nova se a
  última dela **não** estiver com `estado() == Aberta` no contrato (gate `OfertaAnteriorAindaAberta` —
  não é bug do frontend se isso reverter, é a regra "uma oferta aberta por vez" funcionando).
  Conferir via `cast call` antes do teste — se a oferta de referência (ou qualquer oferta
  posterior criada com essa carteira) ainda estiver aberta, o teste ponta a ponta precisa
  usar uma carteira diferente (também já autorizada em `emissoresAutorizados`) ou esperar
  aquela oferta ser encerrada.
- Também só um teste real verifica: o comportamento exato do MetaMask estimando gás para
  `criarOfertaCompleta` (4 sub-chamadas internas) — o `PLANO_OFERTA_ORQUESTRADOR.md` do
  repositório de contratos já recomenda fixar um `gasLimit` explícito generoso (~1.2M) em vez
  de confiar 100% na estimativa automática; vale confirmar que isso é necessário também
  chamando via `useWriteContract` do wagmi (não só via `cast`).
- E o caso "fechar a aba após assinar" na prática: fechar de verdade o navegador entre o
  clique de assinar e a confirmação, reabrir a URL depois, confirmar que a reconciliação
  automática resolve sozinha.

---

## 10. Divisão em sub-etapas implementáveis separadamente

Ordem pensada para validar leitura antes de escrita, e cada sub-etapa é independentemente
testável/revisável antes de avançar para a próxima:

1. **Só leitura, sem migration, sem UI nova de peso.** `NEXT_PUBLIC_ORQUESTRADOR_ADDRESS` no
   `.env.local`; ABI mínima (2.8); `useEmissorAutorizado()`; um card de diagnóstico temporário
   (ou uma página só-dev) que lê `emissoresAutorizados(0x47d9de93…)` (deve retornar `true`) e
   os dados públicos da oferta `PSILVA` via os ABIs de `OfertaCaptacao`/`ParticipacaoToken`
   **já existentes** — sem nenhuma escrita, sem nenhuma migration. Critério de aceite: os
   valores lidos batem com os documentados em `DEMO_SEPOLIA.md`.
2. **Schema.** Migration `0015` (seção 3), aplicada e testada localmente (9.1) — nenhuma UI
   nova ainda usa as colunas.
3. **Elegibilidade sem assinatura.** Rota `/empresa/ofertas/[id]/publicar` +
   `carregarElegibilidade()` + `GateChecklist` mostrando os 6 gates (gate 5 já comparando ao
   vivo contra `issuers.wallet_address`, sem nenhuma coluna nova ainda em uso para isso — só
   as colunas de leitura de reconciliação da migration 2) e a pré-condição de carteira
   vinculada, calculados de verdade — o botão final de assinar fica **oculto ou desabilitado**
   nesta sub-etapa. Valida toda a lógica de elegibilidade sem gastar gás.
4. **Termo + botão habilitado.** `TermoPublicacao`, `usePublicarOfertaOnChain`,
   `registrarTentativa` (já com o congelamento de `opens_at`/`closes_at`),
   `confirmarPublicacao` (já com a checagem de parâmetros embutida), `SyncStatusBadge`.
   Termina com o teste ponta a ponta da seção 9.2, usando `0x47d9de93…` (ou outra carteira já
   autorizada).
5. **Reconciliação contínua.** `verificarConsistencia()` (seção 4.2/5) chamada na tela de
   detalhe de qualquer oferta já `confirmada`; badge de `divergente` visível tanto ali quanto
   no card da listagem. Só faz sentido depois da sub-etapa 4 existir (precisa de pelo menos
   uma oferta `confirmada` de verdade para exercitar).
6. **Opcional, fora do caminho crítico.** Extrair `<DemoBanner/>` compartilhado (2.6);
   automatizar a extração do ABI (2.8) em vez de copiar à mão; hardening de `saveWallet()` com
   desafio de assinatura (2.3.1) — nenhuma delas bloqueia o restante.

Cada sub-etapa acima é, na minha leitura, um commit (ou um pequeno grupo de commits)
independente — nenhuma delas deixa o sistema num estado pior do que o atual se parar ali
(sub-etapa 1 não escreve nada; sub-etapa 2 é aditiva e sem uso ainda; sub-etapa 3 não assina
nada; a sub-etapa 4 introduz a capacidade de assinar de verdade; a 5 só observa o que já foi
publicado, nunca escreve nos campos protegidos pelo trigger).

---

## Decisões consolidadas nesta revisão (nenhuma pendente)

1. **Aprovação = `emissoresAutorizados` on-chain** (seção 1.1), registrada explicitamente como
   o **registro** de uma decisão de KYB tomada fora do sistema, não a decisão em si — um
   processo de KYB futuro alimentaria esse ato, nunca o substituiria.
2. **`offerings.status` intocado** (seção 1.2) — publicação on-chain vive só em colunas
   ortogonais.
3. **Titularidade sem coluna pré-registrada** (seção 1.3): gate 5 compara ao vivo contra
   `issuers.wallet_address`; `onchain_emissor_wallet` é gravado uma única vez, só como fato de
   auditoria dentro de `confirmarPublicacao()`, e travado por trigger no banco (seção 3.1) —
   não só por guarda de aplicação. `saveWallet()` não verifica posse (relatado na seção
   2.3.1); isso não permite forjar assinatura (ainda precisa da chave privada real), só
   sequestro de endereço não reclamado — registrado como hardening separado, não bloqueia
   esta fase.
4. **`divergente` cobre drift de parâmetros** (seção 5): `metaMaxima`/`precoPorCota`/
   `metaMinima`/`prazo` on-chain são imutáveis; `hard_cap_cents`/`share_price_cents`/
   `target_min_cents`/`closes_at` no Supabase não são. `verificarConsistencia()` compara os
   dois lados sempre que uma oferta `confirmada` é revisitada, e marca `divergente` sem
   corrigir nenhum dos dois automaticamente. `opens_at`/`closes_at` são congelados no prazo
   real enviado à chain no momento de `registrarTentativa()`, para a comparação ter uma base
   estável.
5. **Nome da coluna**: `onchain_emissor_wallet`.

## Sub-etapas para liberar a Etapa 1

Retomando a seção 10 (agora com 6 sub-etapas, após incorporar a reconciliação contínua do
ponto 4 acima):

1. Só leitura (gate 4 + dados públicos de `PSILVA`), sem migration, sem escrita.
2. Migration `0015` (schema + trigger de imutabilidade), sem UI nova ainda em uso.
3. Elegibilidade sem assinatura (rota `/publicar`, 6 gates + pré-condição de carteira, botão
   final oculto/desabilitado).
4. Termo + botão habilitado (assinatura real, `registrarTentativa`/`confirmarPublicacao` com
   congelamento de prazo e checagem de parâmetros) — termina no teste ponta a ponta da seção
   9.2.
5. Reconciliação contínua (`verificarConsistencia`, badge de `divergente`).
6. Opcional/fora do caminho crítico: `<DemoBanner/>` compartilhado, automação da extração do
   ABI, hardening de `saveWallet()`.

Cada uma é independentemente revisável e não deixa o sistema pior do que hoje se parar ali —
liberando a Etapa 1, começo pela sub-etapa 1.
