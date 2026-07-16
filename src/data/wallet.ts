// Credit Wallet & Token Engine

export interface WalletState {
  credits: number;
  totalPurchased: number;
  totalConsumed: number;
  refillPrice: number;
}

const WALLET_KEY = "omnimedia_wallet";
const COST_KEY = "omnimedia_cost_per_1k";

const DEFAULT_WALLET: WalletState = {
  credits: 50,
  totalPurchased: 50,
  totalConsumed: 0,
  refillPrice: 3.99,
};

export function getWallet(): WalletState {
  if (typeof window === "undefined") return { ...DEFAULT_WALLET };
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (raw) return { ...DEFAULT_WALLET, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_WALLET };
}

export function saveWallet(state: WalletState): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(WALLET_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("wallet-updated", { detail: state }));
  }
}

export function deductCredits(amount: number): boolean {
  const wallet = getWallet();
  if (wallet.credits < amount) return false;
  wallet.credits -= amount;
  wallet.totalConsumed += amount;
  saveWallet(wallet);
  // Flight Recorder
  import("./flightRecorder").then(({ appendTransaction }) =>
    appendTransaction("CREDIT_WALLET_CHANGE", wallet),
  );
  return true;
}

export function addCredits(amount: number): void {
  const wallet = getWallet();
  wallet.credits += amount;
  wallet.totalPurchased += amount;
  saveWallet(wallet);
  // Flight Recorder
  import("./flightRecorder").then(({ appendTransaction }) =>
    appendTransaction("CREDIT_WALLET_CHANGE", wallet),
  );
}

export function calculateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(tokens: number, costPer1K: number): number {
  return (tokens / 1000) * costPer1K;
}

export function getCostPer1K(): number {
  if (typeof window === "undefined") return 0.01;
  const raw = localStorage.getItem(COST_KEY);
  return raw ? parseFloat(raw) : 0.01;
}

export function saveCostPer1K(cost: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(COST_KEY, String(Math.min(0.05, Math.max(0, cost))));
  }
}