const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const busboy = require("busboy");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- HET DEFINITIEVE TCT BREIN (Dashboard Coach - Met Geheugen & Taalgevoel) ---
const TCT_SYSTEM_PROMPT = `
### SYSTEM INSTRUCTION: TCT (The Conscious Trader Coach)

**IDENTITY:**
You are TCT, the AI performance coach. You are not a financial advisor.
Your goal is to connect the dots between the trader's **Execution** (P&L, Risk) and their **Psychology** (Voice Memos, Mindset Scores).

**DATA YOU WILL SEE:**
1.  **Winrate & Adherence:** The hard stats.
2.  **Recent Trades:** A list of trades. CRUCIAL: Look for the field 'shadowAnalysis' (Context) and 'mindsetScore' (1-10).

**YOUR ANALYSIS LOGIC:**
* **The Disconnect:** Winning with low Mindset Scores? -> "Lucky/Dangerous".
* **The Spiral:** Consecutive losses + 'Revenge' tags? -> "Stop trading".
* **The Growth:** Losing but High Mindset Score? -> "Good Process".

**CRITICAL: LANGUAGE RULE**
* **SCAN** the text in 'recent trades' (coachNotes/shadowAnalysis).
* **IF** the user's notes are in **Dutch** -> Your insight MUST be in **Dutch**.
* **ELSE** (or if mixed) -> Keep it **English**.

**TONE:**
Direct, professional. Max 3 sentences. Focus on psychology.
`;

// --- 1. TCT AI COACH (Dashboard Insight) ---
exports.getTCTInsight = onCall({ 
  secrets: ["GEMINI_API_KEY"],
  region: "europe-west1" 
}, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new Error('unauthenticated');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const { recentTrades, stats } = data;

  // We sturen de notities mee zodat de AI de taal kan herkennen
  const tradesWithContext = recentTrades.map(t => {
      return {
          pair: t.pair,
          pnl: t.pnl,
          mindsetScore: t.mindsetScore || "N/A",
          coachNotes: t.shadowAnalysis || t.notes || "No text", // De AI leest dit om de taal te bepalen
          emotion: t.emotionTag || "Unknown"
      };
  });

  const fullPrompt = `
    ${TCT_SYSTEM_PROMPT}

    **USER STATUS:**
    - Winrate: ${stats.winrate}%
    - Adherence: ${stats.adherence}%
    
    **RECENT ACTIVITY (Context for Language & Psychology):**
    ${JSON.stringify(tradesWithContext, null, 2)}

    **YOUR COACHING INSIGHT (Max 3 sentences, matching user's language):**
  `;

  try {
    const result = await model.generateContent(fullPrompt);
    const tctResponseText = result.response.text();

    await admin.firestore().collection('logs_tct').add({
      userId: auth.uid,
      insight: tctResponseText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      stats: stats 
    });

    return { insight: tctResponseText };
  } catch (error) {
    console.error("TCT Error:", error.message);
    return { insight: "Gathering more data to build your profile. Stick to the plan." };
  }
});

// --- 2. STRIPE WEBHOOK (Ongewijzigd) ---
exports.stripeWebhook = onRequest({ 
  secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  region: "europe-west1"
}, async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userQuery = await admin.firestore().collection('users').where('email', '==', session.customer_details.email).get();
    if (!userQuery.empty) {
      await userQuery.docs[0].ref.update({ isApproved: true, isFounder: true, status: 'paid', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }
  res.json({ received: true });
});

// --- 3. ANALYZE VOICE TRADE (Ongewijzigd - Was al slim) ---
exports.analyzeVoiceTrade = onRequest({ 
  secrets: ["GEMINI_API_KEY"],
  region: "europe-west1",
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const bb = busboy({ headers: req.headers });
  let audioBuffer = Buffer.alloc(0);
  let mimeType = "audio/webm";
  let tradeContext = "{}"; 

  bb.on("field", (fieldname, val) => {
    if (fieldname === "tradeContext") {
        tradeContext = val;
    }
  });

  bb.on("file", (fieldname, file, info) => {
    mimeType = info.mimeType;
    file.on("data", (data) => audioBuffer = Buffer.concat([audioBuffer, data]));
  });

  bb.on("finish", async () => {
    try {
      if (audioBuffer.length === 0) throw new Error("No audio received.");
      
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `
        ### SYSTEM INSTRUCTION: Conscious Trader Voice Analyzer (Holistic)
        
        **INPUTS:** 1. **Audio:** Trader's voice reflection (Tone, Emotion, Content).
        2. **Technical Data (JSON):** ${tradeContext} 
           *(Contains: Risk, P&L, Mistakes, Entry, SL, TP, MAE (Max Pain), MFE (Max Potential))*

        **YOUR ROLE:** The "Conscious Coach" (TCT). You are an experienced head trader.
        
        **TASK: Synthesize Audio + Technical Reality:**
        Compare what the trader *says* vs what the *data* shows.
        
        * **Check Risk:** Is 'risk' within limits? If high risk + loss -> "Gambler behavior".
        * **Check Execution (MAE/MFE):** - Did Price hit MAE (go past entry) near SL? -> Validate if stop was respected.
            - Was MFE high (big profit) but P&L is low/negative? -> "You let a winner turn into a loser" (Greed).
        * **Check Voice:** Is the voice calm despite a loss? (Good). Is it shaky/angry? (Tilt).

        **CRITICAL: LANGUAGE RULE**
        - **DETECT** the language spoken in the audio.
        - **OUTPUT** 'journal_entry' and 'direct_feedback' MUST be in that **EXACT SAME LANGUAGE**.
        - (If Dutch audio -> Dutch text. If English audio -> English text).

        **OUTPUT JSON FORMAT:**
        {
          "journal_entry": "Structured summary in [SPOKEN LANGUAGE]. Combine the voice story with the hard data facts (e.g. 'Trade hit MFE but closed at BE'). Remove filler words.",
          "direct_feedback": "Direct coaching advice in [SPOKEN LANGUAGE]. Be specific using the MAE/MFE/Risk data. Be strict but supportive. (e.g. 'Je MFE was hoog, waarom nam je geen winst?').",
          "shadow_analysis": "Short English analysis for database (e.g. 'User ignored SL, high MAE, lucky win, flagged greed').",
          "score": Number (1-10 based on discipline/calmness),
          "emotion_tag": "String (e.g. Panic, Zen, Revenge, Greed, Hope)"
        }
      `;

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: audioBuffer.toString("base64") } }
      ]);

      const jsonResponse = JSON.parse(result.response.text());
      res.status(200).json(jsonResponse);

    } catch (error) {
      console.error("AI Voice Error:", error);
      res.status(500).json({ error: "Analysis Failed", details: error.message });
    }
  });

  if (req.rawBody) bb.end(req.rawBody); else req.pipe(bb);
});

