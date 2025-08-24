"use client";

import { Button } from "@/components/ui/button";
import { usePoolAuth } from "@/hooks/usePoolAuth";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export function PoolAuthButton() {
  const { connectToPool, isAuthenticating, authError, isConnected } =
    usePoolAuth();
  const [authResult, setAuthResult] = useState<{
    success: boolean;
    user?: { address: string };
  } | null>(null);

  const handleConnect = async () => {
    const result = await connectToPool();
    setAuthResult(result);

    if (result.success) {
      console.log("Successfully connected to pool:", result);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground mb-4">
          Please connect your wallet first
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={handleConnect}
        disabled={isAuthenticating}
        className="w-full"
      >
        {isAuthenticating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Connecting to Pool...
          </>
        ) : (
          "Connect to UsePools"
        )}
      </Button>

      {authError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{authError}</p>
        </div>
      )}

      {authResult?.success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <div className="text-sm">
            <p className="text-green-700 dark:text-green-300 font-medium">
              Successfully connected to pool!
            </p>
            <p className="text-green-600 dark:text-green-400 text-xs">
              User: {authResult.user?.address}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
