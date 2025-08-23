// "use client";

// // import { useWallets } from "@/lib/hooks/useWallets";
// import { useState } from "react";

// interface WalletDetailsProps {
//   walletId: string;
//   onClose: () => void;
// }

// export function WalletDetails({ walletId, onClose }: WalletDetailsProps) {
//   const { wallets, updateWallet, isUpdating } = useWallets();
//   const wallet = wallets.find((w) => w.id === walletId);
//   const [isEditing, setIsEditing] = useState(false);
//   const [editName, setEditName] = useState(wallet?.name || "");

//   if (!wallet) {
//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
//           <p className="text-red-600">Wallet not found</p>
//           <button
//             onClick={onClose}
//             className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     );
//   }

//   const handleSave = () => {
//     updateWallet({ walletId, data: { name: editName } });
//     setIsEditing(false);
//   };

//   const handleCancel = () => {
//     setEditName(wallet.name);
//     setIsEditing(false);
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
//         <div className="flex justify-between items-center mb-6">
//           <h2 className="text-2xl font-bold">Wallet Details</h2>
//           <button
//             onClick={onClose}
//             className="text-gray-500 hover:text-gray-700 text-2xl"
//           >
//             ×
//           </button>
//         </div>

//         <div className="space-y-6">
//           {/* Basic Info */}
//           <div className="bg-gray-50 rounded-lg p-4">
//             <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
//             <div className="space-y-3">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Name
//                 </label>
//                 {isEditing ? (
//                   <div className="flex gap-2">
//                     <input
//                       type="text"
//                       value={editName}
//                       onChange={(e) => setEditName(e.target.value)}
//                       className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
//                     />
//                     <button
//                       onClick={handleSave}
//                       disabled={isUpdating}
//                       className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
//                     >
//                       {isUpdating ? "Saving..." : "Save"}
//                     </button>
//                     <button
//                       onClick={handleCancel}
//                       className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
//                     >
//                       Cancel
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="flex justify-between items-center">
//                     <span className="text-gray-900">{wallet.name}</span>
//                     <button
//                       onClick={() => setIsEditing(true)}
//                       className="text-blue-600 hover:text-blue-800"
//                     >
//                       Edit
//                     </button>
//                   </div>
//                 )}
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Address
//                 </label>
//                 <p className="text-gray-900 font-mono text-sm break-all">
//                   {wallet.address}
//                 </p>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Status
//                 </label>
//                 <span
//                   className={`px-2 py-1 text-xs rounded-full ${
//                     wallet.isActive
//                       ? "bg-green-100 text-green-800"
//                       : "bg-red-100 text-red-800"
//                   }`}
//                 >
//                   {wallet.isActive ? "Active" : "Inactive"}
//                 </span>
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Created
//                 </label>
//                 <p className="text-gray-900">
//                   {new Date(wallet.createdAt).toLocaleString()}
//                 </p>
//               </div>
//             </div>
//           </div>

//           {/* Pools */}
//           <div className="bg-gray-50 rounded-lg p-4">
//             <h3 className="text-lg font-semibold mb-4">
//               Pools ({wallet.pools.length})
//             </h3>
//             {wallet.pools.length === 0 ? (
//               <p className="text-gray-600">No pools created yet.</p>
//             ) : (
//               <div className="space-y-2">
//                 {wallet.pools.map((pool) => (
//                   <div key={pool.id} className="bg-white rounded p-3">
//                     <h4 className="font-medium">{pool.name}</h4>
//                     <p className="text-sm text-gray-600">{pool.description}</p>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Recent Transactions */}
//           <div className="bg-gray-50 rounded-lg p-4">
//             <h3 className="text-lg font-semibold mb-4">
//               Recent Transactions ({wallet.transactions.length})
//             </h3>
//             {wallet.transactions.length === 0 ? (
//               <p className="text-gray-600">No transactions yet.</p>
//             ) : (
//               <div className="space-y-2">
//                 {wallet.transactions.slice(0, 5).map((tx) => (
//                   <div key={tx.id} className="bg-white rounded p-3">
//                     <div className="flex justify-between items-center">
//                       <span className="font-medium">{tx.type}</span>
//                       <span className="text-sm text-gray-600">
//                         {new Date(tx.createdAt).toLocaleDateString()}
//                       </span>
//                     </div>
//                     <p className="text-sm text-gray-600">
//                       Amount: {tx.amount} {tx.tokenAddress ? "tokens" : "ETH"}
//                     </p>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
