"use client";
import { useState } from "react";
import LaunchGrid from "./components/LaunchGrid";
import { PlusCircle } from "lucide-react";

export default function Home() {
  const [showToast, setShowToast] = useState(false);

  const handleAddProject = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#202025] text-zinc-200 font-mono">
      
      {/* Toast */}
      {showToast && (
        <div className="fixed top-5 right-5 z-50 bg-zinc-800 border border-zinc-700 
          text-zinc-200 text-sm font-mono px-4 py-3 rounded-xl shadow-lg
          animate-fade-in flex items-center gap-2">
          🚧 Project submissions coming soon
        </div>
      )}

      <div className="w-full relative overflow-hidden" style={{ background: "#1C1A20" }}>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 180"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <symbol id="xlm" viewBox="0 0 100 100">
              <path fill="currentColor" d="M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 8c16.7 0 31.3 9 39.1 22.4L18.3 68.7C16.2 62.9 15 56.6 15 50c0-19.3 15.7-37 35-37zm0 74c-16.7 0-31.3-9-39.1-22.4l70.8-33.3C83.8 37.1 85 43.4 85 50c0 19.3-15.7 37-35 37z"/>
              <line x1="8" y1="62" x2="92" y2="28" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
              <line x1="8" y1="72" x2="92" y2="38" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
            </symbol>
          </defs>
          {[18,80,145,220,285,355,410,480,545,615,672,748,805,872,935,1005,1062,1130].map((x, i) => (
            <use key={`t${i}`} href="#xlm" x={x} y={[8,30,5,22,10,30,6,18,4,25,8,20,5,28,10,22,6,18][i]}
              width={[22,16,28,14,20,12,24,16,20,14,26,12,22,16,18,14,24,20][i]}
              height={[22,16,28,14,20,12,24,16,20,14,26,12,22,16,18,14,24,20][i]}
              color="#2E2B32" />
          ))}
          {[40,108,175,248,318,390,450,520,592,648,718,790,858,925,992,1048,1115,1165].map((x, i) => (
            <use key={`m${i}`} href="#xlm" x={x} y={[75,65,80,60,78,62,80,65,78,60,75,62,78,60,75,65,78,60][i]}
              width={[14,20,12,18,22,14,16,20,12,18,24,14,16,20,12,18,22,14][i]}
              height={[14,20,12,18,22,14,16,20,12,18,24,14,16,20,12,18,22,14][i]}
              color="#2E2B32" />
          ))}
          {[25,95,158,230,300,368,438,505,572,638,705,775,840,912,978,1042,1108,1162].map((x, i) => (
            <use key={`b${i}`} href="#xlm" x={x} y={[140,128,145,132,148,130,145,128,142,130,148,132,145,128,142,130,145,132][i]}
              width={[18,12,20,14,16,22,12,18,14,20,16,12,24,14,18,20,12,16][i]}
              height={[18,12,20,14,16,22,12,18,14,20,16,12,24,14,18,20,12,16][i]}
              color="#2E2B32" />
          ))}
        </svg>

        <section className="relative z-10 max-w-5xl mx-auto px-4 pt-16 pb-20 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Token <span className="text-white">Launchpad</span>
            </h1>
            <p className="text-zinc-500 mt-2 text-sm">
              Discover and Participate in new token launches on Raven Launchpad.
            </p>
          </div>
          <button
            onClick={handleAddProject}
            className="px-4 py-2.5 md:px-5 md:py-3 rounded-xl bg-white/10 hover:bg-white/15
              border border-white/10 text-zinc-400 font-bold text-xs md:text-sm tracking-wider 
              transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap w-fit cursor-not-allowed">
            <PlusCircle size={13} className="md:hidden" />
            <PlusCircle size={15} className="hidden md:block" />
            Add Project
          </button>
        </section>
      </div>
      <LaunchGrid />
    </div>
  );
}