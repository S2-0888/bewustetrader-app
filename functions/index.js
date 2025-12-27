const { onCall, onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// --- 1. TCT AI COACH (v2 Syntax) ---
exports.getTCTInsight = onCall({ 
  secrets: ["GEMINI_API_KEY"],
  region: "us-central1" 
}, async (request) => {
  // In v2 zitten data en auth in het 'request' object
  const { data, auth } = request;
  
  if (!auth) {
    throw new Error('unauthenticated');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `Jij bent TCT, de coach van 'De Bewuste Trader'. 
    - Motiverende mentor: 'Na regen komt zonneschijn'. 
    - Harde waarheid: 'Plan volgen = winst, plan negeren = fout'.
    - Toon: Menselijk, wijs, en direct (RRR, Edge, Adherence).`
  });

  const { recentTrades, stats } = data;
  const prompt = `Winrate: ${stats.winrate}%, Adherence: ${stats.adherence}%. Trades: ${JSON.stringify(recentTrades)}. Geef 1-3 korte, krachtige zinnen advies.`;

  try {
    const result = await model.generateContent(prompt);
    const tctResponseText = result.response.text();

    await admin.firestore().collection('logs_tct').add({
      userId: auth.uid,
      userName: auth.token.name || auth.token.email.split('@')[0],
      insight: tctResponseText,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      stats: stats 
    });

    return { insight: tctResponseText };
  } catch (error) {
    console.error("AI Error:", error);
    return { insight: "Focus op je blueprint. De weg naar meesterschap is een marathon." };
  }
});

// --- 2. STRIPE WEBHOOK (v2 Syntax) ---
exports.stripeWebhook = onRequest({ 
  secrets: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  region: "us-central1"
}, async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Gebruik req.rawBody voor verificatie (v2 standaard)
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