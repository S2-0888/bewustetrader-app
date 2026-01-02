const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const busboy = require("busboy");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const AI_MODEL = "gemini-2.5-flash";

// --- HULPFUNCTIE: HAAL BUSINESS, VISION & PSYCHOLOGY DATA OP ---
async function getBusinessContext(db, uid) {
  try {
    // 1. Haal Basis Gebruiker & Psychologie op (Shadow Analysis)
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data() || {};

    // 2. Haal Accounts op (Portfolio)
    const accountsSnap = await db.collection('users').doc(uid).collection('accounts').get();
    let totalInvested = 0;
    let fundedCount = 0;
    
    accountsSnap.forEach(doc => {
      const a = doc.data();
      totalInvested += (Number(a.originalPrice) || Number(a.cost) || 0);
      if (a.stage === 'Funded' && a.status === 'Active') fundedCount++;
    });

    // 3. Haal Payouts op (Finance)
    const payoutsSnap = await db.collection('users').doc(uid).collection('payouts').get();
    let totalPayouts = 0;
    payoutsSnap.forEach(doc => {
      totalPayouts += (Number(doc.data().convertedAmount) || 0);
    });

    // 4. HAAL DOELEN OP (VISION)
    const goalsSnap = await db.collection('users').doc(uid).collection('goals').get();
    const allGoals = goalsSnap.docs.map(d => d.data());
    const ultimateGoal = allGoals.find(g => g.type === 'ULTIMATE');
    const nextTarget = allGoals
        .filter(g => g.type !== 'ULTIMATE' && g.status !== 'CLAIMED')
        .sort((a, b) => Number(a.cost) - Number(b.cost))[0];

    return { 
        totalInvested, totalPayouts, fundedCount,
        psychology: {
            archetype: userData.archetype || "Evaluating...",
            shadow: userData.shadow_analysis || "No shadow data yet."
        },
        vision: {
            ultimate: ultimateGoal ? ultimateGoal.title : "Financial Freedom",
            nextTarget: nextTarget ? nextTarget.title : "Grow Capital"
        }
    };
  } catch (error) {
    console.error("Error fetching business context:", error);
    return null;
  }
}

// --- HET TCT BREIN (Expert & Shadow Aware) ---
const TCT_SYSTEM_PROMPT = `
### SYSTEM INSTRUCTION: TCT (The Conscious Trader Coach)

**IDENTITY & PHILOSOPHY:**
You are TCT, a high-level performance coach and a trusted friend. Your mantra is: "Hard on the content, soft on the person." You are the pillar of support who understands the psychological struggle of the markets but won't let the trader drift off the path of mastery.

**TONE:**
Empathetic yet sharp. Be the "good friend" who is direct about mistakes but always motivating. Keep it succinct: max 3 sentences. No fluff, just high-impact coaching.
Authentic, empathetic, and sharp. No AI-clichés (like "I understand how you feel"). Speak like a real mentor. Max 3 sentences. No fluff.

**YOUR MISSION:**
1. **The 'Why':** Connect your feedback to their "Ultimate Goal" to keep them motivated, but only when it adds real value.
2. **Shadow Spotting:** Explicitly name patterns like FOMO, Revenge Trading, or Hesitation. Tell them: "That's your shadow talking."
3. **Radical Candor:** If they followed the plan, praise the process (not the money). If they gambled, call it out immediately—but remind them they are better than that single mistake.
4. **Adaptive Rules:** If patterns suggest a recurring mistake, propose a specific new trading rule (e.g., "Risk max 0.5% per trade") to protect the trader from their shadow.

**LANGUAGE RULE:**
- NEVER use standard/forced translations. 
- Always respond in the same language as the user's notes (e.g., Dutch, English, Spanish, or German). 
- Use natural, conversational phrasing specific to that language.
- Avoid formal "AI-speak" or literal translations.
- If notes are empty, default to professional English.

`;

