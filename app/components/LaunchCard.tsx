"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  rpc as StellarRpc,
  TransactionBuilder,
  Networks,
  Contract,
  scValToNative,
} from "@stellar/stellar-sdk";
import {
  CheckCircle2,
  XCircle,
  Zap,
  ExternalLink,
  Droplets,
  Package,
} from "lucide-react";
import { motion } from "framer-motion";

export interface LaunchMeta {
  id: string; // unique slug, used in the URL: /launch/[id]
  name: string; // e.g. "MY TOKEN"
  ticker: string; // e.g. "MTK"
  launchpadId: string; // Soroban contract address
  tokenId: string; // Token contract address
  softCap: number; // target in XLM (display only — ground truth is on-chain)
  liquidity: number; // % going to LP (static, set at deploy time)
  offered: string; // e.g. "64 MTK"
  icon?: string | null; // URL to token icon, null = placeholder
}

interface ChainState {
  state: number; // 0 Running | 1 Success | 2 Expired
  funded: bigint;
  target: bigint;
}

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const PASSPHRASE = Networks.TESTNET;
const READ_ACCOUNT = "GDXK7EYVBXTITLBW2ZCODJW3B7VTVCNNNWDDEHKJ7Y67TZVW5VKRRMU6";

const server = new StellarRpc.Server(RPC_URL);

function stroopsToXlm(stroops: bigint): string {
  return (Number(stroops) / 10_000_000).toFixed(2);
}

function pct(funded: bigint, target: bigint): number {
  if (target === 0n) return 0;
  return Math.min(100, Number((funded * 100n) / target));
}

const STATUS: Record<
  number,
  { label: string; color: string; icon: React.ReactNode }
> = {
  0: {
    label: "LIVE",
    color: "text-violet-400 border-violet-500/30 bg-violet-500/10",
    icon: <Zap size={10} />,
  },
  1: {
    label: "SUCCESS",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    icon: <CheckCircle2 size={10} />,
  },
  2: {
    label: "ENDED",
    color: "text-zinc-500 border-zinc-700/40 bg-zinc-800/30",
    icon: <XCircle size={10} />,
  },
};

function TokenIcon({ icon, ticker }: { icon?: string | null; ticker: string }) {
  if (icon) {
    return (
      <img
        src={icon}
        alt={ticker}
        className="w-10 h-10 rounded-full object-cover border border-zinc-700"
      />
    );
  }
  // Deterministic background colour from ticker name
  const hue =
    ticker.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white border border-zinc-700 shrink-0"
      style={{ background: `hsl(${hue},55%,28%)` }}
    >
      {ticker.slice(0, 2)}
    </div>
  );
}

