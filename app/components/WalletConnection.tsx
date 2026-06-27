"use client";

import { useState, useEffect } from "react";
import { stellar } from "../lib/stellar";
import { FaWallet } from "react-icons/fa";
import { MdLogout } from "react-icons/md";
import { useWallet } from "../contexts/WalletContext";

export default function WalletConnection() {
  const { address, setAddress, walletsKit } = useWallet();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const handleConnect = async () => {
    if (!walletsKit) return;
    try {
      setLoading(true);
      await walletsKit.openModal({
        onWalletSelected: async (option) => {
          walletsKit.setWallet(option.id);
          const { address } = await walletsKit.getAddress();
          setAddress(address);
        },
        onClosed: () => setLoading(false),
      });
    } catch (error: any) {
      console.error("Connection error:", error);
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    if (stellar && stellar.disconnect) stellar.disconnect();
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const buttonBaseClass =
    "group relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl transition-all active:scale-95 overflow-hidden";

  if (!address) {
    return (
      <div className="flex justify-end">
        <button
          onClick={handleConnect}
          disabled={loading || !walletsKit}
          className={`${buttonBaseClass} border border-[#524981]/60 bg-zinc-950 hover:bg-[#3B0A82]/80 hover:border-[#524981]`}
          style={{ borderColor: "rgba(59,10,130,0.5)" }}
        >
          {loading ? (
            <div
              className="h-4 w-4 animate-spin rounded-full border-2 border-r-transparent"
              style={{ borderColor: "#7c3aed", borderRightColor: "transparent" }}
            />
          ) : (
            <FaWallet style={{ color: "#524981" }} className="text-sm" />
          )}
          <span
            className="text-sm font-black tracking-widest uppercase"
            style={{ color: "#524981" }}
          >
            {loading ? "Connecting..." : "Connect"}
          </span>

          {/* sweep shimmer */}
          <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-700 group-hover:[transform:skew(-12deg)_translateX(100%)]">
            <div className="relative h-full w-8" style={{ background: "rgba(59,10,130,0.12)" }} />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <div
          className="absolute -top-14 right-0 px-4 py-2 rounded-lg shadow-xl text-[10px] font-black uppercase tracking-widest z-50 whitespace-nowrap bg-zinc-900 border"
          style={{ color: "#7c3aed", borderColor: "rgba(59,10,130,0.3)" }}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-row items-center justify-end gap-3">
        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className={`${buttonBaseClass} border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/5`}
          title="Disconnect"
        >
          <MdLogout size={18} className="text-rose-500" />
          <span className="hidden md:inline text-xs font-black tracking-widest text-rose-500 uppercase">
            Disconnect
          </span>
        </button>
      </div>
    </div>
  );
}