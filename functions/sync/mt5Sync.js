const admin = require('firebase-admin');

const mt5SyncHandler = (db) => async (req, res) => {
  try {
    // Basis data extractie
    const rawData = req.rawBody ? req.rawBody.toString() : "{}";
    const data = JSON.parse(rawData);
    const { sync_id, trades, account_number, firm, balance, currency } = data;

    if (!sync_id) return res.status(400).send("Sync-ID ontbreekt");

    // 1. Zoek de gebruiker
    const userQuery = await db.collection('users').where('sync_id', '==', String(sync_id)).limit(1).get();
    if (userQuery.empty) return res.status(404).send("Sync-ID niet herkend");

    const userId = userQuery.docs[0].id;
    const FieldValue = admin.firestore.FieldValue;
    const batch = db.batch();

    // 2. STAP 1: De Account Buffer (VOOR MAGIC FILL)
    // Dit zorgt dat Portfolio.jsx de blauwe balk laat zien
    const bufferRef = db.collection('users').doc(userId).collection('incoming_syncs').doc('latest_account_info');
    batch.set(bufferRef, {
      account_number: String(account_number),
      firm: firm || "Onbekend",
      balance: Number(balance) || 0,
      currency: currency || "USD",
      syncedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // 3. STAP 2: De Trades (VOOR TRADELAB)
    if (trades && Array.isArray(trades)) {
      trades.forEach(trade => {
        const docRef = db.collection('users').doc(userId).collection('incoming_syncs').doc(String(trade.ticket));
        batch.set(docRef, {
          ...trade,
          account_number: String(account_number),
          firm: firm || "Unknown",
          syncedAt: FieldValue.serverTimestamp(),
          status: 'pending_match'
        }, { merge: true });
      });
    }

    await batch.commit();
    return res.status(200).json({ 
      status: 'success', 
      message: `Account ${account_number} and ${trades ? trades.length : 0} trades processed` 
    });

  } catch (error) {
    console.error("Sync error:", error.message);
    return res.status(500).send("Fout bij verwerken: " + error.message);
  }
};

module.exports = mt5SyncHandler;