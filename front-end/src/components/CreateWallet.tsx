import { buildRequest } from "@/lib/requests";
import { useAccount } from "wagmi";

const CreateWallet = () => {
  const { address } = useAccount();

  const handleCreateWallet = async () => {
    if (!address) return;

    const response = await buildRequest(
      "/api/wallets",
      {
        userId: "fa0e9d05-1b3e-4e66-9884-bf73dabb7e95",
        name: "Address Wallet",
      },
      "POST"
    );
  };

  return (
    <div className="flex flex-col items-center justify-center bg-black rounded-lg p-4">
      <button onClick={handleCreateWallet}>Create Wallet</button>
    </div>
  );
};

export default CreateWallet;
