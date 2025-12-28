// Update voor Secret Versie 3 - 27 dec 2025
const { onCall, onRequest } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const busboy = require("busboy");

// Initialiseer Firebase Admin (alleen als het nog niet is gebeurd)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- 1. TCT AI COACH (v2 Syntax met behoud van jouw instructies) ---
exports.getTCTInsight = onCall({ 
  secrets: ["GEMINI_API_KEY"],
  region: "us-central1" 
}, async (request) => {
  console.log("Update trigger: 27-12-18:45"); // FORCEERT DEPLOY VOOR NIEUWE SECRET
  
  const { data, auth } = request;
  
  if (!auth) {
    throw new Error('unauthenticated');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `Jij bent TCT (The Conscious Trader), de digitale coach van 'De Bewuste Trader'. 
    Jouw Identiteit:
    - Jij bent een empathische en motiverende mentor. Je weet dat traden een eenzame strijd is en dat na regen altijd zonneschijn komt.
    - Jouw motto: 'Als er een deur dichtgaat, gaat er altijd ergens een andere open.'
    Jouw Harde Waarheid:
    - Je bent eerlijk over uitvoering. Een trade volgens plan is een winst, ongeacht de PnL. Een trade buiten het plan is een fout, zelfs als het geld opleverde.
    Jouw DNA:
    - Motiverend, menselijk en wijs.
    - Mindset is het stuur, strategie de motor.
    - Als de data goed is maar de PnL negatief, herinner je hen eraan dat de 'zon weer gaat schijnen' zolang ze hun proces vertrouwen
    - Je bent de 'Kapitein in de storm'. 
    - Als de data slecht is (lage adherence), ben je niet boos, maar help je de trader in te zien dat dit een 'nieuw begin' is.
    - Je prijst discipline (Adherence) boven winst (PnL).
    - Bij verlies herinner je aan de 1:3 RRR wiskunde: 'Verlies is slechts een val tijdens het leren fietsen'.
    - Wees alert op: Wraith trading, FOMO, en 'Had ik maar...' gevoelens.`
  });

  const { recentTrades, stats } = data;
  const prompt = `
    Analyseer de volgende data van de trader:
    - Winrate: ${stats.winrate}%
    - Gemiddelde Discipline (Adherence): ${stats.adherence}%
    - Recente Trades: ${JSON.stringify(recentTrades)}
    
    Geef een kort, krachtig en 'bewust' inzicht van maximaal 3 zinnen. Praat direct tegen de trader.`;

  try {
    const result = await model.generateContent(prompt);
    const tctResponseText = result.response.text();

    // LOG DEZE INSIGHT VOOR DE ADMIN (God Mode)
    await admin.firestore().collection('logs_tct').add({
      userId: auth.uid,
      userName: auth.token.name || auth.token.email.split('@')[0],
      insight: tctResponseText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      stats: stats 
    });

    return { insight: tctResponseText };
  } catch (error) {
    console.error("TCT Error:", error);
    return { insight: "Ik ben even aan het mediteren. Log een trade en ik ben er weer voor je." };
  }
});

// --- 2. STRIPE WEBHOOK (Bestaande logica) ---
exports.stripeWebhook = onRequest({ 
  secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  region: "us-central1"
}, async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userEmail = session.customer_details.email;

    const userQuery = await admin.firestore().collection('users').where('email', '==', userEmail).get();
    
    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0];
      await userDoc.ref.update({
        isApproved: true,
        isFounder: true,
        status: 'paid',
        stripeSubscriptionId: session.subscription || session.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Succes! Gebruiker ${userEmail} geactiveerd.`);
    }
  }
  res.json({ received: true });
});

// --- 3. ANALYZE VOICE TRADE (v2 - Super Debug Versie) ---
exports.analyzeVoiceTrade = onRequest({ 
  secrets: ["GEMINI_API_KEY"],
  region: "us-central1",
  cors: true,
  maxInstances: 10
}, async (req, res) => {
  console.log("Update trigger: 27-12-18:45"); // FORCEERT DEPLOY VOOR NIEUWE SECRET
  console.log(">>> Aanvraag ontvangen. Methode:", req.method);
  
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // Check of de secret geladen is
  if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is niet gevonden!");
    return res.status(500).json({ error: "Server configuratie fout: API Key ontbreekt." });
  }

  const bb = busboy({ headers: req.headers });
  let audioBuffer = Buffer.alloc(0);
  let customPrompt = "";

  bb.on("file", (fieldname, file, info) => {
    console.log(`Bestand gedetecteerd: ${fieldname}, Type: ${info.mimeType}`);
    file.on("data", (data) => {
      audioBuffer = Buffer.concat([audioBuffer, data]);
    });
  });

  bb.on("field", (fieldname, val) => {
    if (fieldname === "prompt") customPrompt = val;
  });

  bb.on("finish", async () => {
    console.log("Busboy klaar. Grootte audioBuffer:", audioBuffer.length);

    try {
      if (audioBuffer.length === 0) {
        throw new Error("Geen audio data ontvangen van de browser.");
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      console.log("Gemini aanroepen...");
      
      const result = await model.generateContent([
        { text: customPrompt || "Transcribeer deze audio." },
        {
          inlineData: {
            mimeType: "audio/webm", 
            data: audioBuffer.toString("base64"),
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();
      
      console.log("Gemini succes! Tekst gegenereerd.");
      res.status(200).json({ analysis: text });

    } catch (error) {
      console.error("CRASH IN FINISH HANDLER:", error.message);
      res.status(500).json({ 
        error: "AI verwerking mislukt", 
        details: error.message 
      });
    }
  });

  bb.on("error", (err) => {
    console.error("Busboy Error:", err);
    res.status(500).send("Parsing error");
  });

  if (req.rawBody) {
    bb.end(req.rawBody);
  } else {
    req.pipe(bb);
  }
});