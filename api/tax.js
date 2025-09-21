// api/tax.js
// Serverless API (Vercel Function) untuk PPN & PPh21 detail + BPJS.
// Catatan: Simulasi untuk edukasi. Verifikasi aturan terbaru jika untuk produksi.
export default function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  try{
    const { type, payload } = req.body || {};
    if (!type) return res.status(400).json({ error: 'Missing type' });

    if (type === 'ppn'){
      const { price = 0, rate = 0.11 } = payload || {};
      const base = num(price);
      const r = num(rate);
      if (!Number.isFinite(base) || base < 0) return res.status(400).json({ error:'Invalid price' });
      if (!Number.isFinite(r) || r < 0) return res.status(400).json({ error:'Invalid rate' });
      const tax = round2(base * r);
      const total = round2(base + tax);
      return res.status(200).json({ kind:'ppn', price: base, rate: r, tax, total });
    }

    if (type === 'pph21_detailed'){
      const {
        gajiPokok = 0, tunjTetap = 0, tunjLain = 0, thr = 0,
        statusKawin = 'TK', tanggungan = 0
      } = payload || {};

      const base = num(gajiPokok) + num(tunjTetap) + num(tunjLain); // bruto/bln
      const baseBPJS = num(gajiPokok) + num(tunjTetap); // dasar iuran: gaji pokok + tunjangan tetap

      // BPJS Kesehatan (pegawai 1%) cap upah 12.000.000
      const capKes = 12000000;
      const bpjsKesEmployee = round2(Math.min(baseBPJS, capKes) * 0.01);

      // JHT 2% (tanpa batas), JP 1% (cap 10.547.400)
      const jhtEmployee = round2(baseBPJS * 0.02);
      const capJP = 10547400;
      const jpEmployee = round2(Math.min(baseBPJS, capJP) * 0.01);

      // Biaya jabatan 5% maks 500.000/bln (6.000.000/thn)
      const jobExpenseMonthly = Math.min(base * 0.05, 500000);

      // Tahunan
      const grossAnnual = round2(base * 12 + num(thr));
      const jobExpenseAnnual = Math.min(round2(base * 12 * 0.05), 6000000);
      const pensionContribsAnnual = round2((jhtEmployee + jpEmployee) * 12);
      const netAnnual = Math.max(0, round2(grossAnnual - jobExpenseAnnual - pensionContribsAnnual));

      // PTKP
      const ptkp = getPTKP(statusKawin, tanggungan);

      // PKP (dibulatkan ke bawah ke ribuan)
      let pkp = Math.max(0, netAnnual - ptkp);
      pkp = Math.floor(pkp / 1000) * 1000;

      // PPh21 tahunan
      const pphAnnual = calcPPhAnnual(pkp);

      // Bulanan estimasi
      const pphMonthly = round2(pphAnnual / 12);

      // Take Home Pay/bln
      const takeHomeMonthly = round2(base - jobExpenseMonthly - bpjsKesEmployee - jhtEmployee - jpEmployee - pphMonthly);

      return res.status(200).json({
        kind:'pph21_detailed',
        monthly:{
          gross: round2(base),
          jobExpense: round2(jobExpenseMonthly),
          bpjs_kes_employee: bpjsKesEmployee,
          jht_employee: jhtEmployee,
          jp_employee: jpEmployee,
          pph21: pphMonthly,
          takeHome: takeHomeMonthly
        },
        annual:{
          gross: grossAnnual,
          neto: netAnnual,
          ptkp: ptkp,
          pkp: pkp,
          pph21: pphAnnual
        },
        meta:{
          caps:{ bpjsKesCap: capKes, jpCap: capJP },
          params:{ statusKawin, tanggungan }
        }
      });
    }

    return res.status(400).json({ error: 'Unsupported type' });
  } catch(e){
    return res.status(500).json({ error: 'Server error' });
  }
}

// Helpers
function num(n){ const x = Number(n); return Number.isFinite(x) ? x : 0; }
function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }

function getPTKP(statusKawin, tanggungan=0){
  const base = 54000000;
  const married = (statusKawin === 'K') ? 4500000 : 0;
  const deps = Math.max(0, Math.min(3, Number(tanggungan)||0)) * 4500000;
  return base + married + deps;
}
function calcPPhAnnual(pkp){
  const layers = [
    { upTo:  60000000, rate: 0.05 },
    { upTo: 250000000, rate: 0.15 },
    { upTo: 500000000, rate: 0.25 },
    { upTo:5000000000, rate: 0.30 },
    { upTo:       Infinity, rate: 0.35 }
  ];
  let tax = 0, last = 0, remaining = pkp;
  for(const l of layers){
    const slice = Math.max(0, Math.min(remaining, l.upTo - last));
    tax += slice * l.rate;
    remaining -= slice;
    last = l.upTo;
    if (remaining <= 0) break;
  }
  return round2(tax);
}
