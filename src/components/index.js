const functions = require('firebase-functions');
const admin = require('firebase-admin'); // NIEUW: Nodig voor God Mode logging
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialiseer Firebase Admin (alleen als het nog niet is gebeurd)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Initialiseer Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.getTCTInsight = functions.https.onCall(async (data, context) => {
  // 1. Veiligheidscheck
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Log in om TCT te horen.');

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
    
    Geef een kort, krachtig en 'bewust' inzicht van maximaal 3 zinnen. Praat direct tegen de trader.` ;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tctResponseText = response.text();

    // 2. LOG DEZE INSIGHT VOOR DE ADMIN (God Mode)
    try {
      await admin.firestore().collection('logs_tct').add({
        userId: context.auth.uid,
        userName: context.auth.token.name || context.auth.token.email.split('@')[0],
        insight: tctResponseText,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        stats: stats 
      });
    } catch (logError) {
      console.error("Logging to logs_tct failed:", logError);
    }

    // 3. Stuur resultaat naar de gebruiker
    return { insight: tctResponseText };

  } catch (error) {
    console.error("TCT Error:", error);
    return { insight: "Ik ben even aan het mediteren. Log een trade en ik ben er weer voor je." };
  }
});