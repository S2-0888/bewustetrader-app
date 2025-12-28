const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const busboy = require("busboy");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- HULPFUNCTIE: HAAL BUSINESS & VISION DATA OP ---
// Haalt Accounts (Portfolio), Payouts (Finance) én Goals (Vision) op.
async function getBusinessContext(db, uid) {
  try {
    // 1. Haal Accounts op (Portfolio)
    const accountsSnap = await db.collection('users').doc(uid).collection('accounts').get();
    let totalInvested = 0;
    let fundedCount = 0;
    
    accountsSnap.forEach(doc => {
      const a = doc.data();
      totalInvested += (Number(a.originalPrice) || Number(a.cost) || 0);
      if (a.stage === 'Funded' && a.status === 'Active') fundedCount++;
    });

    // 2. Haal Payouts op (Finance)
    const payoutsSnap = await db.collection('users').doc(uid).collection('payouts').get();
    let totalPayouts = 0;
    payoutsSnap.forEach(doc => {
      totalPayouts += (Number(doc.data().convertedAmount) || 0);
    });

    const netProfit = totalPayouts - totalInvested;
    const roi = (totalInvested > 0 && totalPayouts > 0) ? ((netProfit / totalInvested) * 100).toFixed(0) : "N/A";

    // 3. HAAL DOELEN OP (VISION)
    const goalsSnap = await db.collection('users').doc(uid).collection('goals').get();
    const allGoals = goalsSnap.docs.map(d => d.data());
    
    // Zoek de 'ULTIMATE' goal (De Noordster)
    const ultimateGoal = allGoals.find(g => g.type === 'ULTIMATE');
    
    // Zoek het eerstvolgende actieve doel (TARGET of REWARD) dat nog niet geclaimd is
    // We sorteren op kosten, dus de goedkoopste eerst (= volgende stap)
    const nextTarget = allGoals
        .filter(g => g.type !== 'ULTIMATE' && g.status !== 'CLAIMED')
        .sort((a, b) => Number(a.cost) - Number(b.cost))[0];

    return { 
        totalInvested, totalPayouts, netProfit, roi, fundedCount,
        vision: {
            ultimate: ultimateGoal ? ultimateGoal.title : "Financial Freedom",
            nextTarget: nextTarget ? nextTarget.title : "Grow Capital",
            nextTargetCost: nextTarget ? nextTarget.cost : 0
        }
    };
  } catch (error) {
    console.error("Error fetching business context:", error);
    return null;
  }
}

// --- HET TCT BREIN (Vision Aware) ---
const TCT_SYSTEM_PROMPT = `
### SYSTEM INSTRUCTION: TCT (The Conscious Trader Coach)

**IDENTITY:**
You are TCT. You are an experienced head trader. You coach the **PERSON**, not just the P&L.

**YOUR MISSION:**
Connect "Daily Execution" to the "Long Term Vision".

**HOW TO USE CONTEXT (THE PSYCHOLOGICAL LEVER):**
You have access to the user's **ULTIMATE GOAL** and **NEXT TARGET**.
- **If reckless:** "Stop gambling. You are pushing your [ULTIMATE GOAL] further away."
- **If disciplined:** "Good process. This is how you unlock [NEXT TARGET]."
- **If profitable:** "Great work. Closer to [NEXT TARGET]."

**CRITICAL: LANGUAGE RULE**
* **SCAN** the user's notes/input.
* **IF** Dutch -> Output in **Dutch**.
* **ELSE** -> Output in **English**.

**TONE:**
Direct, professional, succinct. Max 3 sentences.
`;

