import { createConfig, http, injected } from "wagmi";
import { shape, shapeSepolia } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId)
  throw new Error("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set");

export const config = createConfig({
  chains: [shape, shapeSepolia],
  connectors: [injected()],
  transports: {
    [shape.id]: http(),
    [shapeSepolia.id]: http(),
  },
});
