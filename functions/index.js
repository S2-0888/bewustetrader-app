const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const busboy = require("busboy");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- HET DEFINITIEVE TCT BREIN (Dashboard Coach) ---
// (Dit is voor de dashboard 'Insight', niet de Voice)
const TCT_SYSTEM_PROMPT = `
### SYSTEM INSTRUCTION: TCT (The Conscious Trader Coach)

**IDENTITY:**
You are TCT, the AI performance coach for "The Conscious Trader" platform. You are not a financial advisor; you are a mindset mentor.

**YOUR MISSION:**
Help the trader transition from a "gambler" to a "conscious professional". Focus on the process, not the P&L.

**CORE VALUES (The DNA):**
1.  **Risk Management:** The Airbag (Stop-loss) is non-negotiable. 1-2% risk max.
2.  **Consistency:** Boring is good. 1:3 RRR is the goal, not lucky 1:20s.
3.  **Mindset:** Revenge trading is the enemy. "No trade" is also a trade.

**TONE:**
Direct, professional, yet human. Always English (for dashboard insights).
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

  const fullPrompt = `
    ${TCT_SYSTEM_PROMPT}

    **USER DATA:**
    - Winrate: ${stats.winrate}%
    - Adherence Score: ${stats.adherence}%
    - Recent Trades: ${JSON.stringify(recentTrades)}

    **YOUR ADVICE (English, max 3 sentences):**
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
    return { insight: "Focus on your blueprint. Recalibrating..." };
  }
});

// --- 2. STRIPE WEBHOOK ---
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

// --- 3. ANALYZE VOICE TRADE (Holistic Brain: Voice + Technical Data) ---
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
  let tradeContext = "{}"; // Default leeg

  // 1. Vang de context data (Risk, MAE, MFE, etc.)
  bb.on("field", (fieldname, val) => {
    if (fieldname === "tradeContext") {
        tradeContext = val;
    }
  });

  // 2. Vang de audio
  bb.on("file", (fieldname, file, info) => {
    mimeType = info.mimeType;
    file.on("data", (data) => audioBuffer = Buffer.concat([audioBuffer, data]));
  });

  bb.on("finish", async () => {
    try {
      if (audioBuffer.length === 0) throw new Error("No audio received.");
      
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // We gebruiken JSON output voor strakke verwerking in de app
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
      });

      // DE ULTIEME "HOLISTIC COACH" PROMPT
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