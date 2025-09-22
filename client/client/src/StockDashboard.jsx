import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Bell, Plus, Minus, Eye, Settings, RefreshCw } from 'lucide-react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

const StockDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolio, setPortfolio] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  
  const [notifications, setNotifications] = useState([
    { id: 1, message: 'AAPL hit your price target of $175', type: 'success', time: '2 min ago' }, { id: 2, message: 'TSLA dropped 3% below your stop-loss', type: 'warning', time: '5 min ago' }, { id: 3, message: 'Market opened with strong gains', type: 'info', time: '30 min ago' }
  ]);
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [simulationMode, setSimulationMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [portfolioRes, watchlistRes, historicalRes] = await Promise.all([
            fetch('http://localhost:4000/api/portfolio'),
            fetch('http://localhost:4000/api/watchlist'),
            fetch('http://localhost:4000/api/historical-data')
        ]);
        setPortfolio(await portfolioRes.json());
        setWatchlist(await watchlistRes.json());
        setHistoricalData(await historicalRes.json());
      } catch (error) { console.error("Failed to fetch initial data:", error); }
    };
    
    fetchInitialData();
    socket.on('data-update', (data) => {
      setPortfolio(data.portfolio);
      setWatchlist(data.watchlist);
      setLastUpdate(new Date());
    });
    return () => { socket.off('data-update'); };
  }, []);

  const handleAddToPortfolio = async (symbol) => {
    try {
        await fetch('http://localhost:4000/api/portfolio/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
        });
    } catch (error) { console.error("Failed to add stock:", error); }
  };

  const handleSellFromPortfolio = async (symbol) => {
    try {
        await fetch('http://localhost:4000/api/portfolio/sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol })
        });
    } catch (error) { console.error("Failed to sell stock:", error); }
  };

  const totalPortfolioValue = portfolio.reduce((sum, stock) => sum + (stock.shares * stock.currentPrice), 0);
  const totalGainLoss = portfolio.reduce((sum, stock) => sum + (stock.shares * (stock.currentPrice - stock.avgPrice)), 0);
  const totalCostBasis = totalPortfolioValue - totalGainLoss;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;
  
  const portfolioComposition = portfolio.map(stock => ({ name: stock.symbol, value: stock.shares * stock.currentPrice }));
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const StatCard = ({ title, value, change, icon: Icon, prefix = '' }) => (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-600">{title}</p><p className="text-2xl font-bold text-gray-900 mt-1">{prefix}{value}</p>{change !== undefined && (<div className={`flex items-center mt-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}<span className="text-sm font-medium">{Math.abs(change).toFixed(2)}%</span></div>)}</div><div className="p-3 bg-blue-50 rounded-full"><Icon className="w-6 h-6 text-blue-600" /></div></div></div>
  );
  
  const StockRow = ({ stock, type = 'portfolio', onAdd, onSell }) => (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex-1"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">{stock.symbol.charAt(0)}</div><div><h3 className="font-semibold text-gray-900">{stock.symbol}</h3><p className="text-sm text-gray-500">{stock.name}</p></div></div></div>
      <div className="text-right"><p className="font-semibold text-gray-900">${(type === 'portfolio' ? stock.currentPrice : stock.price).toFixed(2)}</p><div className={`flex items-center justify-end ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stock.change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}<span className="text-sm">{stock.change.toFixed(2)}%</span></div></div>
      {type === 'portfolio' && (<div className="text-right ml-6 w-28"><p className="text-sm text-gray-600">{stock.shares} shares</p><p className="font-semibold">${(stock.shares * stock.currentPrice).toFixed(2)}</p></div>)}
      <div className="ml-4 flex gap-2">
        {type === 'watchlist' && (
            <button onClick={() => onAdd(stock.symbol)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Add to Portfolio">
                <Plus className="w-4 h-4" />
            </button>
        )}
        {type === 'portfolio' && (
            <button onClick={() => onSell(stock.symbol)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sell from Portfolio">
                <Minus className="w-4 h-4" />
            </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <header className="bg-white shadow-lg border-b border-gray-200"><div className="max-w-7xl mx-auto px-6 py-4"><div className="flex items-center justify-between"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center"><BarChart3 className="w-6 h-6 text-white" /></div><div><h1 className="text-2xl font-bold text-gray-900">Stock Market Dashboard</h1><p className="text-sm text-gray-600">Real-time portfolio management & trading simulation</p></div></div><div className="flex items-center gap-4"><div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>{simulationMode ? 'Simulation Mode' : 'Live Trading'}</div><div className="relative"><button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"><Bell className="w-5 h-5" /><span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span></button>{showNotifications && (<div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-10"><div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-gray-900">Notifications</h3></div><div className="max-h-64 overflow-y-auto">{notifications.map(notif => (<div key={notif.id} className="p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"><p className="text-sm text-gray-900">{notif.message}</p><p className="text-xs text-gray-500 mt-1">{notif.time}</p></div>))}</div></div>)}</div><button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><Settings className="w-5 h-5" /></button></div></div><nav className="flex gap-6 mt-4">{['dashboard', 'portfolio', 'watchlist', 'analytics'].map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{tab}</button>))} </nav></div></header>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Portfolio Value" value={totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} change={totalGainLossPercent} icon={DollarSign} prefix="$" />
              <StatCard title="Total Gain/Loss" value={Math.abs(totalGainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} change={totalGainLossPercent} icon={totalGainLoss >= 0 ? TrendingUp : TrendingDown} prefix={totalGainLoss >= 0 ? '+$' : '-$'} />
              <StatCard title="Active Positions" value={portfolio.length} icon={Activity} />
              <StatCard title="Watchlist Items" value={watchlist.length} icon={Eye} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900">Portfolio Performance</h3><button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button></div><ResponsiveContainer width="100%" height={300}><LineChart data={historicalData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis tickFormatter={(value) => `$${(value/1000)}k`} /><Tooltip formatter={(value) => `$${value.toLocaleString()}`} /><Legend /><Line type="monotone" dataKey="portfolio" stroke="#3B82F6" strokeWidth={3} name="Your Portfolio" /><Line type="monotone" dataKey="market" stroke="#10B981" strokeWidth={2} name="Market Index" /></LineChart></ResponsiveContainer></div>
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"><h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Composition</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={portfolioComposition} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{portfolioComposition.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value) => `$${value.toLocaleString()}`} /><Legend /></PieChart></ResponsiveContainer></div>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-100"><div className="p-6 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">Top Movers</h3></div><div className="divide-y divide-gray-100">{[...portfolio, ...watchlist].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5).map((stock) => (<StockRow key={stock.symbol} stock={stock} type={portfolio.some(p => p.symbol === stock.symbol) ? 'portfolio' : 'watchlist'} onAdd={handleAddToPortfolio} onSell={handleSellFromPortfolio} />))}</div></div>
          </div>
        )}
        {activeTab === 'portfolio' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100"><div className="p-6 border-b border-gray-100"><div className="flex items-center justify-between"><h3 className="text-lg font-semibold text-gray-900">Your Portfolio</h3><div className="text-sm text-gray-500">Last updated: {lastUpdate.toLocaleTimeString()}</div></div></div><div className="divide-y divide-gray-100">{portfolio.map(stock => (<StockRow key={stock.symbol} stock={stock} type="portfolio" onSell={handleSellFromPortfolio} />))}</div></div>
        )}
        {activeTab === 'watchlist' && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100"><div className="p-6 border-b border-gray-100"><h3 className="text-lg font-semibold text-gray-900">Watchlist</h3></div><div className="divide-y divide-gray-100">{watchlist.map(stock => (<StockRow key={stock.symbol} stock={stock} type="watchlist" onAdd={handleAddToPortfolio} />))}</div></div>
        )}
      </main>
    </div>
  );
};

export default StockDashboard;