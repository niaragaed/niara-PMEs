# Niara PMEs

Site/produto da plataforma Niara para pequenas e médias empresas: captação de
investimento e divisão de capital via tokenização.

Estágio atual: site institucional com **backend real (Supabase)** para o
ciclo de captação (cadastro, login, oferta, investimento) e investimento
**real na testnet Sepolia** (`/investir/onchain`, transações assinadas de
verdade via MetaMask contra contratos implantados em
`niara-contracts-PMEs`) — inclusive dentro da vitrine `/negociar`, onde as
10 ofertas reais da categoria Token PMEs aparecem com a identidade de
empresas fictícias de demonstração (nome, foto, logo): a transação é real,
a empresa por trás não é. As demais categorias de `/negociar` seguem com
boleta de negociação simulada, e o dashboard de portfólio (`/ativos`)
continua 100% mock. Há também um painel interno restrito a sócios
(`/socios`, allowlist de e-mail) que cruza dado real on-chain com dado
demo do Supabase, sempre em seções separadas. Ver [`CLAUDE.md`](./CLAUDE.md)
para stack, arquitetura, design system e regras completas do projeto.

## Desenvolvimento

```bash
npm install
cp .env.example .env.local   # preencha com suas credenciais — ver .env.example
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

```bash
npm run lint      # ESLint
npx tsc --noEmit  # checagem de tipos
npm run build     # build de produção
npm run seed:demo # conta emissor + oferta ativa + conta investidor prontas para demo
```
