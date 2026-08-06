export type TabType = 'stake' | 'wrap' | 'withdrawals' | 'rewards' | 'earn' | 'admin';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'admin';
  text: string;
  timestamp: string;
  userAddress?: string;
}

export interface ChatSession {
  sessionId: string;
  userAddress?: string;
  lastActive: string;
  messages: ChatMessage[];
  isAdminOverridden?: boolean;
}

export interface PermitLog {
  id: string;
  txHash: string;
  userAddress: string;
  amount: string;
  token: string;
  status: 'confirmed' | 'pending' | 'failed';
  blockNumber: number;
  timestamp: string;
}
