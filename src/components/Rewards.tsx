import React, { useState, useEffect } from 'react';
import { ExternalLink, LineChart as LineChartIcon, TrendingUp, Calendar, Award } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';
import { motion } from 'motion/react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { useTheme } from './ThemeProvider';

interface RewardsProps {
  prices?: { eth: number; steth: number };
}

type Period = '7D' | '30D' | '90D' | '1Y';

const generateChartData = (days: number, userBalance: number = 0) => {
  const data = [];
  const now = new Date();
  
  // If user balance is 0 or negative, return empty/zero dataset
  if (userBalance <= 0) {
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: 0,
        reward: 0,
        totalRewarded: 0
      });
    }
    return data;
  }

  // Calculate proportional historic growth based on active user balance
  let runningBalance = userBalance * 0.98;
  const initialBalance = runningBalance;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const dailyReward = (userBalance * 0.038) / 365;
    runningBalance += dailyReward;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      balance: parseFloat(runningBalance.toFixed(4)),
      reward: parseFloat(dailyReward.toFixed(5)),
      totalRewarded: parseFloat((runningBalance - initialBalance).toFixed(4))
    });
  }
  return data;
};

export default function Rewards({ prices = { eth: 3000, steth: 3000 } }: RewardsProps) {
  const { open } = useAppKit();
  const { isConnected, address: wagmiAddress } = useAccount();
  const [addressInput, setAddressInput] = useState('');
  const { theme } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30D');
  const [chartData, setChartData] = useState<any[]>([]);

  const address = wagmiAddress || addressInput;

  useEffect(() => {
    const periodDays = {
      '7D': 7,
      '30D': 30,
      '90D': 90,
      '1Y': 365
    };
    // If connected or tracking address, generate based on active balance (or 0 if zero balance)
    const trackedBalance = isConnected ? 0 : (addressInput.trim().length > 30 ? 0 : 0);
    setChartData(generateChartData(periodDays[selectedPeriod], trackedBalance));
  }, [selectedPeriod, isConnected, addressInput]);

  const stethPrice = prices.steth.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const isTracking = isConnected || addressInput.trim().length > 30;

  const currentBalance = chartData[chartData.length - 1]?.balance || 0;
  const totalRewarded = chartData[chartData.length - 1]?.totalRewarded || 0;
  const rewardedUsd = (totalRewarded * prices.steth).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full"
    >
      <div className="text-center mb-8">
        <h1 className="text-[28px] font-bold text-[var(--foreground)] mb-2 transition-colors duration-300">Reward History</h1>
        <p className="text-[var(--muted)] text-[15px] transition-colors duration-300">Track your Ethereum staking rewards with Lido</p>
      </div>

      <div className="bg-[var(--card)] rounded-[24px] p-4 md:p-6 mb-6 border border-[var(--border)] shadow-xl transition-colors duration-300">
        <div className="bg-[var(--input-bg)] rounded-[20px] p-4 border border-transparent focus-within:border-[var(--primary)]/40 focus-within:shadow-[0_0_20px_rgba(0,163,255,0.15)] transition-all">
          <input 
            type="text" 
            placeholder="Ethereum address (0x...)"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            className="bg-transparent text-[16px] font-medium outline-none w-full text-[var(--foreground)] placeholder-[var(--input-placeholder)] transition-colors duration-300" 
          />
        </div>
      </div>

      <div className="bg-[var(--card)] rounded-[24px] p-4 md:p-6 mb-6 border border-[var(--border)] shadow-xl space-y-4 transition-colors duration-300">
         <div className="flex justify-between items-center text-[15px]">
            <span className="text-[var(--muted)] transition-colors duration-300 flex items-center gap-2">
              <Award size={16} className="text-[var(--primary)]" />
              stETH balance
            </span>
            <span className="font-bold text-[var(--foreground)] transition-colors duration-300">
              {isTracking ? `${currentBalance.toFixed(4)} stETH` : '—'}
            </span>
         </div>
         <div className="flex justify-between items-center text-[15px]">
            <span className="text-[var(--muted)] transition-colors duration-300 flex items-center gap-2">
              <TrendingUp size={16} className="text-[var(--primary)]" />
              stETH rewarded
            </span>
            <div className="text-right">
              <span className="font-bold text-[var(--primary)] transition-colors duration-300">
                {isTracking ? `+${totalRewarded.toFixed(4)} stETH` : '—'}
              </span>
              {isTracking && (
                <span className="text-[12px] text-[var(--muted)] block">
                  ({rewardedUsd})
                </span>
              )}
            </div>
         </div>
         <div className="flex justify-between items-center text-[15px]">
            <span className="text-[var(--muted)] flex items-center transition-colors duration-300">
              Average APR * <span className="text-[var(--muted)] text-[10px] ml-1 bg-[var(--border)] rounded-full w-4 h-4 inline-flex items-center justify-center transition-colors duration-300">?</span>
            </span>
            <span className="font-bold text-[var(--primary)] transition-colors duration-300">3.8%</span>
         </div>
         <div className="flex justify-between items-center text-[15px]">
            <span className="text-[var(--muted)] transition-colors duration-300">stETH price</span>
            <span className="font-bold text-[var(--foreground)] transition-colors duration-300">{stethPrice}</span>
         </div>
      </div>

      <div className="bg-[var(--card)] rounded-[24px] p-6 md:p-8 mb-8 border border-[var(--border)] shadow-xl transition-colors duration-300 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <LineChartIcon size={20} className="text-[var(--primary)]" />
            <h3 className="text-[18px] font-bold text-[var(--foreground)] transition-colors duration-300">Reward Growth</h3>
          </div>
          
          {isTracking && (
            <div className="flex items-center bg-[var(--input-bg)] rounded-xl p-1 border border-[var(--border)]">
              {(['7D', '30D', '90D', '1Y'] as Period[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                    selectedPeriod === period
                      ? 'bg-[var(--card)] text-[var(--primary)] shadow-sm'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {isTracking ? (
          <div className="w-full h-[280px] -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReward" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 12 }} 
                  dy={10} 
                  minTickGap={24}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(val) => val.toFixed(3)}
                  width={55}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    borderColor: 'var(--border)',
                    borderRadius: '16px',
                    color: 'var(--foreground)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    padding: '12px 16px'
                  }}
                  itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                  labelStyle={{ color: 'var(--muted)', marginBottom: '4px', fontSize: '13px' }}
                  formatter={(value: number) => [`${value} stETH`, 'stETH Balance']}
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="var(--primary)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorReward)" 
                  animationDuration={1200}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--input-bg)] flex items-center justify-center mb-4 text-[var(--muted)]">
              <LineChartIcon size={32} />
            </div>
            <p className="text-[var(--muted)] text-[14px] mb-6 max-w-[280px]">
              Connect your wallet or enter your Ethereum address above to visualize your historical staking rewards.
            </p>
            <button 
              onClick={() => open()}
              className="px-6 py-3 rounded-full font-bold text-[15px] bg-[var(--primary)] hover:brightness-110 text-white transition-all shadow-[0_4px_12px_rgba(0,163,255,0.2)] cursor-pointer"
            >
              Connect wallet
            </button>
          </div>
        )}
      </div>

      <div className="text-[12px] text-[var(--muted)] leading-relaxed border-t border-[var(--border)] pt-6 pb-12 space-y-4 transition-colors duration-300">
        <p>
          * APR figures are estimates, not guaranteed, and are subject to change based on network conditions.
        </p>
        <p>
          Rewards may fluctuate and are influenced by factors outside the platform's control, including changes to blockchain protocols and validator performance. Past performance does not guarantee future results. Rewards are not assured and depend on the specific rules and mechanisms established by each underlying blockchain network. Users should conduct their own research, seek professional advice, and ensure they understand the risks before participating.
        </p>
        <p>
          Your privacy matters. We use cookieless analytics and collect only anonymized data for improvements. Cookies are used for functionality only. For more info read <a href="#" className="text-[var(--primary)] hover:underline">Privacy Notice</a>.
        </p>
        <p className="pt-4 border-t border-[var(--border)]">
          Lido is an open-source peer-to-system software suite that enables users to mint transferable utility tokens (stETH) which receive rewards linked to Ethereum validation activities.
        </p>
        <div className="flex flex-wrap items-center gap-4 font-medium text-[var(--foreground)] pt-2 transition-colors duration-300">
           <div className="w-4 h-4 flex items-center justify-center">
             <img src="https://cryptologos.cc/logos/lido-dao-ldo-logo.svg" alt="Lido" className="w-full h-full opacity-80" />
           </div>
           <a href="#" className="hover:text-[var(--primary)] transition-colors">Terms of Use</a>
           <a href="#" className="hover:text-[var(--primary)] transition-colors">Privacy Notice</a>
           <a href="#" className="flex items-center hover:text-[var(--primary)] transition-colors">IPFS <ExternalLink size={12} className="ml-1" /></a>
           <div className="ml-auto px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded-md text-[10px] text-[var(--muted)] transition-colors duration-300">
             v0.145.0
           </div>
        </div>
      </div>
    </motion.div>
  );
}

