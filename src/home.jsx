// ...existing code...
import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Target, Shield, RefreshCw, Bitcoin, DollarSign, BarChart3, TrendingUp as TrendIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// corrected firebase storageBucket and safe analytics init
const firebaseConfig = {
  apiKey: "AIzaSyAfYB-UOcFUOWTOcmpzPdAt1y-K6dXIhMg",
  authDomain: "stock-analysist.firebaseapp.com",
  projectId: "stock-analysist",
  storageBucket: "stock-analysist.appspot.com",
  messagingSenderId: "801305653825",
  appId: "1:801305653825:web:0b968a55e2920dc7144cc0",
  measurementId: "G-RJWSBWL97F"
};

let app;
let analytics;
try {
  // Initialize only in browser environments
  if (typeof window !== 'undefined') {
    app = initializeApp(firebaseConfig);
    // getAnalytics can throw if measurementId is missing or env unsupported
    try { analytics = getAnalytics(app); } catch (e) { /* ignore analytics init errors */ }
  }
} catch (e) {
  // ignore init errors (e.g. SSR or duplicate init)
}

// component
const EnhancedForexDashboard = () => {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [historicalData, setHistoricalData] = useState({});

  const assetDefinitions = [
    { base: 'EUR', quote: 'USD', display: 'EUR/USD', type: 'forex', category: 'Major' },
    { base: 'GBP', quote: 'USD', display: 'GBP/USD', type: 'forex', category: 'Major' },
    { base: 'USD', quote: 'JPY', display: 'USD/JPY', type: 'forex', category: 'Major' },
    { base: 'USD', quote: 'CAD', display: 'USD/CAD', type: 'forex', category: 'Commodity' },
    { base: 'EUR', quote: 'GBP', display: 'EUR/GBP', type: 'forex', category: 'Cross' },
    { base: 'BTC', quote: 'USD', display: 'BTC/USD', type: 'crypto', category: 'Cryptocurrency', icon: Bitcoin },
    { base: 'ETH', quote: 'USD', display: 'ETH/USD', type: 'crypto', category: 'Cryptocurrency', icon: Activity },
    { base: 'XAU', quote: 'USD', display: 'GOLD/USD', type: 'commodity', category: 'Precious Metal', icon: DollarSign },
    { base: 'XAG', quote: 'USD', display: 'SILVER/USD', type: 'commodity', category: 'Precious Metal' },
    { base: 'NAS100', quote: 'USD', display: 'NASDAQ 100', type: 'index', category: 'US Index', icon: BarChart3 },
    { base: 'US30', quote: 'USD', display: 'DOW JONES 30', type: 'index', category: 'US Index', icon: TrendIcon },
    { base: 'SPX500', quote: 'USD', display: 'S&P 500', type: 'index', category: 'US Index' }
  ];

  // -------------------------
  // Technical indicator helpers
  // -------------------------
  const calculateTechnicalIndicators = (data, assetType) => {
    if (!data || data.length < 14) return null;

    const prices = data.map(d => d.price).filter(p => p != null && !isNaN(p));
    if (prices.length < 14) return null;

    const rsi = calculateRSI(prices);
    const macd = calculateMACD(prices);
    const bollinger = calculateBollingerBands(prices);
    const volatility = calculateVolatility(prices);

    return {
      rsi,
      macd,
      bollinger,
      volatility,
      trend: determineTrend(prices),
      momentum: calculateMomentum(prices),
      support: Math.min(...prices.slice(-5)),
      resistance: Math.max(...prices.slice(-5))
    };
  };

  const calculateRSI = (prices, period = 14) => {
    if (!prices || prices.length < period) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateMACD = (prices) => {
    if (!prices || prices.length < 26) return { signal: 0, histogram: 0 };
    const ema12 = calculateEMA(prices.slice(-12), 12);
    const ema26 = calculateEMA(prices.slice(-26), 26);
    const macdLine = ema12 - ema26;
    return { signal: macdLine > 0 ? 1 : -1, histogram: macdLine };
  };

  const calculateEMA = (prices, period) => {
    if (!prices || prices.length === 0) return 0;
    let ema = prices[0];
    const multiplier = 2 / (period + 1);
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
  };

  const calculateBollingerBands = (prices, period = 20) => {
    if (!prices || prices.length < period) return { upper: 0, lower: 0, middle: 0 };
    const slice = prices.slice(-period);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return { upper: middle + (stdDev * 2), middle, lower: middle - (stdDev * 2) };
  };

  const calculateVolatility = (prices) => {
    if (!prices || prices.length < 2) return 0;
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] !== 0) returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    if (returns.length === 0) return 0;
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // percent annualized
  };

  const determineTrend = (prices) => {
    if (!prices || prices.length < 10) return 'neutral';
    const recent = prices.slice(-5);
    const older = prices.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    if (olderAvg === 0) return 'neutral';
    const change = (recentAvg - olderAvg) / olderAvg;
    if (change > 0.02) return 'bullish';
    if (change < -0.02) return 'bearish';
    return 'neutral';
  };

  const calculateMomentum = (prices) => {
    if (!prices || prices.length < 10) return 0;
    const current = prices[prices.length - 1];
    const past = prices[prices.length - 10];
    if (past === 0) return 0;
    return ((current - past) / past) * 100;
  };

  // -------------------------
  // Data fetching (simulated)
  // -------------------------
  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const newAssets = [];
      const timestamp = Date.now();

      for (const asset of assetDefinitions) {
        let basePrice = 1.0, change = 0, volatility = 1;
        if (asset.type === 'forex') {
          const rates = {
            'EURUSD': 1.0850 + (Math.random() - 0.5) * 0.02,
            'GBPUSD': 1.2750 + (Math.random() - 0.5) * 0.03,
            'USDJPY': 149.50 + (Math.random() - 0.5) * 2,
            'AUDUSD': 0.6550 + (Math.random() - 0.5) * 0.02,
            'USDCAD': 1.3650 + (Math.random() - 0.5) * 0.02,
            'USDCHF': 0.8850 + (Math.random() - 0.5) * 0.02,
            'NZDUSD': 0.6150 + (Math.random() - 0.5) * 0.02,
            'EURGBP': 0.8550 + (Math.random() - 0.5) * 0.02
          };
          const key = asset.base + asset.quote;
          basePrice = rates[key] || 1.0;
          volatility = 0.5 + Math.random() * 1.5;
          change = (Math.random() - 0.5) * 2;
        } else if (asset.type === 'crypto') {
          if (asset.base === 'BTC') {
            basePrice = 45000 + (Math.random() - 0.5) * 5000;
            volatility = 3 + Math.random() * 5;
          } else {
            basePrice = 2500 + (Math.random() - 0.5) * 500;
            volatility = 4 + Math.random() * 6;
          }
          change = (Math.random() - 0.5) * 8;
        } else if (asset.type === 'commodity') {
          if (asset.base === 'XAU') {
            basePrice = 2050 + (Math.random() - 0.5) * 50;
            volatility = 1 + Math.random() * 2;
          } else {
            basePrice = 25.5 + (Math.random() - 0.5) * 2;
            volatility = 1.5 + Math.random() * 2.5;
          }
          change = (Math.random() - 0.5) * 3;
        } else if (asset.type === 'index') {
          if (asset.base === 'NAS100') {
            basePrice = 18500 + (Math.random() - 0.5) * 500;
            volatility = 1.5 + Math.random() * 2;
          } else if (asset.base === 'US30') {
            basePrice = 38500 + (Math.random() - 0.5) * 400;
            volatility = 1.2 + Math.random() * 1.8;
          } else {
            basePrice = 5100 + (Math.random() - 0.5) * 100;
            volatility = 1.3 + Math.random() * 2;
          }
          change = (Math.random() - 0.5) * 4;
        }

        const spread = basePrice * (0.0001 + volatility * 0.00001);

        const assetData = {
          ...asset,
          price: parseFloat(basePrice.toFixed(asset.type === 'crypto' ? 2 : 5)),
          change: parseFloat(change.toFixed(2)),
          trend: change >= 0 ? 'bullish' : 'bearish',
          bid: parseFloat((basePrice - spread).toFixed(asset.type === 'crypto' ? 2 : 5)),
          ask: parseFloat((basePrice + spread).toFixed(asset.type === 'crypto' ? 2 : 5)),
          volume: Math.floor(Math.random() * 1000000000),
          marketCap: asset.type === 'crypto' ? Math.floor(basePrice * 19000000) : null,
          volatility: parseFloat(volatility.toFixed(2)),
          timestamp
        };

        newAssets.push(assetData);
      }

      // Update historicalData immutably
      setHistoricalData(prev => {
        const updated = { ...prev };
        newAssets.forEach(asset => {
          const existing = prev[asset.display] || [];
          updated[asset.display] = [
            ...existing,
            { time: new Date().toLocaleTimeString(), price: asset.price, volume: asset.volume }
          ].slice(-50);
        });
        return updated;
      });

      setAssets(newAssets);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep selectedAsset in sync when assets update
  useEffect(() => {
    if (!assets || assets.length === 0) return;
    if (!selectedAsset) {
      setSelectedAsset(assets[0]);
      return;
    }
    const updated = assets.find(a => a.display === selectedAsset.display);
    if (updated && JSON.stringify(updated) !== JSON.stringify(selectedAsset)) {
      setSelectedAsset(updated);
    }
  }, [assets, selectedAsset]);

  // -------------------------
  // Other analysis helpers
  // -------------------------
  const calculateSentimentScore = (asset, indicators) => {
    let score = 50;
    if (!indicators) return score;
    if (typeof indicators.rsi === 'number') {
      if (indicators.rsi > 70) score -= 15;
      else if (indicators.rsi < 30) score += 15;
    }
    if (indicators.macd?.signal > 0) score += 10;
    else score -= 10;
    if (indicators.trend === 'bullish') score += 20;
    else if (indicators.trend === 'bearish') score -= 20;
    if (indicators.volatility > 30) score -= 10;
    else if (indicators.volatility < 10) score += 5;
    score += (indicators.momentum || 0) * 0.2;
    return Math.max(0, Math.min(100, score));
  };

  const assessRisk = (asset, indicators) => {
    if (!indicators) return { level: 'medium', score: 50, factors: {} };
    const volatility = indicators.volatility;
    const momentum = indicators.momentum;
    let riskLevel = 'medium';
    let riskScore = 50;
    if (volatility > 40) { riskLevel = 'high'; riskScore = 80; }
    else if (volatility < 15) { riskLevel = 'low'; riskScore = 20; }
    if (asset.type === 'crypto') riskScore += 20;
    else if (asset.type === 'commodity' && asset.base === 'XAU') riskScore -= 10;
    else if (asset.type === 'index') riskScore -= 5;
    return { level: riskLevel, score: Math.max(0, Math.min(100, riskScore)), factors: { volatility, trendStrength: Math.abs(momentum), marketCondition: indicators.trend } };
  };

  const generateRecommendations = (asset, indicators, sentiment) => {
    const recommendations = [];
    if (!indicators || !asset) return recommendations;

    if (sentiment > 70 && indicators.trend === 'bullish') {
      recommendations.push({
        type: 'buy',
        strength: 'strong',
        reason: 'Strong bullish momentum with positive sentiment',
        entry: asset.price,
        stopLoss: indicators.support,
        takeProfit: indicators.resistance
      });
    } else if (sentiment < 30 && indicators.trend === 'bearish') {
      recommendations.push({
        type: 'sell',
        strength: 'strong',
        reason: 'Strong bearish momentum with negative sentiment',
        entry: asset.price,
        stopLoss: indicators.resistance,
        takeProfit: indicators.support
      });
    } else if (sentiment > 60) {
      recommendations.push({
        type: 'buy',
        strength: 'moderate',
        reason: 'Moderate bullish bias',
        entry: asset.price,
        stopLoss: indicators.support * 0.98,
        takeProfit: indicators.resistance * 1.02
      });
    } else if (sentiment < 40) {
      recommendations.push({
        type: 'sell',
        strength: 'moderate',
        reason: 'Moderate bearish bias',
        entry: asset.price,
        stopLoss: indicators.resistance * 1.02,
        takeProfit: indicators.support * 0.98
      });
    }

    const riskPerTrade = Math.max(0.1, Math.min(5, 10 - indicators.volatility / 5)); // percent
    const positionSize = `${Math.max(1, (10 - indicators.volatility / 10)).toFixed(1)}%`;
    recommendations.push({
      type: 'risk',
      strength: 'info',
      reason: `Risk management: Max ${riskPerTrade.toFixed(1)}% risk per trade recommended`,
      positionSize
    });

    if (asset.type === 'crypto') {
      recommendations.push({
        type: 'timing',
        strength: 'moderate',
        reason: 'Crypto markets operate 24/7 — consider session overlap for liquidity'
      });
    }

    return recommendations;
  };

  const predictPriceMovement = (asset, indicators) => {
    if (!indicators || !asset) return null;
    const volatility = indicators.volatility / 100;
    const trendMultiplier = indicators.trend === 'bullish' ? 1 : indicators.trend === 'bearish' ? -1 : 0;
    const momentumImpact = (indicators.momentum || 0) / 100;
    const shortTerm = asset.price * (1 + (trendMultiplier * 0.01 + momentumImpact * 0.005 + (Math.random() - 0.5) * volatility * 0.5));
    const mediumTerm = asset.price * (1 + (trendMultiplier * 0.03 + momentumImpact * 0.01 + (Math.random() - 0.5) * volatility));
    const longTerm = asset.price * (1 + (trendMultiplier * 0.05 + momentumImpact * 0.02 + (Math.random() - 0.5) * volatility * 1.5));
    return { '1h': shortTerm, '24h': mediumTerm, '7d': longTerm, confidence: Math.max(50, Math.min(95, 85 - volatility * 20)) };
  };

  const analyzeMarketContext = (asset, indicators) => {
    if (!indicators) return { regime: 'unknown', volatility: 'unknown', liquidity: 'unknown', session: determineCurrentSession(), newsImpact: 'unknown' };
    const context = { regime: determineMarketRegime(indicators), volatility: classifyVolatility(indicators.volatility), liquidity: 'high', session: determineCurrentSession(), newsImpact: 'moderate' };
    if (asset.type === 'forex') { context.liquidity = 'very-high'; context.newsImpact = 'high'; }
    else if (asset.type === 'crypto') { context.liquidity = 'medium'; context.newsImpact = 'very-high'; }
    else if (asset.type === 'index') { context.liquidity = 'high'; context.newsImpact = 'high'; }
    return context;
  };

  const determineMarketRegime = (indicators) => {
    if (!indicators) return 'unknown';
    if (indicators.volatility > 40) return 'high-volatility';
    if (indicators.volatility < 10) return 'low-volatility';
    if (indicators.trend === 'bullish' && indicators.momentum > 2) return 'bull-trend';
    if (indicators.trend === 'bearish' && indicators.momentum < -2) return 'bear-trend';
    return 'range-bound';
  };

  const classifyVolatility = (vol) => {
    if (vol > 40) return 'extreme';
    if (vol > 25) return 'high';
    if (vol > 15) return 'moderate';
    if (vol > 10) return 'low';
    return 'very-low';
  };

  const determineCurrentSession = () => {
    const hour = new Date().getHours();
    if (hour >= 13 && hour < 21) return 'US';
    if (hour >= 21 || hour < 5) return 'Asian';
    return 'European';
  };

  const calculateConfidence = (indicators, sentiment) => {
    if (!indicators) return 60;
    let confidence = 70;
    if (indicators.rsi && indicators.macd) confidence += 10;
    if (indicators.volatility < 20) confidence += 10;
    else if (indicators.volatility > 40) confidence -= 15;
    if (indicators.trend !== 'neutral') confidence += 10;
    if ((indicators.trend === 'bullish' && sentiment > 60) || (indicators.trend === 'bearish' && sentiment < 40)) confidence += 10;
    return Math.max(50, Math.min(95, confidence));
  };

  const determineTimeHorizon = (indicators, assetType) => {
    if (assetType === 'crypto') return 'short-term';
    if (indicators?.volatility > 30) return 'intraday';
    if (indicators?.trend !== 'neutral') return 'swing';
    return 'position';
  };

  const assessLiquidity = (asset, hist) => {
    if (!hist || hist.length === 0) return 'unknown';
    const avgVolume = hist.reduce((sum, d) => sum + (d.volume || 0), 0) / hist.length;
    if (avgVolume > 100000000) return 'very-high';
    if (avgVolume > 10000000) return 'high';
    if (avgVolume > 1000000) return 'medium';
    return 'low';
  };

  const analyzeCorrelations = (asset) => {
    const correlations = {};
    if (!asset) return correlations;
    if (asset.type === 'forex') {
      correlations['USD'] = asset.quote === 'USD' ? -0.8 : 0.6;
      correlations['Risk'] = asset.base === 'JPY' || asset.base === 'CHF' ? -0.5 : 0.3;
    } else if (asset.type === 'crypto') {
      correlations['BTC'] = asset.base === 'BTC' ? 1.0 : 0.7;
      correlations['Risk'] = 0.8;
    } else if (asset.type === 'commodity') {
      if (asset.base === 'XAU') { correlations['USD'] = -0.6; correlations['Inflation'] = 0.7; }
    }
    return correlations;
  };

  // -------------------------
  // Generate comprehensive analysis
  // -------------------------
  const generateComprehensiveAnalysis = useCallback((asset, histData) => {
    // require same minimum as technical indicator helper
    if (!asset || !histData || histData.length < 14) return null;
    const indicators = calculateTechnicalIndicators(histData, asset.type);
    if (!indicators) return null;
    const sentimentScore = calculateSentimentScore(asset, indicators);
    const riskAssessment = assessRisk(asset, indicators);
    const recommendations = generateRecommendations(asset, indicators, sentimentScore);
    const prediction = predictPriceMovement(asset, indicators);
    const marketContext = analyzeMarketContext(asset, indicators);
    return {
      ...indicators,
      sentiment: sentimentScore,
      risk: riskAssessment,
      recommendations,
      prediction,
      context: marketContext,
      confidence: calculateConfidence(indicators, sentimentScore),
      timeHorizon: determineTimeHorizon(indicators, asset.type),
      liquidity: assessLiquidity(asset, histData),
      correlation: analyzeCorrelations(asset)
    };
  }, []);

  // keep aiAnalysis in sync (avoid aiAnalysis in dependency to prevent extra reruns)
  useEffect(() => {
    if (!selectedAsset) return;
    const hist = historicalData[selectedAsset.display];
    if (!hist) return;
    const analysis = generateComprehensiveAnalysis(selectedAsset, hist);
    // shallow compare via JSON stringify is acceptable for this simulated data
    if (JSON.stringify(analysis) !== JSON.stringify(aiAnalysis)) {
      setAiAnalysis(analysis);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset, historicalData, generateComprehensiveAnalysis]);

  // Update chartData when selected asset price changes
  useEffect(() => {
    if (selectedAsset) {
      setChartData(prev => {
        const newData = { time: new Date().toLocaleTimeString(), price: selectedAsset.price };
        return [...prev, newData].slice(-30);
      });
    }
  }, [selectedAsset?.price]);

  // Initial fetch + polling every 40s
  useEffect(() => {
    fetchMarketData();
    const id = setInterval(fetchMarketData, 40000);
    return () => clearInterval(id);
  }, [fetchMarketData]);

  // UI helpers
  const getAssetColor = (asset) => {
    const colors = { forex: '#22d3ee', crypto: '#f59e0b', commodity: '#84cc16', index: '#8b5cf6' };
    return (asset && asset.type && colors[asset.type]) || '#22d3ee';
  };

  const getTrendColor = (trend) => trend === 'bullish' ? '#4ade80' : trend === 'bearish' ? '#f87171' : '#64748b';
  const getRiskColor = (level) => ({ low: '#4ade80', medium: '#f59e0b', high: '#f87171' }[level] || '#64748b');

  const getAssetIcon = (asset) => {
    if (!asset) return <Activity style={{ width: 16, height: 16 }} />;
    if (asset.icon) {
      const IconComponent = asset.icon;
      return <IconComponent style={{ width: 16, height: 16 }} />;
    }
    return <Activity style={{ width: 16, height: 16 }} />;
  };

  if (loading && assets.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ width: 64, height: 64, color: '#22d3ee', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#ffffff', fontSize: 20 }}>Loading market data...</p>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>Fetching forex, crypto, indices & commodities</p>
        </div>
      </div>
    );
  }

  const topTradeRec = aiAnalysis?.recommendations?.find(r => r.type === 'buy' || r.type === 'sell');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)', padding: 24 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, background: 'linear-gradient(135deg, #22d3ee, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Multi-Asset Trends
            </h1>
            <p style={{ color: '#94a3b8' }}>Multi-asset trading with AI-powered insights</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 14, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: error ? '#ef4444' : '#10b981', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
              {error ? 'Connection Error' : 'Live Data'}
            </div>
            {lastUpdate && <p style={{ color: '#64748b', fontSize: 12 }}>Last update: {lastUpdate.toLocaleTimeString()}</p>}
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 24, padding: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle style={{ color: '#f87171', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ color: '#fca5a5', fontWeight: 'bold' }}>Error loading data</p>
              <p style={{ color: '#f87171', fontSize: 14 }}>{error}</p>
            </div>
            <button onClick={fetchMarketData} style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        {/* Asset Categories */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['forex', 'crypto', 'commodity', 'index'].map(type => (
              <div key={type} style={{ padding: '8px 16px', background: 'rgba(30,41,59,0.5)', borderRadius: 8, border: `1px solid ${type === selectedAsset?.type ? getAssetColor({ type }) : 'rgba(59,130,246,0.08)'}` }}>
                {type.charAt(0).toUpperCase() + type.slice(1)} ({assets.filter(a => a.type === type).length})
              </div>
            ))}
          </div>
        </div>

        {/* Assets Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          {assets.map((asset) => {
            const isSelected = selectedAsset?.display === asset.display;
            return (
              <div key={asset.display} onClick={() => setSelectedAsset(asset)} style={{
                cursor: 'pointer',
                padding: 16,
                borderRadius: 12,
                border: `1px solid ${isSelected ? getAssetColor(asset) : 'rgba(51,65,85,0.3)'}`,
                background: isSelected ? 'rgba(34,211,238,0.03)' : 'rgba(15,23,42,0.6)',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {getAssetIcon(asset)}
                    <div>
                      <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{asset.display}</span>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{asset.category}</div>
                    </div>
                  </div>
                  <div>
                    {asset.trend === 'bullish' ? <TrendingUp style={{ color: '#4ade80', width: 16, height: 16 }} /> : asset.trend === 'bearish' ? <TrendingDown style={{ color: '#f87171', width: 16, height: 16 }} /> : <Activity style={{ color: '#64748b', width: 16, height: 16 }} />}
                  </div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 }}>{asset.price}</div>
                <div style={{ fontSize: 14, color: asset.change >= 0 ? '#4ade80' : '#f87171' }}>{asset.change >= 0 ? '+' : ''}{asset.change}%</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                  <span>Vol: {asset.volatility}%</span>
                  <span style={{ color: getAssetColor(asset) }}>{asset.type.toUpperCase()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {selectedAsset && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <div style={{ background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(4px)', borderRadius: 12, border: '1px solid rgba(51,65,85,0.5)', padding: 16 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                <div style={{ flex: '1 1 320px', background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: 16, border: `1px solid ${getRiskColor(aiAnalysis?.risk?.level || 'medium')}33` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Shield style={{ color: getRiskColor(aiAnalysis?.risk?.level || 'medium') }} />
                    <h4 style={{ margin: 0, color: '#ffffff' }}>Risk Management</h4>
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>Risk Score</div>
                      <div style={{ color: getRiskColor(aiAnalysis?.risk?.level || 'medium'), fontWeight: 'bold', fontSize: 18 }}>{aiAnalysis?.risk?.score ?? 'N/A'}/100</div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>Max Position Size</div>
                      <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18 }}>{aiAnalysis?.risk ? `${Math.max(1, 10 - aiAnalysis.risk.score / 10).toFixed(1)}%` : 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>Recommended Stop Loss</div>
                      <div style={{ color: '#f87171', fontWeight: 'bold', fontSize: 18 }}>{aiAnalysis?.risk ? `${Math.max(1, Math.min(5, aiAnalysis.risk.score / 20)).toFixed(1)}%` : 'N/A'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ width: 320, background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: 12, border: '1px solid rgba(51,65,85,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Target style={{ color: '#22d3ee' }} />
                    <h4 style={{ margin: 0, color: '#ffffff' }}>Trading Levels (SL/TP)</h4>
                  </div>
                  {topTradeRec ? (
                    <div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>Type</div>
                      <div style={{ color: topTradeRec.type === 'buy' ? '#4ade80' : '#f87171', fontWeight: 'bold', fontSize: 18 }}>{topTradeRec.type.toUpperCase()} {topTradeRec.strength ? `(${topTradeRec.strength})` : ''}</div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>Entry</div>
                        <div style={{ color: '#60a5fa', fontWeight: 'bold' }}>{typeof topTradeRec.entry === 'number' ? topTradeRec.entry.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>SL</div>
                        <div style={{ color: '#f87171', fontWeight: 'bold' }}>{typeof topTradeRec.stopLoss === 'number' ? topTradeRec.stopLoss.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>TP</div>
                        <div style={{ color: '#4ade80', fontWeight: 'bold' }}>{typeof topTradeRec.takeProfit === 'number' ? topTradeRec.takeProfit.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8' }}>No immediate trade recommendation</div>
                  )}
                </div>
              </div>

              <div style={{ position: 'relative', height: 360, borderRadius: 8, overflow: 'hidden', background: 'rgba(15,23,42,0.2)' }}>
                <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 20 }}>
                  <div style={{ background: 'rgba(0,0,0,0.6)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)', color: '#fff', minWidth: 220 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Top Recommendation</div>
                    {topTradeRec ? (
                      <>
                        <div style={{ fontWeight: 'bold', color: topTradeRec.type === 'buy' ? '#4ade80' : '#f87171', fontSize: 16 }}>{topTradeRec.type.toUpperCase()} {topTradeRec.strength ? `(${topTradeRec.strength})` : ''}</div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 13 }}>
                          <div style={{ color: '#94a3b8' }}>Entry</div>
                          <div style={{ color: '#60a5fa' }}>{typeof topTradeRec.entry === 'number' ? topTradeRec.entry.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                          <div style={{ color: '#94a3b8' }}>SL</div>
                          <div style={{ color: '#f87171' }}>{typeof topTradeRec.stopLoss === 'number' ? topTradeRec.stopLoss.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                          <div style={{ color: '#94a3b8' }}>TP</div>
                          <div style={{ color: '#4ade80' }}>{typeof topTradeRec.takeProfit === 'number' ? topTradeRec.takeProfit.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#94a3b8', marginTop: 6 }}>No trade rec</div>
                    )}
                  </div>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData[selectedAsset.display] || []} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getAssetColor(selectedAsset)} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={getAssetColor(selectedAsset)} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#64748b" style={{ fontSize: 12 }} />
                    <YAxis domain={['auto', 'auto']} stroke="#64748b" style={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} labelStyle={{ color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="price" stroke={getAssetColor(selectedAsset)} strokeWidth={2} fill="url(#colorGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginTop: 16 }}>
                <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: 12, border: '1px solid rgba(51,65,85,0.3)' }}>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>Current Price</div>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{selectedAsset.price}</div>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: 12, border: '1px solid rgba(51,65,85,0.3)' }}>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>Spread</div>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{typeof selectedAsset.ask === 'number' && typeof selectedAsset.bid === 'number' ? (selectedAsset.ask - selectedAsset.bid).toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: 12, border: '1px solid rgba(51,65,85,0.3)' }}>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>Change</div>
                  <div style={{ color: selectedAsset.change >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold', fontSize: 18 }}>{selectedAsset.change >= 0 ? '+' : ''}{selectedAsset.change}%</div>
                </div>
                <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: 12, border: '1px solid rgba(51,65,85,0.3)' }}>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>Volatility</div>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{selectedAsset.volatility}%</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              {/* AI Price Predictions */}
              <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 12, border: '1px solid rgba(51,65,85,0.5)', padding: 16 }}>
                <h3 style={{ color: '#fff', marginTop: 0 }}>AI Price Predictions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  {aiAnalysis?.prediction ? Object.entries(aiAnalysis.prediction).filter(([k]) => k !== 'confidence').map(([tf, price]) => {
                    const pct = ((price - selectedAsset.price) / selectedAsset.price) * 100;
                    return (
                      <div key={tf} style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{tf.toUpperCase()}</div>
                        <div style={{ fontSize: 20, fontWeight: 'bold', color: price > selectedAsset.price ? '#4ade80' : '#f87171' }}>{(typeof price === 'number') ? price.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                        <div style={{ color: price > selectedAsset.price ? '#4ade80' : '#f87171', fontSize: 12 }}>{price > selectedAsset.price ? '+' : ''}{pct.toFixed(2)}%</div>
                      </div>
                    );
                  }) : (
                    <div style={{ color: '#94a3b8' }}>Predictions not available yet</div>
                  )}
                </div>
                <div style={{ marginTop: 12, color: '#60a5fa', fontSize: 13 }}>Prediction Confidence: {aiAnalysis?.prediction?.confidence ? `${aiAnalysis.prediction.confidence.toFixed(0)}%` : 'N/A'}</div>
              </div>

              {/* Technical Indicators */}
              <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 12, border: '1px solid rgba(51,65,85,0.5)', padding: 16 }}>
                <h3 style={{ color: '#fff', marginTop: 0 }}>Technical Indicators</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>RSI (14)</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: (aiAnalysis?.rsi > 70 ? '#f87171' : aiAnalysis?.rsi < 30 ? '#4ade80' : '#f59e0b') }}>{typeof aiAnalysis?.rsi === 'number' ? aiAnalysis.rsi.toFixed(1) : 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>MACD Signal</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: aiAnalysis?.macd?.signal > 0 ? '#4ade80' : '#f87171' }}>{aiAnalysis?.macd ? (aiAnalysis.macd.signal > 0 ? 'BULLISH' : 'BEARISH') : 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>Support</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#4ade80' }}>{typeof aiAnalysis?.support === 'number' ? aiAnalysis.support.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>Resistance</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f87171' }}>{typeof aiAnalysis?.resistance === 'number' ? aiAnalysis.resistance.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Trading Recommendations */}
              <div style={{ background: 'rgba(30,41,59,0.5)', borderRadius: 12, border: '1px solid rgba(51,65,85,0.5)', padding: 16 }}>
                <h3 style={{ color: '#fff', marginTop: 0 }}>AI Trading Recommendations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(aiAnalysis?.recommendations && aiAnalysis.recommendations.length > 0) ? aiAnalysis.recommendations.map((rec, idx) => (
                    <div key={idx} style={{ padding: 12, background: rec.type === 'buy' ? 'rgba(34,197,94,0.08)' : rec.type === 'sell' ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.06)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ color: rec.type === 'buy' ? '#4ade80' : rec.type === 'sell' ? '#f87171' : '#60a5fa', fontWeight: 'bold' }}>{rec.type.toUpperCase()} {rec.strength ? `(${rec.strength})` : ''}</div>
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>{rec.positionSize ?? ''}</div>
                      </div>
                      <div style={{ color: '#cbd5e1', marginTop: 8 }}>{rec.reason}</div>
                      {rec.stopLoss && rec.takeProfit && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                          <div style={{ color: '#f87171' }}>SL: {typeof rec.stopLoss === 'number' ? rec.stopLoss.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : rec.stopLoss}</div>
                          <div style={{ color: '#4ade80' }}>TP: {typeof rec.takeProfit === 'number' ? rec.takeProfit.toFixed(selectedAsset.type === 'crypto' ? 2 : 5) : rec.takeProfit}</div>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div style={{ color: '#94a3b8' }}>No recommendations available</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 24, padding: 16, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, textAlign: 'center' }}>
          <p style={{ color: '#bfdbfe', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Activity style={{ width: 16, height: 16 }} />
            <span><span style={{ fontWeight: 'bold' }}>Multi-Asset Analysis:</span> Real-time forex, crypto, indices & commodities data. AI-powered insights update every 40 seconds.</span>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
    </div>
  );
};

export default EnhancedForexDashboard;
// ...existing code...
