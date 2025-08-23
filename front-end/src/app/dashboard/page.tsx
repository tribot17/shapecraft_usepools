"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { Loading } from "@/components/Loading";
import { WalletAuth } from "@/components/WalletAuth";
import { WalletManager } from "@/components/WalletManager";
import { useAuth } from "@/providers/AuthProvider";
import { useState } from "react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("wallets");
  const { user, userLoading, fetchUser } = useAuth();

  const tabs = [
    { id: "wallets", label: "Wallet Management", component: <WalletManager /> },
    { id: "auth", label: "Authentication", component: <WalletAuth /> },
  ];

  if (userLoading) return <Loading message="Loading..." />;

  const dashboardContent = (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your wallets and authentication
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow">
          {tabs.find((tab) => tab.id === activeTab)?.component}
        </div>
      </div>
    </div>
  );

  return <AuthGuard>{dashboardContent}</AuthGuard>;
}
