# Trader Market Data Boundary

ALMA Trader may embed the official free TradingView Advanced Chart widget as a
human-readable display surface. TradingView remains an external widget and is not
an ALMA market-data provider.

## TradingView Widget Boundary

- The widget is loaded from TradingView's official embed script.
- TradingView branding and attribution must remain visible.
- ALMA does not intercept TradingView network requests.
- ALMA does not scrape TradingView DOM, iframe content, prices, candles,
  indicators, drawings, or metadata.
- ALMA does not store, redistribute, or transform TradingView market data.
- ALMA does not send TradingView widget data into AI analysis, journal,
  performance calculations, alerts, risk controls, or execution workflows.

## AI Analysis Boundary

ALMA chart analysis is based only on a user-provided screenshot uploaded through
the Trader chart-analysis flow. If a user wants ALMA to analyze a chart they are
viewing, they must provide an authorized screenshot or export through that upload
flow. ALMA must not automatically capture the TradingView widget.

## Capabilities Not Provided By TradingView Embed

The free TradingView widget is not a quote REST API, candle API, fundamentals
API, options API, webhook API, or AI data source. It does not authorize ALMA to
provide automated signals, brokerage execution, order placement, or market-data
redistribution.

Before ALMA can add quote APIs, candle storage, automated alerts, risk controls,
or machine-readable market analysis, ALMA needs a separately licensed
market-data provider and a reviewed integration boundary.
