# Niara PMEs

Site/produto da plataforma Niara para pequenas e médias empresas: captação de
investimento e divisão de capital via tokenização.

Estágio atual: site institucional com **backend real (Supabase)** para o
ciclo de captação (cadastro, login, oferta, investimento) e um fluxo de
**investimento real na testnet Sepolia** (`/investir/onchain`, transações
assinadas de verdade via MetaMask contra contratos implantados em
`niara-contracts-PMEs`). O restante da demonstração (dashboard de
portfólio em `/ativos`, boleta de negociação em `/negociar`) continua
simulado. Ver [`CLAUDE.md`](./CLAUDE.md) para stack, arquitetura, design
system e regras completas do projeto.

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
