"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUp, RefreshCw } from "lucide-react";
import { useState } from "react";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkName: string;
  networkChainId: number;
  currentBalance: string;
  walletId: string;
  onTransactionComplete: () => void;
}

export function WithdrawModal({
  isOpen,
  onClose,
  networkName,
  networkChainId,
  currentBalance,
  onTransactionComplete,
}: WithdrawModalProps) {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!withdrawAmount) return;

    // Validate amount
    const amount = parseFloat(withdrawAmount);
    const balance = parseFloat(currentBalance);
    if (amount <= 0 || amount > balance) {
      setError("Invalid amount");
      return;
    }

    setIsWithdrawing(true);
    setError(null);

    try {
      const response = await fetch("/api/wallets/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          chainId: networkChainId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Transaction successful
        console.log("Transaction successful:", result.transaction.hash);

        // Reset form and close modal
        setWithdrawAmount("");
        onClose();

        // Notify parent to refresh balance
        onTransactionComplete();
      } else {
        setError(result.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to process withdrawal"
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleClose = () => {
    if (!isWithdrawing) {
      setWithdrawAmount("");
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUp className="h-5 w-5 text-blue-500" />
            Withdraw ETH
          </DialogTitle>
          <DialogDescription>
            Send ETH from your managed wallet on {networkName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (ETH)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.0001"
                placeholder="0.0"
                value={withdrawAmount}
                onChange={(e) => {
                  setWithdrawAmount(e.target.value);
                  setError(null);
                }}
                disabled={isWithdrawing}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8"
                onClick={() => setWithdrawAmount(currentBalance)}
                disabled={isWithdrawing}
              >
                Max
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Available: {currentBalance} ETH
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isWithdrawing}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleWithdraw}
              disabled={!withdrawAmount || isWithdrawing}
            >
              {isWithdrawing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send ETH"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
