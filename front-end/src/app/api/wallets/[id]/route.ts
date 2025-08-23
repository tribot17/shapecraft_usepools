import {
  deleteManagedWallet,
  getManagedWallet,
  updateManagedWallet,
} from "models/Wallets";
import { NextRequest, NextResponse } from "next/server";

// GET /api/wallets/[id] - Get specific wallet details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getManagedWallet(params.id);

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    return NextResponse.json({ wallet });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}

// PUT /api/wallets/[id] - Update wallet details
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { name, isActive } = await request.json();

    const wallet = await updateManagedWallet(params.id, { name, isActive });

    return NextResponse.json({
      wallet,
      success: true,
    });
  } catch (error) {
    console.error("Error updating wallet:", error);
    return NextResponse.json(
      { error: "Failed to update wallet" },
      { status: 500 }
    );
  }
}

// DELETE /api/wallets/[id] - Deactivate wallet (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await deleteManagedWallet(params.id);

    return NextResponse.json({
      success: true,
      message: "Wallet deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating wallet:", error);
    return NextResponse.json(
      { error: "Failed to deactivate wallet" },
      { status: 500 }
    );
  }
}
