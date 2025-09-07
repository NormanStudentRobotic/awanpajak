// api/tax.js
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const { type, payload } = req.body || {};
    if (!type) return res.status(400).json({ error: 'Missing type' });

    if (type === 'ppn') {
      const { price, rate = 0.11 } = payload || {};
      const base = Number(price);
      const r = Number(rate);
      if (!Number.isFinite(base) || base < 0) {
        return res.status(400).json({ error: 'Invalid price' });
      }
      if (!Number.isFinite(r) || r < 0) {
        return res.status(400).json({ error: 'Invalid rate' });
      }
      const tax = round2(base * r);
      const total = round2(base + tax);
      return res.status(200).json({ kind: 'ppn', price: base, rate: r, tax, total });
    }

    if (type === 'pph21') {
      const {
        annualIncome,
        ptkp = 54000000,
        brackets = [
          { upTo: 60000000, rate: 0.05 },
          { upTo: 250000000, rate: 0.15 },
          { upTo: 500000000, rate: 0.25 },
          { upTo: Infinity, rate: 0.30 },
        ],
      } = payload || {};

      const income = Number(annualIncome);
      const allowance = Number(ptkp);
      if (!Number.isFinite(income) || income < 0) {
        return res.status(400).json({ error: 'Invalid annualIncome' });
      }
      if (!Number.isFinite(allowance) || allowance < 0) {
        return res.status(400).json({ error: 'Invalid ptkp' });
      }

      const taxable = Math.max(0, income - allowance);
      let remaining = taxable;
      let tax = 0;
      let lastCap = 0;

      for (const br of brackets) {
        const cap = br.upTo;
        const slice = Math.max(0, Math.min(remaining, cap - lastCap));
        tax += slice * br.rate;
        remaining -= slice;
        lastCap = cap;
        if (remaining <= 0) break;
      }

      tax = round2(tax);
      const monthlyTax = round2(tax / 12);
      const takeHomeMonthly = round2((income / 12) - monthlyTax);

      return res.status(200).json({
        kind: 'pph21',
        annualIncome: income,
        ptkp: allowance,
        taxable,
        taxAnnual: tax,
        taxMonthly: monthlyTax,
        takeHomeMonthly,
        brackets,
      });
    }

    return res.status(400).json({ error: 'Unsupported type' });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