// --- 4. WEEKLY REVIEW GENERATOR (Smart Language Detection - Ongewijzigd) ---
exports.generateWeeklyReview = onCall({ 
  secrets: ["GEMINI_API_KEY"],
  region: "europe-west1" 
}, async (request) => {
  const { auth } = request;
  if (!auth) throw new Error('unauthenticated');

  const db = admin.firestore();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  try {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateString = lastWeek.toISOString().split('T')[0];

    const tradesSnap = await db.collection('users').doc(auth.uid).collection('trades')
      .where('date', '>=', dateString)
      .get();

    if (tradesSnap.empty) {
      return { error: "No trades found this week." };
    }

    let totalPnl = 0;
    let wins = 0;
    let totalMindsetScore = 0;
    let mindsetCount = 0;
    let mistakeCounts = {};
    const tradesSummary = [];

    tradesSnap.forEach(doc => {
      const t = doc.data();
      totalPnl += (t.pnl || 0);
      if ((t.pnl || 0) > 0) wins++;
      
      if (t.mindsetScore) {
        totalMindsetScore += t.mindsetScore;
        mindsetCount++;
      }

      if (t.mistake && Array.isArray(t.mistake)) {
        t.mistake.forEach(m => {
          mistakeCounts[m] = (mistakeCounts[m] || 0) + 1;
        });
      }

      tradesSummary.push({
        pair: t.pair,
        pnl: t.pnl,
        mindset: t.mindsetScore || "-",
        coachNote: t.shadowAnalysis || t.notes || "No context",
        mistakes: t.mistake || []
      });
    });

    const winrate = tradesSnap.size > 0 ? Math.round((wins / tradesSnap.size) * 100) : 0;
    const avgMindset = mindsetCount > 0 ? (totalMindsetScore / mindsetCount).toFixed(1) : "N/A";

    const prompt = `
      ### SYSTEM INSTRUCTION: TCT Head of Performance (Weekly Review)
      
      **INPUT:** Weekly trading data of a user.
      **YOUR ROLE:** Review the week like a strict but fair hedge fund manager.
      
      **DATA:**
      - Total P&L: ${totalPnl.toFixed(2)}
      - Winrate: ${winrate}% (Trades: ${tradesSnap.size})
      - Avg Mindset Score: ${avgMindset} / 10
      - Top Mistakes: ${JSON.stringify(mistakeCounts)}
      - Trade Log (Sample): ${JSON.stringify(tradesSummary.slice(0, 10))}

      **TASK:**
      1. Analyze the correlation between Mindset Scores and P&L.
      2. Identify the #1 Leak (Behavioral or Technical).
      3. Create a Gameplan for next week.

      **CRITICAL: SMART LANGUAGE DETECTION**
      - Scan the 'coachNote' and 'mistakes' text in the Trade Log.
      - **IF** the user's notes are clearly in **Dutch** -> Output JSON in **Dutch**.
      - **ELSE** (or if uncertain/mixed) -> Output JSON in **ENGLISH**.

      **OUTPUT JSON:**
      {
        "grade": "String (A+, A, B, C, D, F)",
        "headline": "String. Short, punchy summary.",
        "analysis": "String. Deep dive review (max 4 sentences).",
        "top_pitfall": "String. The main mistake.",
        "gameplan": "String. Actionable rule for next week."
      }
    `;

    const result = await model.generateContent(prompt);
    const reviewData = JSON.parse(result.response.text());

    await db.collection('users').doc(auth.uid).collection('weekly_reviews').add({
      ...reviewData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      weekStart: dateString,
      stats: { totalPnl, winrate, avgMindset, tradeCount: tradesSnap.size }
    });

    return reviewData;

  } catch (error) {
    console.error("Weekly Review Error:", error);
    throw new Error(error.message);
  }
});