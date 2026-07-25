// Dados fictícios de demonstração para a tela /perfil. Nenhum endereço de
// carteira aqui é real — são exemplos ilustrativos em testnet, usados só
// para popular a simulação de conexão de carteira.

export type DemoWallet = {
  id: string;
  label: string;
  address: string;
  network: string;
};

export const DEMO_WALLET_POOL: DemoWallet[] = [
  {
    id: "wallet-principal",
    label: "Carteira principal",
    address: "0x1a2b...c3d4",
    network: "Ethereum Sepolia (testnet)",
  },
  {
    id: "wallet-secundaria",
    label: "Carteira secundária",
    address: "0x9f8e...f1e2",
    network: "Sepolia (testnet)",
  },
];
