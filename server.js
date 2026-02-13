const express = require('express');
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const TICKERS = [
    'OR.PA', 'SU.PA', 'EL.PA', 'SAN.PA', 'AI.PA', 'LR.PA', 'DSY.PA',
    'CAP.PA', 'STMPA.PA', 'DIM.PA', 'BVI.PA', 'BIM.PA', 'IPN.PA',
    'GTT.PA', 'TRI.PA', 'VIRP.PA', 'EXENS.PA', 'ATE.PA', 'VU.PA',
    'BB.PA', 'ITP.PA', 'RBT.PA', 'ESKR.PA', 'IPS.PA', 'PLNW.PA',
    'MAU.PA', 'VETO.PA', 'NRO.PA', 'SOI.PA', 'LSS.PA', 'AUB.PA',
    'MLPLC.PA', 'THEP.PA', 'ASY.PA', 'EQS.PA', 'BOL.PA', 'ALGIL.PA',
    'ALSEM.PA', 'ALSTI.PA', 'PERR.PA', 'MLVSY.PA', 'ALERS.PA',
    'PARRO.PA', 'ALBFR.PA', 'ALSTW.PA', 'EAPI.PA', 'ALLIX.PA',
    'ALTPC.PA', 'ALVU.PA', 'ALPM.PA', 'MAAT.PA', 'ALNSE.PA',
    'ABNX.PA', 'MLCHE.PA', 'ALESE.PA', 'ADOC.PA', 'ALVAZ.PA',
    'MLSCI.PA', 'ALCJ.PA', 'COH.PA', 'DPAM.PA', 'ALHGR.PA',
    'ALBKK.PA', 'ALMEX.PA', 'ALODC.PA', 'ALBLD.PA', 'ALMDG.PA',
    'SACI.PA', 'ABLD.PA', 'PAR.PA', 'ALTRO.PA', 'MLMAQ.PA',
    'ALDRV.PA', 'ALITL.PA', 'MEMS.PA', 'ALHRS.PA', 'ALGEN.PA',
    'ALBPK.PA', 'ALTTI.PA', 'ALHIT.PA', 'ALCOG.PA', 'MLORQ.PA',
    'MLMCA.PA', 'SIGHT.PA', 'ALMCE.PA', 'ALCWE.PA', 'FIPP.PA',
    'ALINS.PA', 'ALMGI.PA', 'ALBDM.PA', 'ALSGD.PA', 'ALBLU.PA',
    'MLSDN.PA', 'MLLAB.PA', 'MLEDR.PA', 'MLFXO.PA', 'PROAC.PA',
    'MLONL.PA', 'ALAST.PA', 'ALWIT.PA', 'ALNLF.PA', 'ALENT.PA',
    'ALVIA.PA', 'ALOKW.PA', 'ALKLA.PA', 'MLBON.PA', 'ALRPD.PA',
    'MLDAM.PA', 'RAL.PA', 'ALLPL.PA', 'MLAAT.PA', 'ALVET.PA',
    'MLPVG.PA', 'MLPET.PA', 'MLISP.PA', 'MLIPO.PA', 'MLJDL.PA',
    'MLARO.PA', 'MLWIZ.PA', 'MLRAC.PA'
];

// Cache + in-flight dedup
let cachedQuotes = null;
let cacheTimestamp = 0;
let inflightFetch = null;
const CACHE_TTL = 60_000;

// Per-ticker stock detail cache (5-minute TTL)
const stockDetailCache = new Map();
const STOCK_DETAIL_TTL = 5 * 60_000;

async function fetchQuotes() {
    const now = Date.now();
    if (cachedQuotes && (now - cacheTimestamp) < CACHE_TTL) {
        return cachedQuotes;
    }
    // Dedup: if a fetch is already in progress, piggyback on it
    if (inflightFetch) return inflightFetch;

    inflightFetch = (async () => {
        console.log(`[${new Date().toISOString()}] Fetching ${TICKERS.length} quotes...`);

        const results = await Promise.allSettled(
            TICKERS.map(async (ticker) => {
                try {
                    const quote = await yahooFinance.quote(ticker);
                    if (!quote) return { symbol: ticker, price: null, changePercent: null, name: null };
                    return {
                        symbol: ticker,
                        price: quote.regularMarketPrice ?? null,
                        changePercent: quote.regularMarketChangePercent ?? null,
                        name: quote.shortName || quote.longName || null
                    };
                } catch {
                    return { symbol: ticker, price: null, changePercent: null, name: null };
                }
            })
        );

        let successCount = 0;
        const quotes = results.map(r => {
            const val = r.status === 'fulfilled' ? r.value : { symbol: '?', price: null, changePercent: null, name: null };
            if (val.price !== null) successCount++;
            return val;
        });

        console.log(`[${new Date().toISOString()}] Done: ${successCount}/${TICKERS.length} OK`);

        cachedQuotes = quotes;
        cacheTimestamp = Date.now();
        return quotes;
    })().finally(() => { inflightFetch = null; });

    return inflightFetch;
}

app.get('/api/quotes', async (_req, res) => {
    try {
        const quotes = await fetchQuotes();
        res.json({ quotes, timestamp: cacheTimestamp });
    } catch (err) {
        console.error('Quote fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch quotes' });
    }
});

app.get('/api/stock/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    if (!TICKERS.includes(ticker)) {
        return res.status(404).json({ error: 'Ticker not found' });
    }

    const now = Date.now();
    const cached = stockDetailCache.get(ticker);
    if (cached && (now - cached.timestamp) < STOCK_DETAIL_TTL) {
        return res.json(cached.data);
    }

    try {
        const result = await yahooFinance.quoteSummary(ticker, {
            modules: ['assetProfile', 'price', 'summaryDetail']
        });

        const ap = result.assetProfile || {};
        const pr = result.price || {};
        const sd = result.summaryDetail || {};

        const data = {
            profile: {
                sector: ap.sector || null,
                industry: ap.industry || null,
                description: ap.longBusinessSummary || null,
                website: ap.website || null,
                employees: ap.fullTimeEmployees || null,
                city: ap.city || null,
                country: ap.country || null,
            },
            price: {
                regularMarketPrice: pr.regularMarketPrice ?? null,
                regularMarketChange: pr.regularMarketChange ?? null,
                regularMarketChangePercent: pr.regularMarketChangePercent ?? null,
                marketCap: pr.marketCap ?? null,
                currency: pr.currency || 'EUR',
            },
            summaryDetail: {
                fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh ?? null,
                fiftyTwoWeekLow: sd.fiftyTwoWeekLow ?? null,
                averageVolume: sd.averageDailyVolume10Day ?? sd.averageVolume ?? null,
                dividendYield: sd.dividendYield ?? null,
                trailingPE: sd.trailingPE ?? null,
            },
            timestamp: now,
        };

        stockDetailCache.set(ticker, { data, timestamp: now });
        res.json(data);
    } catch (err) {
        console.error(`Stock detail error for ${ticker}:`, err.message);
        res.status(500).json({ error: 'Failed to fetch stock details' });
    }
});

app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
    console.log(`Halal Stock Screener running at http://localhost:${PORT}`);
    fetchQuotes().catch(() => {});
});
