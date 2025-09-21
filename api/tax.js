// api/tax.js
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Use POST'});
  const { type, payload } = req.body||{};

  if (type === 'ppn') {
    const {price=0, rate=0.11} = payload||{};
    const tax = price*rate, total=price+tax;
    return res.status(200).json({kind:'ppn', price, rate, tax, total});
  }

  if (type === 'pph21_adv') {
    const { gajiPokok=0, tunjTetap=0, tunjLain=0, thr=0, statusKawin='TK', tanggungan=0 } = payload||{};
    const base = gajiPokok+tunjTetap+tunjLain;
    const baseBPJS = gajiPokok+tunjTetap;
    const bpjsKes = Math.min(baseBPJS,12000000)*0.01;
    const jht = baseBPJS*0.02;
    const jp = Math.min(baseBPJS,10547400)*0.01;
    const jobExpM = Math.min(base*0.05,500000);
    const grossAnnual = base*12+thr;
    const jobExpA = Math.min(base*12*0.05,6000000);
    const netAnnual = grossAnnual-jobExpA-(jht+jp)*12;
    const ptkp = 54000000+(statusKawin==='K'?4500000:0)+Math.min(3,tanggungan)*4500000;
    let pkp=Math.max(0,netAnnual-ptkp); pkp=Math.floor(pkp/1000)*1000;
    let tax=0,rem=pkp,last=0;
    const layers=[{u:60000000,r:0.05},{u:250000000,r:0.15},{u:500000000,r:0.25},{u:5000000000,r:0.30},{u:Infinity,r:0.35}];
    for(const l of layers){const slice=Math.max(0,Math.min(rem,l.u-last));tax+=slice*l.r;rem-=slice;last=l.u;if(rem<=0)break;}
    const pphAnnual=Math.round(tax);
    const pphMonthly=Math.round(pphAnnual/12);
    const takeHome=base-jobExpM-bpjsKes-jht-jp-pphMonthly;
    return res.status(200).json({kind:'pph21_adv',
      monthly:{gross:base,jobExpense:jobExpM,bpjs_kes_employee:bpjsKes,jht_employee:jht,jp_employee:jp,pph21:pphMonthly,takeHome},
      annual:{gross:grossAnnual,jobExpense:jobExpA,ptkp,pkp,pph21:pphAnnual}
    });
  }

  return res.status(400).json({error:'Unsupported type'});
}