// --- 1. TCT AI COACH (Dashboard Insight) ---
exports.getTCTInsight = onCall({ 
  secrets: ["GEMINI_API_KEY"],
  region: "europe-west1",
  cors: true // Noodzakelijk voor je nieuwe domein
}, async (request) => {
  const { data, auth } = request;
  if (!auth) throw new Error('unauthenticated');

  const db = admin.firestore();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const { recentTrades, stats } = data;
    
    // 1. Haal context op via de stabiele hulpfunctie
    const businessStats = await getBusinessContext(db, auth.uid);
    
    // Extra check: als businessStats faalt, gebruik defaults
    const visionTitle = businessStats?.vision?.ultimate || "Financial Freedom";

    const fullPrompt = `
      ${TCT_SYSTEM_PROMPT}

      **CONTEXT:**
      - Trader Vision: "${visionTitle}"
      - Winrate: ${stats.winrate}%
      - Adherence: ${stats.adherence}%
      
      **RECENT TRADES:**
      ${JSON.stringify(recentTrades)}

      **COACHING TASK:**
      Analyze the data. Be the 'hard on content, soft on person' coach. Max 3 sentences.
    `;

    const result = await model.generateContent(fullPrompt);
    const tctResponseText = result.response.text();

    return { insight: tctResponseText };
  } catch (error) {
    console.error("TCT Error:", error.message);
    // Door een HttpsError te gooien, trigger je de 'catch' in je frontend code.
    // De frontend zal dan GEEN datum opslaan, waardoor de loop stopt.
    const { HttpsError } = require("firebase-functions/v2/https");
    throw new HttpsError('internal', 'TCT is recalibrating data.');
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
// --- 6. AI TRADER INTAKE ANALYZER (Gemini 2.5 Flash Thinking Optimized) ---
exports.analyzeTraderIntake = onCall({
  secrets: ["GEMINI_API_KEY"],
  region: "europe-west1" ,
  cors: true,
}, async (request) => {
  const { data } = request;
  const db = admin.firestore();
  
  if (!process.env.GEMINI_API_KEY) {
    return { success: false, error: "API Sleutel mist." };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // AANGEPAST: Gebruik de specifieke 2.5-flash identifier
  // Let op: 'thinking' features worden geactiveerd via de generationConfig
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
    generationConfig: { 
      responseMimeType: "application/json"
      // Hier kun je eventueel thinking parameters toevoegen als de SDK versie dit ondersteunt
    }
  });

  const { name, accounts, experience, biggestPain, email, isAudio, audioBase64 } = data;

  const prompt = `
  ## SYSTEM INSTRUCTION: TCT SHADOW ANALYST & ERP ARCHITECT (SMART LANGUAGE PROTOCOL)

  **IDENTITY:**
  You are the "Shadow Mentor", the onboarding architect for the Propfirm Portfolio Operating System (PPOS). You treat trading as a high-stakes business. Your goal is to map the trader's behavioral leaks and prescribe PPOS as the ONLY cure.

  **PHILOSOPHY:**
  No trader is "too dangerous" for PPOS. PPOS is the CURE for emotional and unstructured trading. We don't reject; we prescribe. We focus on Process (R-value), Journaling, and Data-driven coaching to turn unconscious gamblers into Conscious Traders.
  
  **LANGUAGE PROTOCOL:**
  1. **ADMIN DATA (transcript_summary & internal_note):** ALWAYS in Dutch (Nederlands).
  2. **TRADER DATA (shadow_analysis & blueprint):** - DEFAULT to English.
     - IF the trader's input (${biggestPain} or voice) is in Dutch, use DUTCH for these fields.
     - Goal: Maximum emotional impact in their own language.

  **THE PPOS ERP SOLUTIONS:**
  - **The Inventory Warehouse:** Centralized management for accounts/challenges. 
  - **The Performance Lab:** Manual journaling to build institutional DNA.
  - **TCT AI Co-Pilot:** Real-time shadow auditing and capital protection.
  - **Vision & Target Engine:** Connecting trades to the 'Ultimate Goal'.

  **OUTPUT CONTENT REQUIREMENTS:**
  - **shadow_analysis (The Pitch):** Max 3 punchy sentences. 
    * Part A: Confront them with their specific shadow (e.g. The Gambler, The Avenger).
    * Part B: Explain why PPOS is their only way out. Be short, cryptic, and triggering.
  - **blueprint:** 3 concrete steps referring to our ERP modules.

  **OUTPUT JSON FORMAT (STRICT):**
  {
    "transcript_summary": "Scherpe samenvatting van de intake (Nederlands).",
    "archetype": "English name (e.g. The Unstructured Inventory Manager).",
    "shadow_analysis": "Smart Language Choice: Problem/Solution pitch.",
    "blueprint": [
      "Stap 1: Initialiseer je 'Inventory Warehouse'...",
      "Stap 2: Start je 'Performance Lab' protocol...",
      "Stap 3: Koppel je 'Vision Engine'..."
    ],
    "readiness_score": Number(1-100),
    "internal_note": "Diepgaand Nederlands advies voor Admin John: Waarom deze trader PPOS nodig heeft."
  }
`;

  try {
    let promptParts = [{ text: prompt }];

    if (isAudio && audioBase64) {
      promptParts.push({
        inlineData: {
          mimeType: "audio/webm",
          data: audioBase64
        }
      });
    } else {
      promptParts[0].text += `\n\nINPUT: ${biggestPain}`;
    }

    // Voeg contextuele data toe
    promptParts[0].text += `\nCONTEXT: Trader ${name}, Ervaring: ${experience}, Accounts: ${accounts}`;

    const result = await model.generateContent(promptParts);
    const analysis = JSON.parse(result.response.text());

    // Schrijf naar Firestore
    await db.collection('whitelist_intakes').add({
      name, email, accounts, experience, 
      analysis,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, analysis };
  } catch (error) {
    console.error("Gemini 2.5 Error:", error);
    return { success: false, error: "Thinking process failed." };
  }
});

// --- 7. ANALYZE ACCOUNT AUDIT (PASSED & BREACHED ENGINE) ---
exports.analyzeShadowAudit = onRequest({ 
  secrets: ["GEMINI_API_KEY"],
  region: "europe-west1",
  cors: true 
}, async (req, res) => {
  const bb = busboy({ headers: req.headers });
  let audioBuffer = Buffer.alloc(0);
  let ctx = {};
  const db = admin.firestore(); // Initialiseer db voor gebruik in finish event

  bb.on('field', (name, val) => {
    if (name === 'accountContext') ctx = JSON.parse(val);
  });

  bb.on('file', (name, file, info) => {
    file.on('data', (data) => { audioBuffer = Buffer.concat([audioBuffer, data]); });
  });

  bb.on('finish', async () => {
    try {
      const userId = req.headers['x-user-uid'];
      if (!userId) return res.status(401).send("Unauthorized: Missing User UID");

      // 1. Haal de trades op die specifiek bij dit account horen
      const allTrades = await db.collection("users").doc(userId).collection("trades")
        .where("accountId", "==", ctx.accountId)
        .orderBy("date", "asc")
        .get();

      const trades = allTrades.docs.map(d => d.data());

      // 2. Bereken de statistieken voor de AI "Spiegel"
      const winTrades = trades.filter(t => Number(t.pnl) > 0);
      const lossTrades = trades.filter(t => Number(t.pnl) < 0);
      const totalProfit = winTrades.reduce((s, t) => s + Number(t.pnl), 0);

      const biggestWin = winTrades.length > 0 ? Math.max(...winTrades.map(t => Number(t.pnl))) : 0;
      const winConcentration = totalProfit > 0 ? (biggestWin / totalProfit) * 100 : 0;

      let revengeCount = 0;
      trades.forEach((t, i) => {
        if (i > 0 && trades[i-1].pnl < 0) {
          const diff = new Date(t.date) - new Date(trades[i-1].date);
          if (diff < 600000) revengeCount++; //
        }
      });

      const biggestLoss = lossTrades.length > 0 ? Math.min(...lossTrades.map(t => Number(t.pnl))) : 0;
      const avgLoss = lossTrades.length > 0 ? (lossTrades.reduce((s, t) => s + Number(t.pnl), 0) / lossTrades.length) : 0;
      const riskEscalation = avgLoss !== 0 ? (Math.abs(biggestLoss) / Math.abs(avgLoss)).toFixed(1) : 1;

      // 3. AI Initialisatie binnen de scope
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", // Gebruik stabiele identifier
        generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `
        ### SYSTEM INSTRUCTION: Forensic Trading Auditor (TCT)
        You are an elite forensic auditor. Analyze this account (${ctx.status}). 
        MISSION: Differentiate between REPEATABLE SKILL and EMOTIONAL LUCK.

        ACCOUNT DATA OVERVIEW:
        - Win Concentration: ${winConcentration.toFixed(1)}% (If >70%, highlight it as a Lucky Punch)
        - Revenge Trade Indicators: ${revengeCount} rapid re-entries after loss
        - Risk Escalation Factor: ${riskEscalation}x (Ratio of Biggest Loss to Avg Loss)
        - Deepest V-Curve PnL: ${biggestLoss}

        ANALYSIS GUIDELINES:
        - IF PASSED: Check if it's a "Gambler's Pass". If Win Concentration is high and trade count is low, expose the lack of process.
        - IF BREACHED: Pinpoint the "Tilt Point". Was it Revenge Trading or Risk Escalation?
        - THE MIRROR: Use data to invalidate excuses. If Risk Escalation > 2x, call out the inconsistency.

        OUTPUT JSON:
        {
          "reflection_summary": "Raw confession in 'I'-perspective.",
          "the_mirror": "Data-driven confrontation about Skill vs Luck.",
          "risk_integrity_score": 0-100,
          "account_grade": 0-10 (Passed by gambling = Grade < 4),
          "adaptive_rule_prescribed": ["Rule (max 5 words)"]
        }
      `;

      const result = await model.generateContent([
        { text: prompt }, 
        { inlineData: { mimeType: "audio/webm", data: audioBuffer.toString("base64") } }
      ]);
      const auditResult = JSON.parse(result.response.text());

      // 4. Sla de review op en trigger de Adaptive Rule Notificatie
      await db.collection("users").doc(userId).collection("account_reviews").add({
        accountId: ctx.accountId,
        status: ctx.status || 'Breached',
        aiData: auditResult,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      await db.collection("users").doc(userId).collection("notifications").add({
        type: "ADAPTIVE_RULE_PROPOSAL",
        message: auditResult.adaptive_rule_prescribed,
        shadowContext: auditResult.account_grade,
        status: "pending", 
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json(auditResult);
    } catch (error) {
      console.error("Audit Error:", error);
      res.status(500).send("Analysis Failed: " + error.message);
    }
  });

  if (req.rawBody) bb.end(req.rawBody); else req.pipe(bb);
});