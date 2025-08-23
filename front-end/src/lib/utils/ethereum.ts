import { formatEther, formatUnits, parseEther, parseUnits } from "viem";

export function etherToWei(amount: string): bigint {
  return parseEther(amount);
}

export function weiToEther(amount: bigint | string): string {
  return formatEther(BigInt(amount));
}

export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

export function formatTokenAmount(
  amount: bigint | string,
  decimals: number
): string {
  return formatUnits(BigInt(amount), decimals);
}

export function formatAddress(address: string, length: number = 6): string {
  if (!address) return "";
  if (address.length <= length * 2) return address;

  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function formatBalance(
  balance: string | bigint,
  decimals: number = 18
): string {
  const formatted = formatUnits(BigInt(balance), decimals);
  const num = parseFloat(formatted);

  if (num === 0) return "0";
  if (num < 0.0001) return "< 0.0001";
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(2);
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;

  return `${(num / 1000000).toFixed(1)}M`;
}

export function calculateGasFee(gasUsed: bigint, gasPrice: bigint): string {
  const fee = gasUsed * gasPrice;
  return weiToEther(fee);
}

export function isValidAmount(amount: string): boolean {
  if (!amount || amount.trim() === "") return false;

  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num < Number.MAX_SAFE_INTEGER;
}

export function formatPrice(price: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(price);
}
