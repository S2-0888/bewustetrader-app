import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import Papa from 'papaparse';
import { UploadSimple, CheckCircle, Warning, Table } from '@phosphor-icons/react';

export default function ImportModule({ type = 'payouts' }) {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState(1); // 1: Upload, 2: Match, 3: Success
  const [loading, setLoading] = useState(false);

  // De velden die jouw systeem nodig heeft
  const targetFields = type === 'payouts' 
    ? ['date', 'source', 'amount', 'accountNumber']
    : ['purchaseDate', 'firm', 'size', 'originalPrice', 'accountNumber'];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setHeaders(Object.keys(results.data[0]));
        setCsvData(results.data);
        setStep(2);
      }
    });
  };

  const executeImport = async () => {
    setLoading(true);
    const user = auth.currentUser;
    const collectionName = type === 'payouts' ? 'payouts' : 'accounts';

    try {
      const batchPromises = csvData.map(row => {
        const newDoc = {
          createdAt: new Date(),
          // Hier vindt de magie van de mapping plaats
          ...Object.keys(mapping).reduce((acc, targetField) => {
            const csvColumn = mapping[targetField];
            let val = row[csvColumn];
            
            // Simpele opschoning van valuta ($1,234.56 -> 1234.56)
            if (targetField === 'amount' || targetField === 'originalPrice' || targetField === 'size') {
              val = Number(val?.replace(/[^0-9.-]+/g, ""));
            }
            
            acc[targetField] = val;
            return acc;
          }, {})
        };

        // Zorg voor fallback waarden die jouw app verwacht
        if (type === 'payouts') {
            newDoc.convertedAmount = newDoc.amount;
            newDoc.currency = 'USD';
        } else {
            newDoc.status = 'Active';
            newDoc.balance = Number(newDoc.size);
            newDoc.startBalance = Number(newDoc.size);
        }

        return addDoc(collection(db, "users", user.uid, collectionName), newDoc);
      });

      await Promise.all(batchPromises);
      setStep(3);
    } catch (err) {
      console.error("Import failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bento-card" style={{ padding: 25, marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <UploadSimple size={24} weight="bold" color="#007AFF" />
        <h3 style={{ fontWeight: 800, margin: 0 }}>Import {type.charAt(0).toUpperCase() + type.slice(1)}</h3>
      </div>

      {step === 1 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed #E5E5EA', borderRadius: 20 }}>
          <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} id={`file-${type}`} />
          <label htmlFor={`file-${type}`} style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#007AFF' }}>Kies CSV bestand</div>
            <div style={{ fontSize: 11, color: '#86868B', marginTop: 5 }}>Selecteer je export uit Excel of Google Sheets</div>
          </label>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={{ fontSize: 12, color: '#86868B', marginBottom: 15 }}>Koppel de kolommen uit je bestand aan ons systeem:</p>
          <div style={{ display: 'grid', gap: 12 }}>
            {targetFields.map(field => (
              <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{field.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                <select 
                  className="apple-input" 
                  style={{ width: '60%', padding: '8px' }}
                  onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  value={mapping[field] || ''}
                >
                  <option value="">Selecteer kolom...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button 
            onClick={executeImport} 
            disabled={loading || Object.keys(mapping).length < targetFields.length}
            className="btn-primary" 
            style={{ width: '100%', marginTop: 25, background: '#000' }}
          >
            {loading ? 'Importeren...' : 'Start Import'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <CheckCircle size={48} weight="fill" color="#30D158" />
          <h4 style={{ fontWeight: 800, marginTop: 15 }}>Import Succesvol!</h4>
          <p style={{ fontSize: 12, color: '#86868B' }}>Je data is direct verwerkt in je dashboard.</p>
          <button onClick={() => setStep(1)} className="btn-primary" style={{ marginTop: 15, background: '#F2F2F7', color: '#000' }}>Nog een bestand</button>
        </div>
      )}
    </div>
  );
}