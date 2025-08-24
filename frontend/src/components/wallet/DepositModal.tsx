"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useWeb3 } from "@/hooks/useWeb3";
import { ArrowDown, Copy } from "lucide-react";
import { useState } from "react";
import { Input } from "../ui/input";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  networkName: string;
  currentBalance: string;
}

export function DepositModal({
  isOpen,
  onClose,
  walletAddress,
  networkName,
  currentBalance,
}: DepositModalProps) {
  const [depositAmount, setDepositAmount] = useState("");
  const { sendEthTransaction } = useWeb3();

  const handleDeposit = async () => {
    const result = await sendEthTransaction(
      walletAddress as `0x${string}`,
      depositAmount
    );
    console.log("🚀 ~ handleDeposit ~ result:", result);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="h-5 w-5 text-green-500" />
            Deposit ETH
          </DialogTitle>
          <DialogDescription>
            Send ETH to your managed wallet address on {networkName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Your Managed Wallet Address</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-secondary/50 px-3 py-2 rounded text-sm flex-1 break-all">
                {walletAddress}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(walletAddress)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Deposit Amount</Label>
            <Input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleDeposit}>Deposit</Button>
          </div>
        </div>

        <div className="flex justify-end">
          <p className="text-sm text-muted-foreground">
            Current balance: {currentBalance}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
