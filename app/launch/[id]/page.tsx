"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@/app/contexts/WalletContext";
import {
  rpc as StellarRpc,
  TransactionBuilder,
  Networks,
  Address,
  scValToNative,
  Contract,
  nativeToScVal,
} from "@stellar/stellar-sdk";
import {
  ArrowLeft,
  Copy,
  CheckCheck,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Rocket,
  Coins,
  XCircle,
  CheckCircle2,
  Zap,
  X,
  Clock,
} from "lucide-react";
import { FaWallet } from "react-icons/fa";
import { AnimatePresence, motion } from "framer-motion";
import { LAUNCHES } from "@/app/lib/launches"; 

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const PASSPHRASE = Networks.TESTNET;
const server = new StellarRpc.Server(RPC_URL);

function stroopsToXlm(stroops: bigint | number): string {
  return (Number(stroops) / 10_000_000).toFixed(2);
}
function xlmToStroops(xlm: string): bigint {
  return BigInt(Math.floor(parseFloat(xlm) * 10_000_000));
}
function pct(funded: bigint, target: bigint): number {
  if (target === 0n) return 0;
  return Math.min(100, Number((funded * 100n) / target));
}
function fmtAddr(addr: string) {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

 
const STATUS_CFG: Record<
  number,
  { label: string; badge: string; heading: string }
> = {
  0: {
    label: "LIVE",
    badge: "text-violet-400 border-violet-500/30 bg-violet-500/10",
    heading: "Sale Live",
  },
  1: {
    label: "SUCCESS",
    badge: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    heading: "Sale Successful",
  },
  2: {
    label: "ENDED",
    badge: "text-zinc-400 border-zinc-600/30 bg-zinc-800/40",
    heading: "Sale Ended",
  },
};
 
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-zinc-600 hover:text-violet-400 transition-colors ml-1 shrink-0"
    >
      {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
    </button>
  );
}
 
function SkeletonRow() {
  return (
    <div className="flex justify-between py-3 border-b border-zinc-800/50">
      <div className="h-3 w-28 rounded bg-zinc-800 animate-pulse" />
      <div className="h-3 w-36 rounded bg-zinc-800 animate-pulse" />
    </div>
  );
}
 
