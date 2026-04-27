/* eslint-disable */
// ============================================================
// FINANCIAL — Billing + Insurance
// ============================================================

function Billing() {
  const [tab, setTab] = React.useState('outstanding');

  const invoices = [
    {id: 'INV-8842', patient: 'Pierre Boudreaux', date: '04/26/26', amount: 142.50, paid: 0,      status: 'unpaid',     age: '1d',  method: '—'},
    {id: 'INV-8841', patient: 'James Hebert',     date: '04/26/26', amount: 14.20,  paid: 14.20,  status: 'paid',       age: '1d',  method: 'Card'},
    {id: 'INV-8840', patient: 'Yvette Robichaux', date: '04/25/26', amount: 86.00,  paid: 0,      status: 'unpaid',     age: '2d',  method: '—'},
    {id: 'INV-8839', patient: 'Marie Comeaux',    date: '04/25/26', amount: 12.00,  paid: 12.00,  status: 'paid',       age: '2d',  method: 'HSA'},
    {id: 'INV-8838', patient: 'Beau Thibodeaux',  date: '04/22/26', amount: 28.00,  paid: 28.00,  status: 'paid',       age: '5d',  method: 'Card'},
    {id: 'INV-8837', patient: 'Annette LeBlanc',  date: '04/20/26', amount: 188.40, paid: 50.00,  status: 'partial',    age: '7d',  method: 'Charge'},
    {id: 'INV-8836', patient: 'Marcus Guidry',    date: '04/05/26', amount: 64.00,  paid: 0,      status: 'overdue',    age: '22d', method: '—'},
    {id: 'INV-8835', patient: 'Camille Fontenot', date: '03/24/26', amount: 22.00,  paid: 0,      status: 'overdue',    age: '34d', method: '—'},
  ];

  const tone = {paid: 'ok', unpaid: 'mute', partial: 'warn', overdue: 'danger'};
  const lbl  = {paid: 'Paid', unpaid: 'Unpaid', partial: 'Partial', overdue: 'Overdue'};

  return (
    <AppShell active="billing" sublabel="Financial" title="Billing"
      subtitle="$8,412 outstanding · 3 invoices > 30 days"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Send className="ic-sm"/> Send statements</button>
        <button className="btn btn-secondary btn-sm"><I.Download className="ic-sm"/> Export</button>
        <button className="btn btn-primary btn-sm"><I.Plus/> New invoice</button>
      </>}>
      <Toolbar
        tabs={[
          {id: 'outstanding', label: 'Outstanding', count: 42},
          {id: 'paid', label: 'Paid', count: 312},
          {id: 'overdue', label: 'Overdue', count: 3},
          {id: 'all', label: 'All'},
        ]}
        active={tab} onChange={setTab}
        search="" searchPlaceholder="Search invoice #, patient…"
        filters={[{label: 'Date', value: 'Last 30d'}, {label: 'Method', icon: I.Card}]}
      />

      <div className="card" style={{overflow: 'hidden'}}>
        <table className="tbl">
          <thead><tr>
            <th>Invoice</th><th>Patient</th><th>Date</th>
            <th className="t-num" style={{textAlign: 'right'}}>Amount</th>
            <th className="t-num" style={{textAlign: 'right'}}>Paid</th>
            <th className="t-num" style={{textAlign: 'right'}}>Balance</th>
            <th>Age</th><th>Method</th><th>Status</th>
            <th style={{width: 36}}></th>
          </tr></thead>
          <tbody>
            {invoices.map(i => (
              <tr key={i.id} style={{cursor: 'pointer'}}>
                <td className="bnds-mono" style={{fontSize: 12, color: 'var(--bnds-forest)', fontWeight: 500}}>{i.id}</td>
                <td style={{fontWeight: 500}}>{i.patient}</td>
                <td className="t-xs">{i.date}</td>
                <td className="t-num" style={{textAlign: 'right', fontWeight: 500}}>${i.amount.toFixed(2)}</td>
                <td className="t-num" style={{textAlign: 'right', color: 'var(--ink-3)'}}>${i.paid.toFixed(2)}</td>
                <td className="t-num" style={{textAlign: 'right', fontWeight: 500, color: i.amount - i.paid > 0 ? 'var(--ink)' : 'var(--ink-4)'}}>${(i.amount - i.paid).toFixed(2)}</td>
                <td className="t-xs" style={{color: i.age.includes('d') && parseInt(i.age) > 14 ? 'var(--danger)' : 'var(--ink-3)'}}>{i.age}</td>
                <td className="t-xs">{i.method}</td>
                <td><StatusPill tone={tone[i.status]} label={lbl[i.status]}/></td>
                <td><I.ChevR style={{color: 'var(--ink-4)'}}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function Insurance() {
  const [tab, setTab] = React.useState('rejected');

  const claims = [
    {id: 'CLM-44210', patient: 'James Hebert',     plan: 'BCBS Louisiana', drug: 'Atorvastatin 20mg',  billed: 78.40,  paid: 0,     status: 'rejected', code: 'PA req',          submitted: '04/26'},
    {id: 'CLM-44209', patient: 'Marie Comeaux',    plan: 'Medicare Pt D',  drug: 'Lisinopril 10mg',    billed: 14.80,  paid: 14.80, status: 'paid',     code: '—',                submitted: '04/26'},
    {id: 'CLM-44208', patient: 'Yvette Robichaux', plan: 'Medicare Pt D',  drug: 'Ozempic 0.5mg',      billed: 932.00, paid: 0,     status: 'rejected', code: 'NDC not covered',  submitted: '04/26'},
    {id: 'CLM-44207', patient: 'Beau Thibodeaux',  plan: 'United HC',      drug: 'Oxycodone 5mg',      billed: 32.00,  paid: 0,     status: 'pending',  code: 'In review',        submitted: '04/26'},
    {id: 'CLM-44206', patient: 'Pierre Boudreaux', plan: 'Medicare Pt D',  drug: 'Metformin HCl',      billed: 18.40,  paid: 18.40, status: 'paid',     code: '—',                submitted: '04/25'},
    {id: 'CLM-44205', patient: 'Annette LeBlanc',  plan: 'BCBS Louisiana', drug: 'Levothyroxine',      billed: 12.00,  paid: 8.00,  status: 'partial',  code: 'Copay applied',    submitted: '04/25'},
    {id: 'CLM-44204', patient: 'Camille Fontenot', plan: 'Cash',           drug: 'Amoxicillin 500mg',  billed: 22.00,  paid: 0,     status: 'rejected', code: 'No coverage',      submitted: '04/24'},
    {id: 'CLM-44203', patient: 'Marcus Guidry',    plan: 'Cigna',          drug: 'Sertraline 50mg',    billed: 18.00,  paid: 18.00, status: 'paid',     code: '—',                submitted: '04/24'},
  ];
  const tone = {paid: 'ok', rejected: 'danger', pending: 'warn', partial: 'info'};
  const lbl  = {paid: 'Paid', rejected: 'Rejected', pending: 'Pending', partial: 'Partial'};

  return (
    <AppShell active="insurance" sublabel="Financial" title="Insurance"
      subtitle="3 claims need attention · 1 PA in progress"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Refill className="ic-sm"/> Re-submit batch</button>
        <button className="btn btn-secondary btn-sm">Plan formulary</button>
        <button className="btn btn-primary btn-sm"><I.Plus/> Submit claim</button>
      </>}>
      <Toolbar
        tabs={[
          {id: 'rejected', label: 'Need action', count: 3},
          {id: 'pending', label: 'Pending', count: 1},
          {id: 'paid', label: 'Paid', count: 412},
          {id: 'all', label: 'All'},
        ]}
        active={tab} onChange={setTab}
        search="" searchPlaceholder="Search claim, patient, plan…"
        filters={[{label: 'Plan'}, {label: 'Date', value: 'Last 30d'}]}
      />

      <div className="card" style={{overflow: 'hidden'}}>
        <table className="tbl">
          <thead><tr>
            <th>Claim #</th><th>Patient</th><th>Plan</th><th>Drug</th>
            <th className="t-num" style={{textAlign: 'right'}}>Billed</th>
            <th className="t-num" style={{textAlign: 'right'}}>Paid</th>
            <th>Status / Reason</th><th>Submitted</th>
            <th style={{width: 36}}></th>
          </tr></thead>
          <tbody>
            {claims.map(c => (
              <tr key={c.id} style={{cursor: 'pointer'}}>
                <td className="bnds-mono" style={{fontSize: 12, color: 'var(--bnds-forest)', fontWeight: 500}}>{c.id}</td>
                <td style={{fontWeight: 500}}>{c.patient}</td>
                <td className="t-xs">{c.plan}</td>
                <td className="t-xs">{c.drug}</td>
                <td className="t-num" style={{textAlign: 'right'}}>${c.billed.toFixed(2)}</td>
                <td className="t-num" style={{textAlign: 'right', fontWeight: 500, color: c.paid > 0 ? 'var(--ok)' : 'var(--ink-4)'}}>${c.paid.toFixed(2)}</td>
                <td>
                  <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                    <StatusPill tone={tone[c.status]} label={lbl[c.status]}/>
                    {c.code !== '—' && <span className="t-xs">{c.code}</span>}
                  </div>
                </td>
                <td className="t-xs">{c.submitted}</td>
                <td><I.ChevR style={{color: 'var(--ink-4)'}}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

Object.assign(window, { Billing, Insurance });
