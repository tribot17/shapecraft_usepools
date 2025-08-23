import { ethers } from "ethers";
import { PoolABI } from "../ABI/PoolABI";
import { PoolFactoryABI } from "../ABI/PoolFactoryABI";
import { getSignerProvider, POOL_FACTORY_ADDRESS } from "./config";

class Pool {
  private poolContract: ethers.Contract;
  private poolFactory: ethers.Contract;

  constructor(poolAddress: string, privateKey: string, chainId: number) {
    this.poolContract = new ethers.Contract(
      poolAddress,
      PoolABI,
      getSignerProvider(chainId, privateKey)
    );

    this.poolFactory = new ethers.Contract(
      POOL_FACTORY_ADDRESS[chainId],
      PoolFactoryABI,
      getSignerProvider(chainId, privateKey)
    );
  }

  async createPool({
    nftCollectionAddress,
    creatorFee,
    name,
    symbol,
    poolAddress,
  }: {
    nftCollectionAddress: string;
    creatorFee: number;
    name: string;
    symbol: string;
    poolAddress: string;
  }) {
    const tx = await this.poolFactory.createPool(
      nftCollectionAddress,
      creatorFee,
      name,
      symbol,
      poolAddress
    );
    return await tx.wait();
  }
}
