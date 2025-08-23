import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, shape, shapeSepolia } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WAGMI_PROJECT_ID;

if (!projectId) {
  throw new Error("NEXT_PUBLIC_WAGMI_PROJECT_ID is not set");
}

export const config = getDefaultConfig({
  appName: "Shapecraft UsePools",
  projectId,
  chains: [mainnet, shape, shapeSepolia],
  ssr: true,
});
