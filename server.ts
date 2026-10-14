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
    secret: process.env.SESSION_SECRET || (() => { throw new Error("SESSION_SECRET must be configured."); })(),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax" },
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

function isAdminSession(req: any): boolean {
  const configuredAddress = process.env.ADMIN_WALLET_ADDRESS?.trim().toLowerCase();
  const sessionAddress = req.session?.siwe?.address?.toLowerCase();
  return Boolean(configuredAddress && sessionAddress && configuredAddress === sessionAddress);
}

function requireAdmin(req: any, res: any, next: any) {
  if (!isAdminSession(req)) {
    return res.status(403).json({ error: "Administrator wallet authentication required." });
  }
  next();
}

app.get("/api/admin/me", (req, res) => {
  if (!process.env.ADMIN_WALLET_ADDRESS) {
    return res.status(503).json({ authenticated: false, error: "ADMIN_WALLET_ADDRESS is not configured." });
  }
  if (!isAdminSession(req)) {
    return res.status(403).json({ authenticated: false, error: "This wallet is not authorized for administrator access." });
  }
  return res.json({ authenticated: true, address: (req.session as any).siwe.address });
});

app.post("/api/permit2-pull/submit", (_req, res) => {
  return res.status(410).json({ success: false, error: "This relayer endpoint has been disabled. No transaction was submitted." });
});

// Chat API Endpoints
app.get("/api/chat/messages", (req, res) => {
  const { sessionId, all } = req.query;

  if (all === "true") {
    // All-session access is restricted to the configured administrator wallet.
    if (!isAdminSession(req)) {
      return res.status(403).json({ error: "Administrator wallet authentication required." });
    }
    return res.json({ sessions: Object.values(chatSessionsStore) });
  }

  if (!sessionId || typeof sessionId !== "string") {
    return res.status(400).json({ error: "sessionId parameter is required" });
  }

  const session = chatSessionsStore[sessionId] || {
    sessionId,
    lastActive: new Date().toISOString(),
    messages: [],
    isAdminOverridden: false
  };

  if (!chatSessionsStore[sessionId]) {
    chatSessionsStore[sessionId] = session;
  }

  return res.json({ session });
});

app.post("/api/chat/message", (req, res) => {
  const { sessionId, userAddress, text, sender = "user" } = req.body || {};

  if (sender === "admin" && !isAdminSession(req)) {
    return res.status(403).json({ error: "Administrator wallet authentication required." });
  }
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

  // No canned bot replies or simulated support claims. Only real admin replies are displayed.

  return res.json({ session });
});

app.post("/api/chat/admin/toggle-override", requireAdmin, (req, res) => {
  const { sessionId, isAdminOverridden } = req.body || {};
  if (!sessionId || !chatSessionsStore[sessionId]) {
    return res.status(404).json({ error: "Session not found" });
  }

  chatSessionsStore[sessionId].isAdminOverridden = Boolean(isAdminOverridden);
  return res.json({ success: true, session: chatSessionsStore[sessionId] });
});

// Admin Protocol APIs
app.get("/api/admin/permits", requireAdmin, (req, res) => {
  return res.json({ permits: permitLogsStore });
});

app.get("/api/admin/stats", requireAdmin, (_req, res) => {
  return res.status(503).json({ available: false, error: "Live protocol metrics are not configured. No sample figures are provided." });
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
