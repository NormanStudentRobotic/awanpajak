// api/tax.js
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const { type, payload } = req.body || {};

  if (type === "ppn") {
    const { price, rate = 0.11 } = payload;
    const tax = price * rate;
    const total = price + tax;
    return res.status(200).json({ tax, total });
  }

  if (type === "pph21") {
    const { annualIncome, ptkp = 54000000 } = payload;
    const taxable = Math.max(0, annualIncome - ptkp);
    let tax = 0;

    if (taxable <= 60000000) tax = taxable * 0.05;
    else if (taxable <= 250000000) tax = 60000000 * 0.05 + (taxable - 60000000) * 0.15;
    else tax = 60000000 * 0.05 + 190000000 * 0.15 + (taxable - 250000000) * 0.25;

    return res.status(200).json({
      taxable,
      taxAnnual: tax,
      taxMonthly: tax / 12
    });
  }

  return res.status(400).json({ error: "Invalid type" });
}
