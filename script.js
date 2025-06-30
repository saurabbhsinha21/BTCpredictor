document.getElementById("predictForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const targetPrice = parseFloat(document.getElementById("targetPrice").value);
  const targetTime = new Date(document.getElementById("targetTime").value);
  const now = new Date();
  const minutesAhead = Math.max(1, Math.floor((targetTime - now) / 60000));

  if (minutesAhead <= 0) {
    document.getElementById("result").innerHTML = "⛔ Invalid future time!";
    return;
  }

  const res = await fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=30");
  const rawData = await res.json();
  const closePrices = rawData.map(d => parseFloat(d[4]));

  const priceStart = closePrices[0];
  const priceNow = closePrices[closePrices.length - 1];
  const trendPerMin = (priceNow - priceStart) / (closePrices.length - 1);
  const predictedPrice = priceNow + trendPerMin * minutesAhead;
  const prediction = predictedPrice >= targetPrice ? "Yes ✅" : "No ❌";

  const ema9 = calculateEMA(closePrices.slice(-9));
  const rsi14 = calculateRSI(closePrices.slice(-15));

  let signal = "Neutral ⚖️";
  if (rsi14 > 70) signal = "Overbought 📉 – Downtrend Risk";
  else if (rsi14 < 30) signal = "Oversold 📈 – Rebound Possible";

  const confidence = Math.min(99, Math.max(60, Math.abs(trendPerMin * 500)));

  document.getElementById("result").innerHTML = `
    <p><b>Current Price:</b> ${priceNow.toFixed(2)} USDT</p>
    <p><b>Predicted Price @ ${targetTime.toLocaleTimeString()}:</b> ${predictedPrice.toFixed(2)} USDT</p>
    <p><b>Prediction:</b> ${prediction}</p>
    <p><b>Confidence:</b> ${Math.round(confidence)}%</p>
    <hr>
    <p><b>EMA (9):</b> ${ema9.toFixed(2)}</p>
    <p><b>RSI (14):</b> ${rsi14.toFixed(2)} – ${signal}</p>
  `;
});

// EMA Calculation
function calculateEMA(prices, period = 9) {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

// RSI Calculation
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