export default function LaunchCard({
  launch,
  onChainState,
}: {
  launch: LaunchMeta;
  onChainState?: (state: number) => void;
}) {
  const [chain, setChain] = useState<ChainState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchChain() {
      try {
        const account = await server.getAccount(READ_ACCOUNT);
        const contract = new Contract(launch.launchpadId);

        const sim = async (method: string) => {
          const tx = new TransactionBuilder(account, {
            fee: "1000",
            networkPassphrase: PASSPHRASE,
          })
            .addOperation(contract.call(method))
            .setTimeout(30)
            .build();

          const result = await server.simulateTransaction(tx);
          if (StellarRpc.Api.isSimulationSuccess(result)) {
            return scValToNative(result.result!.retval);
          }
          return null;
        };

        const [rawState, rawFunded, rawTarget] = await Promise.all([
          sim("get_state"),
          sim("get_funded"),
          sim("get_target"),
        ]);

        if (!cancelled) {
          const resolvedState = rawState !== null ? Number(rawState) : 0;
          const resolved: ChainState = {
            state: resolvedState,
            funded: rawFunded !== null ? BigInt(rawFunded) : 0n,
            target: rawTarget !== null ? BigInt(rawTarget) : 0n,
          };
          setChain(resolved);
          onChainState?.(resolvedState);
        }
      } catch (e) {
        console.error(`[LaunchCard] fetch error for ${launch.id}:`, e);
        if (!cancelled) {
          setChain({ state: 2, funded: 0n, target: 0n });
          onChainState?.(2);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchChain();
    return () => {
      cancelled = true;
    };
  }, [launch.launchpadId, launch.id]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const status = STATUS[chain?.state ?? 0];
  const progress = chain ? pct(chain.funded, chain.target) : 0;
  const fundedXlm = chain ? stroopsToXlm(chain.funded) : "—";
  const targetXlm = chain ? stroopsToXlm(chain.target) : String(launch.softCap);

  // 1 TOKEN = X XLM  (target / offered tokens — best effort parse)
  const offeredNum = parseFloat(launch.offered.split(" ")[0].replace(/,/g, ""));
  const rate =
    chain && chain.target > 0n && offeredNum > 0
      ? (Number(chain.target) / 10_000_000 / offeredNum).toFixed(6)
      : "—";

  const isLive = chain?.state === 0;
  const isEnded = chain?.state === 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border border-zinc-800 rounded-2xl p-5 bg-zinc-900/30 backdrop-blur
                 hover:border-violet-500/30 transition-all duration-200 space-y-4
                 flex flex-col"
    >
      {/* ── Row 1: icon + name + status badge ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <TokenIcon icon={launch.icon} ticker={launch.ticker} />
          <div className="min-w-0">
            <p className="font-black text-white text-base tracking-wide truncate">
              {launch.ticker}
            </p>
            <p className="text-[10px] text-zinc-500 truncate">{launch.name}</p>
          </div>
        </div>

        {/* Status badge */}
        {chain && !loading ? (
          <span
            className={`shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border tracking-widest ${status.color}`}
          >
            {status.icon}
            {status.label}
          </span>
        ) : (
          <span className="shrink-0 h-6 w-16 rounded-full bg-zinc-800 animate-pulse" />
        )}
      </div>

      {/* ── Row 2: exchange rate ── */}
      <div className="text-[11px] text-zinc-500">
        1 {launch.ticker} ={" "}
        <span className="text-zinc-300 font-bold">{rate} XLM</span>
      </div>

      {/* ── Row 3: soft cap ── */}
      <div>
        {loading ? (
          <div className="h-7 w-28 rounded bg-zinc-800 animate-pulse" />
        ) : (
          <>
            <p className="text-violet-400 text-xl font-black tabular-nums">
              {targetXlm}{" "}
              <span className="text-sm font-bold text-zinc-500">XLM</span>
            </p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">
              Soft Cap
            </p>
          </>
        )}
      </div>

      {/* ── Row 4: liquidity + offered ── */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Droplets size={11} className="text-violet-400/60" />
          <span>Liquidity:</span>
          <span className="text-zinc-300 font-bold ml-auto">
            {launch.liquidity}%
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Package size={11} className="text-violet-400/60" />
          <span>Offered:</span>
          <span className="text-zinc-300 font-bold ml-auto truncate">
            {launch.offered}
          </span>
        </div>
      </div>

      {/* ── Row 5: progress bar ── */}
      <div className="space-y-1.5">
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          {loading ? (
            <div className="h-full w-1/3 rounded-full bg-zinc-700 animate-pulse" />
          ) : (
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-700 to-violet-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600 tabular-nums">
          {loading ? (
            <>
              <span className="w-10 h-3 rounded bg-zinc-800 animate-pulse" />
              <span className="w-20 h-3 rounded bg-zinc-800 animate-pulse" />
            </>
          ) : (
            <>
              <span>Progress ({progress.toFixed(2)}%)</span>
              <span>
                {fundedXlm} / {targetXlm} XLM
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Row 6: action row ── */}
      <div className="flex gap-2 pt-1 mt-auto">
        {/* "Ended" pill — shown when not live */}
        <div
          className={`flex-1 py-2.5 rounded-xl text-center text-xs font-bold tracking-wider transition-colors
            ${
              isEnded
                ? "bg-zinc-800/50 text-zinc-500 border border-zinc-700/50"
                : isLive
                ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
        >
          {chain?.state === 0
            ? "LIVE"
            : chain?.state === 1
            ? "SUCCESS"
            : "ENDED"}
        </div>

        {/* View button */}
        <Link
          href={`/launch/${launch.id}`}
          className="flex-1 py-2.5 rounded-xl text-center text-xs font-black tracking-wider
                     bg-white hover:bg-white/55 text-black transition-colors
                     flex items-center justify-center gap-1.5"
        >
          View <ExternalLink size={11} />
        </Link>
      </div>
    </motion.div>
  );
}
