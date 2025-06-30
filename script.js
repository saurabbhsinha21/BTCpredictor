let chart;

document.getElementById("predictForm").addEventListener("submit", (e) => {
  e.preventDefault();
  runPrediction();
  setInterval(() => {
    const price = document.getElementById("targetPrice").value;
    const time = document.getElementById("targetTime").value;
    if (price && time) runPrediction();
  }, 10000);
});

async function runPrediction() {
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
  const timeStamps = rawData.map(d => new Date(d[0]).toLocaleTimeString());

  const priceStart = closePrices[0];
  const priceNow = closePrices[closePrices.length - 1];
  const trendPerMin = (priceNow - priceStart) / (closePrices.length - 1);
  const ema9 = calculateEMA(closePrices.slice(-9));
  const rsi14 = calculateRSI(closePrices.slice(-15));
  const emaTrend = ema9 - closePrices[closePrices.length - 10];

  // 🔁 Predicted price based on linear trend
  let predictedPrice = priceNow + trendPerMin * minutesAhead;

  // 📈 RSI-based adjustments
  if (rsi14 > 80) predictedPrice -= 25; // Overbought → correction likely
  else if (rsi14 < 20) predictedPrice += 25; // Oversold → rebound possible

  // 🔃 EMA trend reversal detection
  if (trendPerMin > 0 && emaTrend < 0) predictedPrice -= 20; // Uptrend weakening
  else if (trendPerMin < 0 && emaTrend > 0) predictedPrice += 20; // Downtrend weakening

  // ✅ Final Yes/No
  const prediction = predictedPrice >= targetPrice ? "Yes ✅" : "No ❌";

  // 🎯 Confidence based on trend and stability
  let avgChange = 0;
  for (let i = 1; i < closePrices.length; i++) {
    avgChange += Math.abs(closePrices[i] - closePrices[i - 1]);
  }
  avgChange /= (closePrices.length - 1);
  const stability = 1 - avgChange / priceNow;
  const trendStrength = Math.abs(trendPerMin * 1000);
  let confidence = Math.min(99, Math.max(60, (trendStrength * stability).toFixed(2)));

  // 🚨 Reduce confidence if reversal likely
  if ((rsi14 > 80 && trendPerMin > 0 && emaTrend < 0) ||
      (rsi14 < 20 && trendPerMin < 0 && emaTrend > 0)) {
    confidence -= 15;
  }

  // 🔍 Explanation
  let signal = "Neutral ⚖️";
  if (rsi14 > 70) signal = "Overbought 📉 – Downtrend Risk";
  else if (rsi14 < 30) signal = "Oversold 📈 – Rebound Possible";

  let explanation = `📊 Recent trend is ${
    trendPerMin >= 0 ? "upward 📈" : "downward 📉"
  }. EMA is ${ema9.toFixed(2)}, ${emaTrend >= 0 ? "rising" : "falling"} suggesting ${emaTrend >= 0 ? "support" : "weakness"}. `;
  explanation += `RSI = ${rsi14.toFixed(2)}, so market is ${signal.toLowerCase()}. `;
  explanation += `Prediction adjusted based on momentum & trend reversal detection.`

  // 🧾 Display
  document.getElementById("result").innerHTML = `
    <p><b>Current Price:</b> ${priceNow.toFixed(2)} USDT</p>
    <p><b>Predicted Price @ ${targetTime.toLocaleTimeString()}:</b> ${predictedPrice.toFixed(2)} USDT</p>
    <p><b>Prediction:</b> ${prediction}</p>
    <p><b>Confidence:</b> ${confidence}%</p>
    <hr>
    <p><b>EMA (9):</b> ${ema9.toFixed(2)}</p>
    <p><b>RSI (14):</b> ${rsi14.toFixed(2)} – ${signal}</p>
    <hr>
    <p><b>Explanation:</b><br>${explanation}</p>
    <hr>
    <canvas id="sparklineChart" height="50"></canvas>
  `;

  // 📊 Sparkline Chart
  if (chart) chart.destroy();
  chart = new Chart(document.getElementById("sparklineChart"), {
    type: "line",
    data: {
      labels: timeStamps,
      datasets: [{
        data: closePrices,
        borderColor: "#1e90ff",
        fill: false,
        tension: 0.3,
        pointRadius: 0
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } },
    }
  });
}

// === Utils ===
function calculateEMA(prices, period = 9) {
  const k = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

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
