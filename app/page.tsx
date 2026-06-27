"use client";

import LaunchGrid from "./components/LaunchGrid";
import { Rocket } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen text-zinc-200 font-mono">
      <div className="w-full bg-[#202025]">
        {/* Inner content constrained */}
        <section className="max-w-5xl mx-auto px-4 pt-16 pb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Token <span className="text-violet-400">Launchpad</span>
            </h1>
            <p className="text-zinc-500 mt-2 text-sm">
              Participate in new token launches on Stellar Soroban.
            </p>
          </div>
          <button
            className="px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 
      text-white font-bold text-sm tracking-wider transition-all flex items-center gap-2"
          >
            <Rocket size={15} /> Add Project
          </button>
        </section>
      </div>

      <LaunchGrid />
    </div>
  );
}
