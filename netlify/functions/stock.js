const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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

const TICKER_SET = new Set(TICKERS);

exports.handler = async (event) => {
    const ticker = (event.queryStringParameters?.ticker || '').toUpperCase();

    if (!ticker || !TICKER_SET.has(ticker)) {
        return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Ticker not found' }),
        };
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
            timestamp: Date.now(),
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300',
            },
            body: JSON.stringify(data),
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to fetch stock details' }),
        };
    }
};