// --- 1. TCT AI COACH (Dashboard Insight) ---
exports.getTCTInsight = onCall({ 
  secrets: ["GEMINI_API_KEY"],
  region: "europe-west1" 
}, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new Error('unauthenticated');

  const db = admin.firestore();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const { recentTrades, stats } = data;

  // 1. Haal context op (Nu met Ultimate Goal & Next Target)
  const businessStats = await getBusinessContext(db, auth.uid);

  // 2. Trade Context
  const tradesWithContext = recentTrades.map(t => {
      return {
          pair: t.pair,
          pnl: t.pnl,
          mindsetScore: t.mindsetScore || "N/A",
          coachNotes: t.shadowAnalysis || t.notes || "No text",
          emotion: t.emotionTag || "Unknown"
      };
  });

  const fullPrompt = `
    ${TCT_SYSTEM_PROMPT}

    **THE TRADER'S VISION:**
    - Ultimate Goal: "${businessStats?.vision.ultimate}"
    - Next Target: "${businessStats?.vision.nextTarget}"
    
    **CURRENT PERFORMANCE:**
    - Winrate: ${stats.winrate}%
    - Adherence Score: ${stats.adherence}%
    - Active Funded Accounts: ${businessStats?.fundedCount || 0}
    
    **RECENT TRADES:**
    ${JSON.stringify(tradesWithContext, null, 2)}

    **YOUR COACHING INSIGHT:**
    Analyze behavior. Use the VISION data to motivate or correct them.
  `;

  try {
    const result = await model.generateContent(fullPrompt);
    const tctResponseText = result.response.text();

    await db.collection('logs_tct').add({
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

// --- 3. ANALYZE VOICE TRADE (Ongewijzigd) ---
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

        **YOUR ROLE:** The "Conscious Coach" (TCT).
        
        **TASK: Synthesize Audio + Technical Reality:**
        Compare what the trader *says* vs what the *data* shows.
        * **Check Risk:** Is 'risk' within limits? If high risk + loss -> "Gambler behavior".
        * **Check Execution (MAE/MFE):** - Did Price hit MAE (go past entry) near SL? -> Validate if stop was respected.
            - Was MFE high (big profit) but P&L is low/negative? -> "You let a winner turn into a loser" (Greed).
        * **Check Voice:** Is the voice calm despite a loss? (Good). Is it shaky/angry? (Tilt).

        **CRITICAL: LANGUAGE RULE**
        - **DETECT** the language spoken in the audio.
        - **OUTPUT** 'journal_entry' and 'direct_feedback' MUST be in that **EXACT SAME LANGUAGE**.

        **OUTPUT JSON FORMAT:**
        {
          "journal_entry": "Structured summary in [SPOKEN LANGUAGE]. Combine the voice story with the hard data facts.",
          "direct_feedback": "Direct coaching advice in [SPOKEN LANGUAGE]. Be specific using the MAE/MFE/Risk data.",
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

// --- 4. WEEKLY REVIEW GENERATOR (Met Vision Check) ---
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

    // 1. Haal Vision Context op
    const businessStats = await getBusinessContext(db, auth.uid);

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
      
      **THE TRADER'S VISION:**
      - Ultimate Goal: "${businessStats?.vision.ultimate}"
      - Next Target: "${businessStats?.vision.nextTarget}"
      
      **WEEKLY PERFORMANCE:**
      - Weekly P&L: ${totalPnl.toFixed(2)}
      - Winrate: ${winrate}%
      - Avg Mindset Score: ${avgMindset} / 10
      - Trade Log: ${JSON.stringify(tradesSummary.slice(0, 10))}

      **TASK:**
      1. **Analyze Correlation:** Mindset vs P&L.
      2. **Vision Check:** Did this week bring them closer to "${businessStats?.vision.nextTarget}" or was it a distraction?
      3. **Gameplan:** One clear rule for next week.

      **CRITICAL: SMART LANGUAGE DETECTION**
      - Check user notes. IF Dutch -> Dutch. ELSE -> English.

      **OUTPUT JSON:**
      {
        "grade": "String (A+, A, B, C, D, F)",
        "headline": "String. Short, punchy summary.",
        "analysis": "String. Deep dive review (referencing the Goal).",
        "top_pitfall": "String.",
        "gameplan": "String."
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

// --- 5. AI SUPPORT DRAFT GENERATOR (Updated with Vision) ---
exports.getAiSupportReply = onCall({
  secrets: ["GEMINI_API_KEY"],
  region: "europe-west1"
}, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new Error('unauthenticated');

  const db = admin.firestore();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // We gebruiken gemini-2.5-flash voor Vision-mogelijkheden
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const { ticketMessage, ticketId } = data;

  try {
    // 1. Haal de bijlage op uit het Firestore document indien aanwezig
    let attachmentData = null;
    if (ticketId) {
      const ticketDoc = await db.collection('beta_feedback').doc(ticketId).get();
      if (ticketDoc.exists && ticketDoc.data().attachment) {
        attachmentData = ticketDoc.data().attachment;
      }
    }

    // 2. Haal de laatste 10 succesvolle antwoorden op voor stijl-training
    const trainingSnap = await db.collection('ai_training_logs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    const eerdereAntwoorden = [];
    trainingSnap.forEach(doc => {
      const d = doc.data();
      eerdereAntwoorden.push(`Gebruiker: ${d.question}\nAdmin (Jij): ${d.answer}`);
    });

    const trainingContext = eerdereAntwoorden.reverse().join("\n\n---\n\n");

    const systemPrompt = `
      ### SYSTEM INSTRUCTION: DBT ADMIN AI ASSISTANT (VISION ENABLED)
      
      Jij bent de assistent van de Founders van DBT (Conscious Trader).
      Jouw taak is een concept-antwoord te schrijven op een vraag/feedback van een gebruiker.
      
      **VISION TASK:**
      Als er een afbeelding is bijgevoegd, analyseer deze dan op foutmeldingen, UI-problemen of technische bugs. Gebruik deze visuele informatie om een specifiek antwoord te geven.

      **RICHTLIJNEN VOOR STIJL:**
      - Professioneel, ondersteunend, maar direct (geen wollig taalgebruik).
      - Gebruik "wij" (de founders).
      - Houd het kort (max 3-4 zinnen).
      
      **CONTEXT VAN EERDERE ANTWOORDEN (GEBRUIK DEZE TONE-OF-VOICE):**
      ${trainingContext}
      
      **NIEUWE VRAAG VAN GEBRUIKER:**
      "${ticketMessage}"
      
      **JOUW CONCEPT ANTWOORD:**
      Schrijf een antwoord in dezelfde taal als de vraag (meestal Nederlands).
    `;

    let promptParts = [{ text: systemPrompt }];

    // Als er een afbeelding is, voegen we deze toe aan de prompt
    if (attachmentData) {
      const base64Data = attachmentData.split(',')[1]; // Strip de data:image/png;base64 prefix
      promptParts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
    }

    const result = await model.generateContent(promptParts);
    const draftText = result.response.text().trim();

    return { draft: draftText };

  } catch (error) {
    console.error("AI Support Draft Error:", error);
    return { draft: "Het spijt me, ik kon geen voorstel genereren. Probeer het handmatig." };
  }
});