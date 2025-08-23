"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration.";
      case "AccessDenied":
        return "You do not have permission to sign in.";
      case "Verification":
        return "The verification token has expired or has already been used.";
      case "Default":
      default:
        return "An error occurred during authentication.";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-gray-600">{getErrorMessage(error)}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Please try again or contact support if the problem persists.
            </p>

            <div className="flex space-x-3">
              <Link
                href="/auth/signin"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Try Again
              </Link>

              <Link
                href="/dashboard"
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-center"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
