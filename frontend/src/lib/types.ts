import { Prisma } from "@prisma/client";

// User types
export type User = Prisma.UserGetPayload<object>;
export type UserWithWallets = Prisma.UserGetPayload<{
  include: {
    managedWallets: true;
  };
}>;

// Pool types
export type Pool = Prisma.PoolGetPayload<object>;
export type PoolWithCreator = Prisma.PoolGetPayload<{
  include: {
    creator: true;
  };
}>;

// Wallet types
export type ManagedWallet = Prisma.ManagedWalletGetPayload<object>;
export type ManagedWalletWithBalances = Prisma.ManagedWalletGetPayload<{
  include: {
    balances: true;
  };
}>;

// Transaction types
export type Transaction = Prisma.TransactionGetPayload<object>;

// Enums
export { PoolStatus, PoolType } from "@prisma/client";
