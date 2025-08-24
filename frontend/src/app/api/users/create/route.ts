import { createUserWithWallet } from "@/lib/user/userCreation";
import { NextRequest, NextResponse } from "next/server";

async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature, timestamp, nonce } = await request.json();

    const user = await createUserWithWallet({
      walletAddress,
      signature,
      timestamp,
      nonce,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "User creation failed",
      },
      { status: 400 }
    );
  }
}
export { POST };
