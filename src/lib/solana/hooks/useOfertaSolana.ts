"use client";

// Leitura de uma oferta do niara-pmes-solana e da posição da carteira conectada — equivalente de
// src/lib/web3/hooks/useOfertaOnChain.ts. Mesma regra de ouro (ver CLAUDE.md, incidentes do
// approve): `pronto` só é true quando TODAS as leituras terminaram com sucesso; enquanto isso a UI
// não decide nada com valores de fallback.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import {
  ata,
  conexaoSolana,
  lerOfertaSolana,
  lerPosicaoSolana,
  pdaMintMbrl,
  saldoTokenSolana,
  type OfertaSolana,
  type PosicaoSolana,
} from "../program";
import { descreverErroSolana } from "../errors";

const INTERVALO_MS = 15_000;

export type LeituraOfertaSolana = {
  oferta: OfertaSolana | null;
  /** A conta da oferta não existe no programa (endereço errado ou programa diferente). */
  inexistente: boolean;
  posicao: PosicaoSolana;
  saldoMbrl: bigint;
  saldoCotas: bigint;
  pronto: boolean;
  errorMessage: string | null;
  refetch: () => void;
};

export function useOfertaSolana(endereco: string, investidor: string | null): LeituraOfertaSolana {
  const connection = useMemo(() => conexaoSolana(), []);

  const termos = useQuery({
    queryKey: ["solana-oferta", endereco],
    queryFn: () => lerOfertaSolana(connection, endereco),
    refetchInterval: INTERVALO_MS,
  });

  const mintCota = termos.data?.mintCota ?? null;
  const posicao = useQuery({
    queryKey: ["solana-posicao", endereco, investidor, mintCota],
    enabled: Boolean(investidor && mintCota),
    queryFn: async () => {
      const dono = new PublicKey(investidor as string);
      const [p, saldoMbrl, saldoCotas] = await Promise.all([
        lerPosicaoSolana(connection, endereco, investidor as string),
        saldoTokenSolana(connection, ata(dono, pdaMintMbrl())),
        saldoTokenSolana(connection, ata(dono, new PublicKey(mintCota as string))),
      ]);
      return { posicao: p, saldoMbrl, saldoCotas };
    },
    refetchInterval: INTERVALO_MS,
  });

  const erro = termos.error ?? posicao.error;
  const zero = BigInt(0);

  return {
    oferta: termos.data ?? null,
    inexistente: termos.isSuccess && termos.data === null,
    posicao: posicao.data?.posicao ?? { aportado: zero, cotasResgatadas: false, reembolsado: false },
    saldoMbrl: posicao.data?.saldoMbrl ?? zero,
    saldoCotas: posicao.data?.saldoCotas ?? zero,
    pronto: termos.isSuccess && Boolean(termos.data) && (!investidor || posicao.isSuccess),
    errorMessage: erro ? descreverErroSolana(erro) : null,
    refetch: () => {
      void termos.refetch();
      void posicao.refetch();
    },
  };
}