function TimelineStep({
  title,
  desc,
  active,
  done,
}: {
  title: string;
  desc: string;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full mt-0.5 shrink-0 border-2 transition-colors
            ${
              done
                ? "bg-violet-500 border-violet-500"
                : active
                ? "bg-violet-400 border-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                : "bg-zinc-800 border-zinc-700"
            }`}
        />
        <div className="w-px flex-1 bg-zinc-800 mt-1" />
      </div>
      <div className="pb-5">
        <p
          className={`text-xs font-bold ${active ? "text-white" : done ? "text-zinc-400" : "text-zinc-600"}`}
        >
          {title}
        </p>
        <p className="text-[11px] text-zinc-600 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LaunchDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const launch = LAUNCHES.find((l: { id: string; }) => l.id === id);
  if (!launch) return notFound();

  const { address: connectedAddress, walletsKit, setAddress } = useWallet();

  // chain state
  const [state, setState] = useState<number | null>(null);
  const [funded, setFunded] = useState<bigint>(0n);
  const [target, setTarget] = useState<bigint>(0n);
  const [buyerBalance, setBuyerBalance] = useState<bigint>(0n);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [xlmBalance, setXlmBalance] = useState("0");
  const [chainLoading, setChainLoading] = useState(true);

  // ui state
  const [buyAmount, setBuyAmount] = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<{
    type: "success" | "error" | "pending";
    msg: string;
    hash?: string;
  } | null>(null);

  // ── Read chain ──────────────────────────────────────────────────────────────
  const readChain = useCallback(async () => {
    try {
      setChainLoading(true);
      const sourceAddress =
        connectedAddress ||
        "GDXK7EYVBXTITLBW2ZCODJW3B7VTVCNNNWDDEHKJ7Y67TZVW5VKRRMU6";
      const account = await server.getAccount(sourceAddress);
      const contract = new Contract(launch.launchpadId);

      const sim = async (method: string, ...args: any[]) => {
        const tx = new TransactionBuilder(account, {
          fee: "1000",
          networkPassphrase: PASSPHRASE,
        })
          .addOperation(contract.call(method, ...args))
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

      if (rawState !== null) setState(Number(rawState));
      if (rawFunded !== null) setFunded(BigInt(rawFunded));
      if (rawTarget !== null) setTarget(BigInt(rawTarget));

      if (connectedAddress) {
        const userScVal = new Address(connectedAddress).toScVal();
        const [rawBuyerBal, rawTokenBal] = await Promise.all([
          sim("get_buyer_balance", userScVal),
          (async () => {
            const tokenContract = new Contract(launch.tokenId);
            const tokenTx = new TransactionBuilder(account, {
              fee: "1000",
              networkPassphrase: PASSPHRASE,
            })
              .addOperation(tokenContract.call("balance", userScVal))
              .setTimeout(30)
              .build();
            const tokenSim = await server.simulateTransaction(tokenTx);
            return StellarRpc.Api.isSimulationSuccess(tokenSim)
              ? scValToNative(tokenSim.result!.retval)
              : null;
          })(),
        ]);
        if (rawBuyerBal !== null) setBuyerBalance(BigInt(rawBuyerBal));
        if (rawTokenBal !== null) setTokenBalance(BigInt(rawTokenBal));
      }
    } catch (e) {
      console.error("[detail] readChain error:", e);
    } finally {
      setChainLoading(false);
    }
  }, [connectedAddress, launch.launchpadId, launch.tokenId]);

  const loadXlmBalance = useCallback(async () => {
    if (!connectedAddress) return;
    try {
      const res = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${connectedAddress}`
      );
      const data = await res.json();
      const native = data.balances?.find((b: any) => b.asset_type === "native");
      setXlmBalance(native ? parseFloat(native.balance).toFixed(2) : "0");
    } catch {}
  }, [connectedAddress]);

  useEffect(() => {
    readChain();
  }, [readChain]);

  useEffect(() => {
    loadXlmBalance();
  }, [loadXlmBalance]);

  // auto-dismiss toast
  useEffect(() => {
    if (txStatus && txStatus.type !== "pending") {
      const t = setTimeout(() => setTxStatus(null), 10000);
      return () => clearTimeout(t);
    }
  }, [txStatus]);

  // ── Transactions ────────────────────────────────────────────────────────────
  const sendTx = async (method: string, ...args: any[]) => {
    if (!connectedAddress || !walletsKit) return;
    setTxLoading(true);
    setTxStatus({ type: "pending", msg: `Broadcasting ${method}…` });
    try {
      const account = await server.getAccount(connectedAddress);
      const contract = new Contract(launch.launchpadId);
      const tx = new TransactionBuilder(account, {
        fee: "10000",
        networkPassphrase: PASSPHRASE,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(30)
        .build();

      const prepared = await server.prepareTransaction(tx);
      const { signedTxXdr } = await walletsKit.signTransaction(
        prepared.toXDR()
      );
      const response = await server.sendTransaction(
        TransactionBuilder.fromXDR(signedTxXdr, PASSPHRASE)
      );

      if (response.status === "ERROR") throw new Error("Transaction rejected");

      const hash = response.hash;
      let getResponse = await server.getTransaction(hash);
      while (getResponse.status === "NOT_FOUND") {
        await new Promise((r) => setTimeout(r, 1000));
        getResponse = await server.getTransaction(hash);
      }

      if (getResponse.status === "SUCCESS") {
        setTxStatus({ type: "success", msg: "Transaction confirmed!", hash });
        await readChain();
        await loadXlmBalance();
      } else {
        throw new Error(`Transaction failed: ${getResponse.status}`);
      }
    } catch (err: any) {
      setTxStatus({ type: "error", msg: err.message || `${method} failed` });
    } finally {
      setTxLoading(false);
    }
  };

  const handleBuy = () => {
    if (!buyAmount || parseFloat(buyAmount) <= 0) return;
    sendTx(
      "buy",
      new Address(connectedAddress!).toScVal(),
      nativeToScVal(xlmToStroops(buyAmount), { type: "i128" })
    );
    setBuyAmount("");
  };
  const handleClaim = () =>
    sendTx("claim", new Address(connectedAddress!).toScVal());
  const handleRefund = () =>
    sendTx("refund", new Address(connectedAddress!).toScVal());

  // ── Derived ─────────────────────────────────────────────────────────────────
  const progress = pct(funded, target);
  const fundedXlm = stroopsToXlm(funded);
  const targetXlm = target > 0n ? stroopsToXlm(target) : String(launch.softCap);
  const myContrib = stroopsToXlm(buyerBalance);
  const myTokens = stroopsToXlm(tokenBalance);

  const offeredNum = parseFloat(launch.offered.split(" ")[0].replace(/,/g, ""));
  const rate =
    target > 0n && offeredNum > 0
      ? (Number(target) / 10_000_000 / offeredNum).toFixed(6)
      : "—";

  const canBuy = state === 0 && !!connectedAddress;
  const canClaim = state === 1 && buyerBalance > 0n && !!connectedAddress;
  const canRefund = state === 2 && buyerBalance > 0n && !!connectedAddress;

  const cfg = STATUS_CFG[state ?? 0];

  // Token icon placeholder
  const hue = launch.ticker
    .split("")
    .reduce((acc: any, c: string) => acc + c.charCodeAt(0), 0) % 360;

  // Metadata table rows
  const metaRows = [
    { label: "Presale Address", value: launch.launchpadId, copyable: true, link: `https://stellar.expert/explorer/testnet/contract/${launch.launchpadId}` },
    { label: "Token Name", value: launch.name },
    { label: "Token Symbol", value: launch.ticker },
    { label: "Token Address", value: launch.tokenId, copyable: true, link: `https://stellar.expert/explorer/testnet/contract/${launch.tokenId}` },
    { label: "Tokens For Presale", value: launch.offered },
    { label: "Tokens For Liquidity", value: `${launch.liquidity}% of raise` },
    { label: "Soft Cap", value: `${targetXlm} XLM` },
    { label: "Exchange Rate", value: `1 ${launch.ticker} = ${rate} XLM` },
    { label: "Network", value: "Stellar Testnet" },
    { label: "Liquidity %", value: `${launch.liquidity}%` },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-200 font-mono">
      {/* subtle grid bg */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#7c3aed 1px, transparent 1px), linear-gradient(90deg, #7c3aed 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 py-8 pb-28">
        {/* ── Back ── */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-violet-400 
                     text-xs tracking-wider transition-colors mb-8 group"
        >
          <ArrowLeft
            size={14}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          All Launches
        </Link>

        {/* ── Token header ── */}
        <div className="flex items-center gap-4 mb-8">
          {launch.icon ? (
            <img
              src={launch.icon}
              alt={launch.ticker}
              className="w-14 h-14 rounded-full border border-zinc-700 object-cover"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center 
                         text-sm font-black text-white border border-zinc-700 shrink-0"
              style={{ background: `hsl(${hue},55%,25%)` }}
            >
              {launch.ticker.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {launch.ticker} Fairlaunch
              </h1>
              {state !== null && !chainLoading && (
                <span
                  className={`text-[10px] font-bold px-3 py-1 rounded-full border tracking-widest ${cfg.badge}`}
                >
                  {cfg.label}
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-sm mt-0.5">{launch.name}</p>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

          {/* ── LEFT: metadata table ── */}
          <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/20">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                Token Info
              </h2>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {chainLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="px-6">
                      <SkeletonRow />
                    </div>
                  ))
                : metaRows.map(({ label, value, copyable, link }) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-6 py-3 
                                 hover:bg-zinc-800/20 transition-colors gap-4"
                    >
                      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
                      <div className="flex items-center gap-1 text-right">
                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-violet-400 hover:text-violet-300 
                                       font-mono transition-colors flex items-center gap-1"
                          >
                            {value.length > 20 ? fmtAddr(value as string) : value}
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-300 font-mono">
                            {value}
                          </span>
                        )}
                        {copyable && <CopyBtn value={value as string} />}
                      </div>
                    </div>
                  ))}
            </div>
          </div>

          {/* ── RIGHT: action panel ── */}
          <div className="space-y-4">

            {/* Progress card */}
            <div className="border border-zinc-800 rounded-2xl p-5 bg-zinc-900/20 space-y-4">
              <h2 className="text-sm font-black text-white">
                {chainLoading ? (
                  <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
                ) : (
                  cfg.heading
                )}
              </h2>

              {/* Funded / target */}
              {chainLoading ? (
                <div className="h-8 w-40 rounded bg-zinc-800 animate-pulse" />
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tabular-nums">
                    {fundedXlm}
                  </span>
                  <span className="text-zinc-500 text-sm">
                    / {targetXlm} XLM
                  </span>
                </div>
              )}

              {/* Bar */}
              <div className="space-y-1.5">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  {chainLoading ? (
                    <div className="h-full w-1/4 bg-zinc-700 animate-pulse rounded-full" />
                  ) : (
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-violet-700 to-violet-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  )}
                </div>
                <p className="text-[11px] text-violet-400 font-bold">
                  {chainLoading ? "" : `${progress.toFixed(2)}%`}
                </p>
              </div>

              {/* My contribution */}
              {connectedAddress && (
                <div className="pt-2 border-t border-zinc-800/60 space-y-1">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                    To claim
                  </p>
                  <div className="flex items-center justify-between bg-zinc-800/40 rounded-xl px-4 py-2.5">
                    <span className="text-sm font-bold text-white">
                      {myContrib} {launch.ticker}
                    </span>
                    <span className="text-xs text-zinc-500">{myContrib} XLM</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── Action: Buy ── */}
            {canBuy && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-zinc-800 rounded-2xl p-5 space-y-4 bg-zinc-900/20"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Zap size={13} className="text-violet-400" /> Participate
                  </p>
                  <span className="text-[10px] text-zinc-600">
                    Balance:{" "}
                    <span className="text-zinc-400">{xlmBalance} XLM</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 
                                 text-lg font-bold outline-none focus:border-violet-500/50 
                                 transition-colors pr-14"
                    />
                    <button
                      onClick={() =>
                        setBuyAmount(
                          String(
                            Math.max(0, parseFloat(xlmBalance) - 1).toFixed(2)
                          )
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] 
                                 font-bold text-violet-500 hover:text-violet-400 tracking-wider"
                    >
                      MAX
                    </button>
                  </div>
                  <span className="flex items-center text-zinc-500 text-sm font-bold px-1">
                    XLM
                  </span>
                </div>
                <button
                  onClick={handleBuy}
                  disabled={
                    txLoading ||
                    !buyAmount ||
                    parseFloat(buyAmount) <= 0 ||
                    parseFloat(buyAmount) > parseFloat(xlmBalance)
                  }
                  className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 
                             text-white font-black tracking-widest uppercase text-sm 
                             transition-all disabled:opacity-40 disabled:cursor-not-allowed 
                             active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {txLoading ? (
                    <>
                      <RotateCcw size={15} className="animate-spin" /> Broadcasting…
                    </>
                  ) : parseFloat(buyAmount || "0") > parseFloat(xlmBalance) ? (
                    <>
                      <AlertCircle size={15} /> Insufficient Balance
                    </>
                  ) : (
                    <>
                      <Rocket size={15} /> Buy {launch.ticker}
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* ── Action: Claim ── */}
            {canClaim && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-emerald-500/20 rounded-2xl p-5 space-y-4 bg-emerald-500/5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                    Launch Successful — Claim Tokens
                  </p>
                </div>
                <p className="text-zinc-400 text-sm">
                  You contributed{" "}
                  <span className="text-white font-bold">{myContrib} XLM</span>.
                  Claim your {launch.ticker} now.
                </p>
                <button
                  onClick={handleClaim}
                  disabled={txLoading}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 
                             text-black font-black tracking-widest uppercase text-sm 
                             transition-all disabled:opacity-40 active:scale-[0.98] 
                             flex items-center justify-center gap-2"
                >
                  {txLoading ? (
                    <>
                      <RotateCcw size={15} className="animate-spin" /> Claiming…
                    </>
                  ) : (
                    <>
                      <Coins size={15} /> Claim {myContrib} {launch.ticker}
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* ── Action: Refund ── */}
            {canRefund && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-rose-500/20 rounded-2xl p-5 space-y-4 bg-rose-500/5"
              >
                <div className="flex items-center gap-2">
                  <XCircle size={16} className="text-rose-400" />
                  <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">
                    Sale Ended — Claim Refund
                  </p>
                </div>
                <p className="text-zinc-400 text-sm">
                  Target not reached. Refund your{" "}
                  <span className="text-white font-bold">{myContrib} XLM</span>.
                </p>
                <button
                  onClick={handleRefund}
                  disabled={txLoading}
                  className="w-full py-3.5 rounded-xl border border-rose-500/30 
                             hover:bg-rose-500/10 text-rose-400 font-black tracking-widest 
                             uppercase text-sm transition-all disabled:opacity-40 
                             active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {txLoading ? (
                    <>
                      <RotateCcw size={15} className="animate-spin" /> Processing…
                    </>
                  ) : (
                    <>
                      <RotateCcw size={15} /> Refund {myContrib} XLM
                    </>
                  )}
                </button>
              </motion.div>
            )}

            {/* ── No wallet ── */}
            {!connectedAddress && state === 0 && (
              <div className="border border-dashed border-zinc-800 rounded-2xl p-6 text-center space-y-2">
                <p className="text-zinc-500 text-sm">
                  Connect your wallet to participate
                </p>
              </div>
            )}

            {/* ── Timeline ── */}
            <div className="border border-zinc-800 rounded-2xl p-5 bg-zinc-900/20">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-5">
                Sale Timeline
              </p>
              <div>
                <TimelineStep
                  title="Waiting for sale start"
                  desc="No one can purchase yet"
                  done={state !== null}
                />
                <TimelineStep
                  title="Sale Start"
                  desc="Participants can buy tokens"
                  active={state === 0}
                  done={(state ?? -1) > 0}
                />
                <TimelineStep
                  title="Sale End"
                  desc={
                    state === 1
                      ? "Target reached — success!"
                      : state === 2
                      ? "Deadline passed"
                      : "Deadline or target reached"
                  }
                  active={state === 1 || state === 2}
                  done={(state ?? -1) >= 1}
                />
                <TimelineStep
                  title="Claim tokens"
                  desc={
                    state === 1
                      ? "Claim your tokens now"
                      : state === 2
                      ? "Refund available"
                      : "Available after successful sale"
                  }
                  active={state === 1 || state === 2}
                  done={false}
                />
              </div>
            </div>

            {/* ── Contract links ── */}
            <div className="border border-zinc-800/50 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                Contracts
              </p>
              {[
                { label: "Launchpad", addr: launch.launchpadId },
                { label: "Token", addr: launch.tokenId },
              ].map(({ label, addr }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    {label}
                  </span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/contract/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-zinc-500 hover:text-violet-400 
                               transition-colors flex items-center gap-1"
                  >
                    {fmtAddr(addr)}
                    <ExternalLink size={10} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!connectedAddress && (
  <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xs px-4 z-50">
    <button
      onClick={() => {
        if (!walletsKit) return;
        walletsKit.openModal({
          onWalletSelected: async (option) => {
            const { address } = await walletsKit.getAddress();
            setAddress(address);
            return option;
          },
        });
      }}
            className="group relative w-full overflow-hidden rounded-2xl bg-zinc-950 
                       p-[1.5px] transition-all hover:scale-105 active:scale-95 
                       shadow-[0_0_40px_-10px_rgba(124,58,237,0.4)]"
          >
            <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#7c3aed_0%,#1e1b4b_50%,#7c3aed_100%)]" />
            <div className="relative flex h-full w-full items-center justify-center 
                            gap-3 rounded-[15px] bg-zinc-950 px-8 py-4 transition-all 
                            group-hover:bg-zinc-900/50 backdrop-blur-xl">
              <FaWallet className="text-violet-400 text-lg shrink-0" />
              <span className="text-sm font-black tracking-widest text-violet-400 uppercase">
                Connect Wallet
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ── TX Toast ── */}
      <AnimatePresence>
        {txStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed bottom-28 left-1/2 -translate-x-1/2 w-full max-w-sm 
                        mx-4 p-4 rounded-2xl flex items-center justify-between gap-4 
                        border z-50 backdrop-blur
              ${
                txStatus.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : txStatus.type === "error"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  : "bg-violet-500/10 border-violet-500/20 text-violet-400"
              }`}
          >
            <div className="flex items-center gap-3 font-bold text-sm">
              <AlertCircle size={15} />
              <span className="text-xs">{txStatus.msg}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {txStatus.hash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txStatus.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ExternalLink size={13} />
                </a>
              )}
              <button
                onClick={() => setTxStatus(null)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-500"
              >
                <X size={13} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}