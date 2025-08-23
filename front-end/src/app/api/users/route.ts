import { getUserByWalletAddress } from "models/Users";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const user = await getUserByWalletAddress(address);

  return NextResponse.json(user);
}
