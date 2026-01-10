//+------------------------------------------------------------------+
//|                                               Propfolio_Sync.mq5 |
//|                                     Copyright 2026, Propfolio AI |
//|                                             https://www.mql5.com |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026, Propfolio AI"
#property link      "https://propfolio.app/"
#property version   "1.10"
#property script_show_inputs
#property strict

// --- INPUT PARAMETERS ---
input string InpSyncID = "PASTE_YOUR_KEY_HERE"; // Vul hier je Sync-ID in uit Firestore
input string InpUrl = "https://europe-west1-bewustetrader.cloudfunctions.net/mt5DataReceiver";

void OnStart()
{
   // 1. HAAL ACCOUNTDATA OP (De Basis)
   string s_acc     = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string s_broker  = AccountInfoString(ACCOUNT_COMPANY);
   string s_balance = DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2);
   string s_curr    = AccountInfoString(ACCOUNT_CURRENCY);
   
   // Schoon de broernaam op voor JSON veiligheid
   StringReplace(s_broker, "\"", ""); 

   // 2. HAAL TRADES OP (Inclusief Commissie, Swap en Duur)
   string tradesJson = "";
   HistorySelect(0, TimeCurrent());
   int total = HistoryDealsTotal();
   int count = 0;

   // We lopen van achteren naar voren door de deals
   for(int i = total - 1; i >= 0 && count < 50; i--) {
      ulong ticket = HistoryDealGetTicket(i);
      long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      double pnl = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      
      // Pak alleen de deals die een positie sluiten (ENTRY_OUT)
      if((type == DEAL_TYPE_BUY || type == DEAL_TYPE_SELL) && entry == DEAL_ENTRY_OUT) {
         
         // Extra details ophalen
         double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
         double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
         double volume     = HistoryDealGetDouble(ticket, DEAL_VOLUME);
         string symbol     = HistoryDealGetString(ticket, DEAL_SYMBOL);

         // Zoek de openingstijd op basis van Position ID voor de duur (Duration)
         ulong pos_id = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
         HistorySelectByPosition(pos_id);
         
         // De eerste deal van een positie is de opening (ENTRY_IN)
         datetime open_t = (datetime)HistoryDealGetInteger(HistoryDealGetTicket(0), DEAL_TIME);
         datetime close_t = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);

         // Bouw Trade JSON object
         if(count > 0) tradesJson += ",";
         tradesJson += "{";
         tradesJson += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
         tradesJson += "\"symbol\":\"" + symbol + "\",";
         tradesJson += "\"profit\":" + DoubleToString(pnl, 2) + ",";
         tradesJson += "\"commission\":" + DoubleToString(commission, 2) + ",";
         tradesJson += "\"swap\":" + DoubleToString(swap, 2) + ",";
         tradesJson += "\"volume\":" + DoubleToString(volume, 2) + ",";
         tradesJson += "\"open_time\":\"" + TimeToString(open_t, TIME_DATE|TIME_SECONDS) + "\",";
         tradesJson += "\"close_time\":\"" + TimeToString(close_t, TIME_DATE|TIME_SECONDS) + "\"";
         tradesJson += "}";
         
         count++;
      }
   }

   // 3. BOUW DE VOLLEDIGE JSON (Account + Trades)
   string body = "{\"sync_id\":\"" + InpSyncID + "\",";
   body += "\"account_number\":\"" + s_acc + "\",";
   body += "\"firm\":\"" + s_broker + "\",";
   body += "\"balance\":" + s_balance + ",";
   body += "\"currency\":\"" + s_curr + "\",";
   body += "\"trades\":[" + tradesJson + "]}";
   
   Print("Propfolio Syncing: Account ", s_acc, " with ", count, " trades.");

   // 4. VERZENDEN MET DE CHAR ARRAY FIX
   char data[];
   int len = StringLen(body);
   ArrayResize(data, len);
   for(int i=0; i<len; i++) {
      data[i] = (char)StringGetCharacter(body, i);
   }

   char response[];
   string response_headers;
   ResetLastError();
   int res = WebRequest("POST", InpUrl, "Content-Type: application/json", 5000, data, response, response_headers);

   // 5. RESULTAAT LOGGEN
   if(res == 200) {
      Print("Propfolio: SUCCESS! Server Response: ", CharArrayToString(response));
   } else {
      Print("Propfolio: ERROR ", res, ". Check URL or Sync-ID. Response: ", CharArrayToString(response));
   }
}