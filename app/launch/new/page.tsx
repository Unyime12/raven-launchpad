"use client";


import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/app/contexts/WalletContext";
import {
  rpc as StellarRpc,
  TransactionBuilder,
  Networks,
  Address,
  Contract,
  Operation,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import {
  ArrowLeft,
  Rocket,
  Loader2,
  CheckCircle2,
  Copy,
  CheckCheck,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const PASSPHRASE = Networks.TESTNET;
const server = new StellarRpc.Server(RPC_URL);

const FUNDING_TOKEN = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

 
const TOKEN_WASM_HASH = "c552ac8473f0d43dd226709cb31ef27ce66cddb97f6f9db69faa41aeab0a33ec";
const LAUNCHPAD_WASM_HASH = "a8601fe73f7a55cae68c29532830b0c3fd02aa5ae5cf5d77bbe76b8bc35438be";

type StepStatus = "idle" | "pending" | "success" | "error";

interface StepState {
  status: StepStatus;
  error?: string;
}

function randomSalt(): Buffer {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes);
}

function StepBadge({ status }: { status: StepStatus }) {
  if (status === "pending")
    return <Loader2 size={14} className="animate-spin text-violet-400" />;
  if (status === "success")
    return <CheckCircle2 size={14} className="text-emerald-400" />;
  if (status === "error")
    return <AlertCircle size={14} className="text-rose-400" />;
  return <div className="w-3.5 h-3.5 rounded-full border border-zinc-700" />;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-1.5 text-xs font-bold text-violet-400 
                 hover:text-violet-300 transition-colors"
    >
      {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function NewLaunchPage() {
  const { address: connectedAddress, walletsKit } = useWallet();

  // form fields
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [softCap, setSoftCap] = useState("");  
  const [liquidity, setLiquidity] = useState("");
  const [offered, setOffered] = useState(""); //  
  const [deadline, setDeadline] = useState(""); 
  const [icon, setIcon] = useState("");
  const router = useRouter();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [launchId, setLaunchId] = useState<string | null>(null);

  // deploy state
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [launchpadId, setLaunchpadId] = useState<string | null>(null);



  const [steps, setSteps] = useState<Record<string, StepState>>({
    deployToken: { status: "idle" },
    deployLaunchpad: { status: "idle" },
    initToken: { status: "idle" },
    initLaunchpad: { status: "idle" },
  });

  const setStep = (key: string, state: StepState) =>
    setSteps((s) => ({ ...s, [key]: state }));

  const formValid =
    name && ticker && softCap && liquidity && offered && deadline;

  // ── Generic tx sender ──
  const submitOp = async (op: any): Promise<any> => {
    if (!connectedAddress || !walletsKit) throw new Error("Connect your wallet first");
    const account = await server.getAccount(connectedAddress);
    const tx = new TransactionBuilder(account, {
      fee: "10000000",  
      networkPassphrase: PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const { signedTxXdr } = await walletsKit.signTransaction(prepared.toXDR());
    const response = await server.sendTransaction(
      TransactionBuilder.fromXDR(signedTxXdr, PASSPHRASE)
    );
    if (response.status === "ERROR") throw new Error("Transaction rejected");

    let getResponse = await server.getTransaction(response.hash);
    while (getResponse.status === "NOT_FOUND") {
      await new Promise((r) => setTimeout(r, 1000));
      getResponse = await server.getTransaction(response.hash);
    }
    if (getResponse.status !== "SUCCESS") {
      throw new Error(`Transaction failed: ${getResponse.status}`);
    }
    return getResponse;
  };

  // ── Step 1: deploy token instance from existing wasm hash ──
  const deployToken = async () => {
    setStep("deployToken", { status: "pending" });
    try {
      const op = Operation.createCustomContract({
        address: new Address(connectedAddress!),
        wasmHash: Buffer.from(TOKEN_WASM_HASH, "hex"),
        salt: randomSalt(),
      });
      const result = await submitOp(op);
      const id = scValToNative(result.returnValue);
      setTokenId(id);
      setStep("deployToken", { status: "success" });
    } catch (e: any) {
      setStep("deployToken", { status: "error", error: e.message });
    }
  };

  // ── Step 2: deploy launchpad instance from existing wasm hash ──
  const deployLaunchpad = async () => {
    setStep("deployLaunchpad", { status: "pending" });
    try {
      const op = Operation.createCustomContract({
        address: new Address(connectedAddress!),
        wasmHash: Buffer.from(LAUNCHPAD_WASM_HASH, "hex"),
        salt: randomSalt(),
      });
      const result = await submitOp(op);
      const id = scValToNative(result.returnValue);
      setLaunchpadId(id);
      setStep("deployLaunchpad", { status: "success" });
    } catch (e: any) {
      setStep("deployLaunchpad", { status: "error", error: e.message });
    }
  };

  // ── Step 3: initialize token — admin = launchpad ──
  const initToken = async () => {
    if (!tokenId || !launchpadId) return;
    setStep("initToken", { status: "pending" });
    try {
      const contract = new Contract(tokenId);
      const op = contract.call(
        "initialize",
        new Address(launchpadId).toScVal()
      );
      await submitOp(op);
      setStep("initToken", { status: "success" });
    } catch (e: any) {
      setStep("initToken", { status: "error", error: e.message });
    }
  };

  // ── Step 4: initialize launchpad ──
  const initLaunchpad = async () => {
    if (!tokenId || !launchpadId) return;
    setStep("initLaunchpad", { status: "pending" });
    try {
      const targetStroops = BigInt(Math.floor(parseFloat(softCap) * 10_000_000));
      const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);

      const contract = new Contract(launchpadId);
      const op = contract.call(
        "initialize",
        new Address(tokenId).toScVal(), // token
        new Address(FUNDING_TOKEN).toScVal(), // funding_token
        nativeToScVal(targetStroops, { type: "i128" }), // target
        nativeToScVal(deadlineTs, { type: "u64" }) // deadline
      );
      await submitOp(op);
      setStep("initLaunchpad", { status: "success" });
    } catch (e: any) {
      setStep("initLaunchpad", { status: "error", error: e.message });
    }
  };

  const allDone =
    steps.deployToken.status === "success" &&
    steps.deployLaunchpad.status === "success" &&
    steps.initToken.status === "success" &&
    steps.initLaunchpad.status === "success";

  const nextId = `launch-${Date.now()}`; 
  const snippet = `{
  id: "${nextId}",
  name: "${name}",
  ticker: "${ticker}",
  launchpadId: "${launchpadId ?? ""}",
  tokenId: "${tokenId ?? ""}",
  softCap: ${softCap || 0},
  liquidity: ${liquidity || 0},
  offered: "${offered} ${ticker}",
  icon: "${icon || `https://emojicdn.elk.sh/🚀?style=twitter`}",
}`;

useEffect(() => {
    if (!allDone) return;
  
    const launchEntry = {
      id: `launch-${Date.now()}`,
      name,
      ticker,
      launchpadId,
      tokenId,
      softCap: Number(softCap),
      liquidity: Number(liquidity),
      offered: `${offered} ${ticker}`,
      icon: icon || "https://api.iconify.design/tabler/fish.svg",
    };
  
    fetch("/api/launches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(launchEntry),
    })
      .then((res) => res.json())
      .catch((e) => console.error("Failed to save launch:", e));
  }, [allDone]);

  return (
    <div className="min-h-screen bg-[#202025] text-zinc-200 font-mono">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-violet-400 
                     text-xs tracking-wider transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          All Launches
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Rocket size={20} className="text-violet-400" />
          <h1 className="text-2xl font-black text-white tracking-tight">
            Deploy New Launch
          </h1>
        </div>

        {!connectedAddress && (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-6 text-center mb-6">
            <p className="text-zinc-500 text-sm">
              Connect your wallet to deploy contracts.
            </p>
          </div>
        )}

        {/* ── Launch details form ── */}
        <div className="border border-zinc-800 rounded-2xl p-5 bg-zinc-900/20 space-y-4 mb-6">
          <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
            Launch Details
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Token Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Raven Token"
                className="w-full mt-1 bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Ticker</label>
              <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="RVN"
                className="w-full mt-1 bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Soft Cap (XLM)</label>
              <input value={softCap} onChange={(e) => setSoftCap(e.target.value)} type="number"
                placeholder="1000"
                className="w-full mt-1 bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Liquidity %</label>
              <input value={liquidity} onChange={(e) => setLiquidity(e.target.value)} type="number"
                placeholder="62.5"
                className="w-full mt-1 bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Tokens Offered</label>
              <input value={offered} onChange={(e) => setOffered(e.target.value)}
                placeholder="1900000"
                className="w-full mt-1 bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500/50" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Deadline</label>
              <input value={deadline} onChange={(e) => setDeadline(e.target.value)} type="datetime-local"
                className="w-full mt-1 bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500/50" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wider">Icon URL (optional)</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)}
                placeholder="https://emojicdn.elk.sh/🚀?style=twitter"
                className="w-full mt-1 bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500/50" />
            </div>
          </div>
        </div>

        {/* ── Deploy steps ── */}
        <div className="border border-zinc-800 rounded-2xl p-5 bg-zinc-900/20 space-y-5">
          <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
            On-chain Deployment
          </h2>

          {/* Step 1 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StepBadge status={steps.deployToken.status} />
              <div>
                <p className="text-sm font-bold text-white">1. Deploy Token Contract</p>
                {tokenId && <p className="text-[10px] text-zinc-500 mt-0.5">{tokenId}</p>}
                {steps.deployToken.error && (
                  <p className="text-[10px] text-rose-400 mt-0.5">{steps.deployToken.error}</p>
                )}
              </div>
            </div>
            <button
              onClick={deployToken}
              disabled={!connectedAddress || !formValid || steps.deployToken.status === "pending" || steps.deployToken.status === "success"}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 
                         text-xs font-bold text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {steps.deployToken.status === "success" ? "Done" : "Deploy"}
            </button>
          </div>

          {/* Step 2 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StepBadge status={steps.deployLaunchpad.status} />
              <div>
                <p className="text-sm font-bold text-white">2. Deploy Launchpad Contract</p>
                {launchpadId && <p className="text-[10px] text-zinc-500 mt-0.5">{launchpadId}</p>}
                {steps.deployLaunchpad.error && (
                  <p className="text-[10px] text-rose-400 mt-0.5">{steps.deployLaunchpad.error}</p>
                )}
              </div>
            </div>
            <button
              onClick={deployLaunchpad}
              disabled={!connectedAddress || steps.deployToken.status !== "success" || steps.deployLaunchpad.status === "pending" || steps.deployLaunchpad.status === "success"}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 
                         text-xs font-bold text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {steps.deployLaunchpad.status === "success" ? "Done" : "Deploy"}
            </button>
          </div>

          {/* Step 3 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StepBadge status={steps.initToken.status} />
              <div>
                <p className="text-sm font-bold text-white">3. Initialize Token </p>
                {steps.initToken.error && (
                  <p className="text-[10px] text-rose-400 mt-0.5">{steps.initToken.error}</p>
                )}
              </div>
            </div>
            <button
              onClick={initToken}
              disabled={steps.deployLaunchpad.status !== "success" || steps.initToken.status === "pending" || steps.initToken.status === "success"}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 
                         text-xs font-bold text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {steps.initToken.status === "success" ? "Done" : "Initialize"}
            </button>
          </div>

          {/* Step 4 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StepBadge status={steps.initLaunchpad.status} />
              <div>
                <p className="text-sm font-bold text-white">4. Initialize Launchpad</p>
                {steps.initLaunchpad.error && (
                  <p className="text-[10px] text-rose-400 mt-0.5">{steps.initLaunchpad.error}</p>
                )}
              </div>
            </div>
            <button
              onClick={initLaunchpad}
              disabled={steps.initToken.status !== "success" || steps.initLaunchpad.status === "pending" || steps.initLaunchpad.status === "success"}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 
                         text-xs font-bold text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              {steps.initLaunchpad.status === "success" ? "Done" : "Initialize"}
            </button>
          </div>
        </div>

        {/* ── Snippet output ── */}
       {allDone && (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="border border-emerald-500/20 rounded-2xl p-5 bg-emerald-500/5 mt-6 space-y-3"
  >
    <div className="flex items-center gap-2">
      {saveStatus === "saving" && (
        <>
          <Loader2 size={14} className="animate-spin text-emerald-400" />
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Deployed! — Saving...
          </p>
        </>
      )}
      {saveStatus === "saved" && (
        <>
          <CheckCircle2 size={14} className="text-emerald-400" />
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            Launch is live! — Routing...
          </p>
        </>
      )}
      {saveStatus === "error" && (
        <>
          <AlertCircle size={14} className="text-rose-400" />
          <p className="text-xs font-bold text-rose-400 uppercase tracking-widest">
            Contracts deployed, but saving failed — try again
          </p>
        </>
      )}
    </div>

    {saveStatus === "error" && (
      <button
        onClick={() => setSaveStatus("idle")}
        className="text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors"
      >
        Retry save
      </button>
    )}
  </motion.div>
)}
      </div>
    </div>
  );
}