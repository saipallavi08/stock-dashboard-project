// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = 4000;

// IMPORTANT: Paste your Finnhub API key here
const FINNHUB_API_KEY = 'api key here';

// --- Data (This will be our starting point) ---
let portfolio = [
  { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, avgPrice: 150, currentPrice: 175.50, change: 0 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25, avgPrice: 2800, currentPrice: 2925.00, change: 0 },
];
let watchlist = [
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 185.75, change: 0 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 325.80, change: 0 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 180.50, change: 0 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 890.75, change: 0 }
];
const historicalData = [
    { date: '9/10', portfolio: 95000, market: 100000 }, { date: '9/11', portfolio: 97500, market: 102000 }, { date: '9/12', portfolio: 96000, market: 101500 }, { date: '9/13', portfolio: 99000, market: 103500 }, { date: '9/14', portfolio: 101000, market: 105000 }, { date: '9/15', portfolio: 103500, market: 106500 }, { date: '9/16', portfolio: 105200, market: 108000 }, { date: '9/17', portfolio: 108750, market: 110000 }
];

// --- API Endpoints ---
app.get('/api/portfolio', (req, res) => res.json(portfolio));
app.get('/api/watchlist', (req, res) => res.json(watchlist));
app.get('/api/historical-data', (req, res) => res.json(historicalData));

app.post('/api/portfolio/add', (req, res) => {
    const { symbol } = req.body;
    const stockToAdd = watchlist.find(s => s.symbol === symbol);
    if (stockToAdd && !portfolio.some(p => p.symbol === symbol)) {
        const newPortfolioItem = { symbol: stockToAdd.symbol, name: stockToAdd.name, shares: 10, avgPrice: stockToAdd.price, currentPrice: stockToAdd.price, change: stockToAdd.change };
        portfolio.push(newPortfolioItem);
        watchlist = watchlist.filter(s => s.symbol !== symbol);
        io.emit('data-update', { portfolio, watchlist });
        res.status(200).json(newPortfolioItem);
    } else { res.status(404).send('Stock not found or already in portfolio'); }
});

app.post('/api/portfolio/sell', (req, res) => {
    const { symbol } = req.body;
    const stockToSell = portfolio.find(s => s.symbol === symbol);
    if (stockToSell) {
        const newWatchlistItem = { symbol: stockToSell.symbol, name: stockToSell.name, price: stockToSell.currentPrice, change: stockToSell.change };
        watchlist.unshift(newWatchlistItem);
        portfolio = portfolio.filter(s => s.symbol !== symbol);
        io.emit('data-update', { portfolio, watchlist });
        res.status(200).json({ message: `${symbol} sold and moved to watchlist.`});
    } else { res.status(404).send('Stock not found in portfolio'); }
});

// --- Function to fetch real prices from Finnhub ---
const getQuote = async (symbol) => {
    if (!FINNHUB_API_KEY || FINNHUB_API_KEY === 'YOUR_API_KEY_GOES_HERE') {
        // Skip API call if key is not set
        return null;
    }
    try {
        const response = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
        return {
            price: response.data.c,
            change: response.data.dp
        };
    } catch (error) {
        console.error(`Error fetching data for ${symbol}: ${error.message}`);
        return null;
    }
};

const updateAllPrices = async () => {
    const symbols = [...new Set([...portfolio.map(s => s.symbol), ...watchlist.map(s => s.symbol)])];

    for (const symbol of symbols) {
        const quote = await getQuote(symbol);
        if (quote) {
            const portfolioStock = portfolio.find(s => s.symbol === symbol);
            if (portfolioStock) {
                portfolioStock.currentPrice = quote.price;
                portfolioStock.change = quote.change;
            }
            const watchlistStock = watchlist.find(s => s.symbol === symbol);
            if (watchlistStock) {
                watchlistStock.price = quote.price;
                watchlistStock.change = quote.change;
            }
        }
    }
    io.emit('data-update', { portfolio, watchlist });
};

// --- Socket.io connection ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.emit('data-update', { portfolio, watchlist });
    socket.on('disconnect', () => { console.log('User disconnected:', socket.id); });
});

// ** THE FIX IS HERE **
// Run the price update function every 15 seconds to stay within the API rate limit
setInterval(updateAllPrices, 15000);

server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));