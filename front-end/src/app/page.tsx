export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to <span className="text-blue-600">ShapeCraft</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            NFT collection discovery and investment platform powered by Web3
          </p>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                🔗
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Wallet Connection
              </h3>
              <p className="mt-2 text-base text-gray-500">
                Connect your wallet seamlessly with RainbowKit integration
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white">
                🌐
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Multi-Network
              </h3>
              <p className="mt-2 text-base text-gray-500">
                Support for Shape, Shape Sepolia and more
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white">
                💼
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Wallet Management
              </h3>
              <p className="mt-2 text-base text-gray-500">
                Create and manage multiple wallets for your investments
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Get Started
            </h2>
            <p className="text-gray-600 mb-6">
              Connect your wallet to start exploring NFT collections and
              managing your investments
            </p>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                👆 Use the &quot;Connect Wallet&quot; button in the navbar above
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
