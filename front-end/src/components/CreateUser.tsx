import { buildRequest } from "@/lib/requests";
import { useGenerateWalletOwnershipProof } from "@/lib/web3/signature";
import { useAccount } from "wagmi";

const CreateUser = () => {
  const { address } = useAccount();
  const { generateProof } = useGenerateWalletOwnershipProof();

  const handleCreateUser = async () => {
    if (!address) return;

    const { signature, message, timestamp, nonce } = await generateProof(
      address
    );

    const response = await buildRequest(
      "/api/users/create",
      {
        walletAddress: address,
        signature,
        timestamp,
        nonce,
        message,
      },
      "POST"
    );

    console.log(response);
  };

  return (
    <div className="flex flex-col items-center justify-center bg-black rounded-lg p-4">
      <button onClick={handleCreateUser}>Create User</button>
    </div>
  );
};

export default CreateUser;
