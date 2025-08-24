import { PoolABI } from "@/lib/ABI/PoolABI";
import { PoolFactoryABI } from "@/lib/ABI/PoolFactoryABI";
import {
  getProvider,
  getSignerProvider,
  POOL_FACTORY_ADDRESS,
} from "@/lib/web3/config";
import { ethers } from "ethers";

export class PoolService {
  private poolContract?: ethers.Contract;
  private poolFactory: ethers.Contract;
  private provider: ethers.JsonRpcProvider;

  constructor(poolAddress: string | null, privateKey: string, chainId: number) {
    this.provider = getProvider(chainId);

    this.poolFactory = new ethers.Contract(
      POOL_FACTORY_ADDRESS[chainId],
      PoolFactoryABI,
      getSignerProvider(chainId, privateKey)
    );

    if (poolAddress !== null) {
      this.poolContract = new ethers.Contract(
        poolAddress,
        PoolABI,
        getSignerProvider(chainId, privateKey)
      );
    }
  }

  async createPool({
    nftCollectionAddress,
    creatorFee,
    name,
    symbol,
  }: {
    nftCollectionAddress: string;
    creatorFee: string;
    name: string;
    symbol: string;
  }) {
    const gasPrice = await this.provider.getFeeData();

    const estimatedGas = await this.poolFactory.createPool.estimateGas(
      nftCollectionAddress,
      creatorFee,
      name,
      symbol,
      false
    );
    console.log("🚀 ~ PoolService ~ createPool ~ estimatedGas:", estimatedGas);

    // Use EIP-1559 transaction parameters (don't use gasPrice with EIP-1559)
    const txOptions: {
      gasLimit: bigint;
      maxFeePerGas?: bigint | null;
      maxPriorityFeePerGas?: bigint | null;
      gasPrice?: bigint | null;
    } = {
      gasLimit: estimatedGas,
    };

    if (gasPrice.gasPrice)
      txOptions.gasPrice = gasPrice.gasPrice + BigInt(1000);

    console.log("🚀 ~ PoolService ~ createPool ~ txOptions:", txOptions);

    const tx = await this.poolFactory.createPool(
      nftCollectionAddress,
      creatorFee,
      name,
      symbol,
      false,
      txOptions
    );

    console.log("tx ended", tx);

    return await tx.wait();
  }

  async invest(amount: number) {
    const tx = await this.poolContract?.invest({ value: amount });
    return await tx.wait();
  }
}
