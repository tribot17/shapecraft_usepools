import { PoolABI } from "@/lib/ABI/PoolABI";
import { PoolFactoryABI } from "@/lib/ABI/PoolFactoryABI";
import { getSignerProvider, POOL_FACTORY_ADDRESS } from "@/lib/web3/config";
import { ethers } from "ethers";

export class PoolService {
  private poolContract?: ethers.Contract;
  private poolFactory: ethers.Contract;

  constructor(poolAddress: string | null, privateKey: string, chainId: number) {
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
    const tx = await this.poolFactory.createPool(
      nftCollectionAddress,
      creatorFee,
      name,
      symbol,
      false
    );
    return await tx.wait();
  }

  async invest(amount: number) {
    const tx = await this.poolContract?.invest({ value: amount });
    return await tx.wait();
  }
}
