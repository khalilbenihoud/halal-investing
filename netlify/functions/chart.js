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

const RANGE_CONFIG = {
    '1M':  { months: 1,  interval: '1d'  },
    '6M':  { months: 6,  interval: '1d'  },
    '1Y':  { months: 12, interval: '1d'  },
    '5Y':  { months: 60, interval: '1wk' },
};

exports.handler = async (event) => {
    const ticker = (event.queryStringParameters?.ticker || '').toUpperCase();

    if (!ticker || !TICKER_SET.has(ticker)) {
        return {
            statusCode: 404,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Ticker not found' }),
        };
    }

    const rangeParam = event.queryStringParameters?.range || '1Y';
    const range = RANGE_CONFIG[rangeParam] ? rangeParam : '1Y';

    try {
        const cfg = RANGE_CONFIG[range];
        const period1 = new Date();
        period1.setMonth(period1.getMonth() - cfg.months);

        const result = await yahooFinance.chart(ticker, {
            period1,
            interval: cfg.interval,
        });

        const quotes = (result.quotes || [])
            .filter(q => q.close != null && q.date != null)
            .map(q => ({
                time: q.date.toISOString().slice(0, 10),
                value: Math.round(q.close * 100) / 100,
            }));

        const data = {
            quotes,
            currency: result.meta?.currency || 'EUR',
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
            body: JSON.stringify({ error: 'Failed to fetch chart data' }),
        };
    }
};
