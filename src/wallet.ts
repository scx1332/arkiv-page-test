import { createPublicClient as ViemCreatePublicClient } from "viem";
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicArkivClient,
  type WalletArkivClient,
} from "@arkiv-network/sdk";
import { rosario } from "@arkiv-network/sdk/chains";
import "viem/window";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { type PublicClient } from "viem";

class EasyRpcClients {
  publicViemClient: PublicClient;
  publicClient: PublicArkivClient;
  walletClient: WalletArkivClient;

  constructor(
    publicViemClient: PublicClient,
    publicClient: PublicArkivClient,
    walletClient: WalletArkivClient,
  ) {
    this.publicViemClient = publicViemClient;
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  getAddress() {
    return this.walletClient.account!.address;
  }

  async getBalance() {
    return this.publicViemClient.getBalance({
      address: this.getAddress() as `0x${string}`,
    });
  }
}

let currentClients: EasyRpcClients | null = null;

const keyName = "arkiv-page-test:privateKey";

export function cleanLocalStorageKey() {
  localStorage.removeItem(keyName);
}

function getOrCreateLocalStorageKey() {
  const stored = localStorage.getItem(keyName);
  if (stored && /^0x[0-9a-fA-F]{64}$/.test(stored)) {
    return stored as `0x${string}`;
  }

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  const privateKey = `0x${hex}` as `0x${string}`;
  localStorage.setItem(keyName, privateKey);
  return privateKey;
}

export function createArkivClients(): EasyRpcClients {
  const publicViemClient = ViemCreatePublicClient({
    chain: rosario,
    transport: http(), // use the default RPC defined in the chain object
  });

  const publicClient = createPublicClient({
    chain: rosario,
    transport: http(), // use the default RPC defined in the chain object
  });

  const walletClient = createWalletClient({
    chain: rosario,
    account: privateKeyToAccount(getOrCreateLocalStorageKey()),
    transport: http(),
  });

  return new EasyRpcClients(publicViemClient, publicClient, walletClient);
}

export function connectWallet() {
  currentClients = createArkivClients();
  return currentClients;
}

export function getClients(): EasyRpcClients {
  if (!currentClients) {
    return connectWallet();
  }
  return currentClients;
}
