/* eslint-disable */
// ============================================================
// RX QUEUE — interactive workhorse screen
// ============================================================

const RX_DATA = [
  {id: "RX-7741", patient: "Hebert, James L.",   dob: "03/14/1958", drug: "Lisinopril 10mg",     qty: 30, refills: "5 of 6", prescriber: "Dr. Comeaux", status: "verify",   priority: "high",   promised: "10:30 AM", ins: "BCBS LA", flags: ["DDI"]},
  {id: "RX-7742", patient: "Trahan, Marie",      dob: "11/02/1971", drug: "Metformin 500mg",      qty: 60, refills: "3 of 5", prescriber: "Dr. Patel",   status: "filling",  priority: "normal", promised: "11:00 AM", ins: "Humana",  flags: []},
  {id: "RX-7743", patient: "Boudreaux, René",    dob: "06/22/1965", drug: "Atorvastatin 20mg",    qty: 30, refills: "2 of 6", prescriber: "Dr. Comeaux", status: "insurance", priority: "normal", promised: "11:15 AM", ins: "Medicare D", flags: ["PA"]},
  {id: "RX-7744", patient: "Landry, Aubrey",     dob: "08/30/1989", drug: "Amoxicillin 500mg",    qty: 21, refills: "0 of 0", prescriber: "Dr. Singh",   status: "verify",   priority: "high",   promised: "11:30 AM", ins: "Aetna",   flags: ["ALG"]},
  {id: "RX-7745", patient: "Doucet, Henri",      dob: "01/09/1944", drug: "Levothyroxine 50mcg",  qty: 90, refills: "Auto-RF","prescriber":"Dr. Martin",  status: "ready",    priority: "normal", promised: "Pickup",   ins: "Medicare", flags: []},
  {id: "RX-7746", patient: "Fontenot, Cécile",   dob: "05/17/1982", drug: "Sertraline 50mg",      qty: 30, refills: "4 of 5", prescriber: "Dr. Nguyen",  status: "filling",  priority: "normal", promised: "12:00 PM", ins: "BCBS LA", flags: []},
  {id: "RX-7747", patient: "Guidry, Pascal",     dob: "09/12/1978", drug: "Albuterol HFA",        qty: 1,  refills: "1 of 3", prescriber: "Dr. Singh",   status: "filling",  priority: "normal", promised: "12:30 PM", ins: "Aetna",   flags: []},
  {id: "RX-7748", patient: "Arceneaux, Yvette",  dob: "12/30/1995", drug: "Sumatriptan 50mg",     qty: 9,  refills: "0 of 2", prescriber: "Dr. Patel",   status: "ready",    priority: "normal", promised: "Pickup",   ins: "United",  flags: []},
  {id: "RX-7749", patient: "Babineaux, Theo",    dob: "07/04/1953", drug: "Warfarin 5mg",         qty: 30, refills: "Auto-RF",prescriber: "Dr. Comeaux", status: "verify",   priority: "high",   promised: "1:00 PM",  ins: "Medicare", flags: ["INR"]},
  {id: "RX-7750", patient: "Mouton, Lucille",    dob: "10/19/1969", drug: "Gabapentin 300mg",     qty: 90, refills: "1 of 5", prescriber: "Dr. Martin",  status: "insurance", priority: "normal", promised: "1:15 PM",  ins: "BCBS LA", flags: []},
];

const STATUS_META = {
  verify:    {label: "Verify",     dot: "danger", pill: "danger"},
  filling:   {label: "Filling",    dot: "info",   pill: "info"},
  insurance: {label: "Insurance",  dot: "warn",   pill: "warn"},
  ready:     {label: "Ready",      dot: "ok",     pill: "leaf"},
};

function RxQueue() {
  const [filter, setFilter]   = React.useState("all");
  const [selected, setSelected] = React.useState("RX-7741");
  const [sel, setSel] = React.useState(null);

  const filtered = RX_DATA.filter(r => filter === "all" ? true : r.status === filter);
  const counts = {
    all: RX_DATA.length,
    verify: RX_DATA.filter(r => r.status === "verify").length,
    filling: RX_DATA.filter(r => r.status === "filling").length,
    insurance: RX_DATA.filter(r => r.status === "insurance").length,
    ready: RX_DATA.filter(r => r.status === "ready").length,
  };

  const active = RX_DATA.find(r => r.id === selected) || RX_DATA[0];

  return (
    <AppShell active="queue" dense>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 420px', height: '100%'}}>
        <div style={{display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid var(--line)'}}>
          {/* Header */}
          <div style={{padding: '20px 24px 0'}}>
            <div className="t-eyebrow">Workflow</div>
            <h1 className="bnds-serif" style={{fontSize: 26, fontWeight: 500, marginTop: 4}}>Rx Queue</h1>
          </div>

          {/* Tabs */}
          <div style={{display: 'flex', gap: 4, padding: '14px 24px 0', borderBottom: '1px solid var(--line)'}}>
            {[
              {id: "all",       label: "All",       n: counts.all},
              {id: "verify",    label: "Verify",    n: counts.verify,     dot: "danger"},
              {id: "filling",   label: "Filling",   n: counts.filling,    dot: "info"},
              {id: "insurance", label: "Insurance", n: counts.insurance,  dot: "warn"},
              {id: "ready",     label: "Ready",     n: counts.ready,      dot: "ok"},
            ].map(t => (
              <button key={t.id} onClick={()=>setFilter(t.id)}
                style={{
                  background: 'none', border: 0, padding: '10px 14px', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  color: filter === t.id ? 'var(--ink)' : 'var(--ink-3)',
                  borderBottom: filter === t.id ? '2px solid var(--bnds-forest)' : '2px solid transparent',
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  marginBottom: -1,
                }}>
                {t.dot && <span className={`dot dot-${t.dot}`}/>}
                {t.label}
                <span style={{fontSize: 11, padding: '1px 6px', borderRadius: 999, background: 'var(--paper-2)', color: 'var(--ink-3)'}}>{t.n}</span>
              </button>
            ))}
          </div>

          {/* Filter row */}
          <div style={{display: 'flex', gap: 8, padding: '12px 24px', borderBottom: '1px solid var(--line)', alignItems: 'center', background: 'var(--surface)'}}>
            <button className="btn btn-secondary btn-sm"><I.Filter className="ic-sm"/> All locations</button>
            <button className="btn btn-secondary btn-sm">Promised today <I.ChevD className="ic-sm"/></button>
            <button className="btn btn-secondary btn-sm">All prescribers <I.ChevD className="ic-sm"/></button>
            <div style={{flex: 1}}/>
            <span className="t-xs">Auto-refresh <span className="dot dot-ok"/> live</span>
          </div>

          {/* Table */}
          <div style={{flex: 1, overflow: 'auto', background: 'var(--surface)'}}>
            <table className="tbl">
              <thead><tr>
                <th style={{width: 28, paddingLeft: 24}}><input type="checkbox"/></th>
                <th>Rx #</th>
                <th>Patient</th>
                <th>Drug</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Promised</th>
                <th>Insurance</th>
                <th></th>
              </tr></thead>
              <tbody>
                {filtered.map(r => {
                  const meta = STATUS_META[r.status];
                  return (
                    <tr key={r.id} className={selected === r.id ? 'selected' : ''} onClick={()=>setSelected(r.id)} style={{cursor: 'pointer'}}>
                      <td style={{paddingLeft: 24}}><input type="checkbox" onClick={e=>e.stopPropagation()}/></td>
                      <td className="bnds-mono" style={{fontSize: 12, color: 'var(--ink-3)'}}>{r.id}</td>
                      <td>
                        <div style={{fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7}}>
                          {r.priority === "high" && <span style={{width: 4, height: 16, background: 'var(--danger)', borderRadius: 2}}/>}
                          {r.patient}
                        </div>
                        <div className="t-xs">DOB {r.dob}</div>
                      </td>
                      <td>
                        <div>{r.drug}</div>
                        <div className="t-xs">{r.prescriber} · {r.refills}</div>
                      </td>
                      <td className="t-num">{r.qty}</td>
                      <td>
                        <span className={`pill pill-${meta.pill}`}><span className={`dot dot-${meta.dot}`}/>{meta.label}</span>
                        {r.flags.length > 0 && <span style={{marginLeft: 6, color: 'var(--danger)', fontSize: 10.5, fontWeight: 600}}>{r.flags.join(' · ')}</span>}
                      </td>
                      <td className="t-num">{r.promised}</td>
                      <td className="t-xs">{r.ins}</td>
                      <td><I.ChevR style={{color: 'var(--ink-4)'}}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail rail */}
        <RxDetail rx={active}/>
      </div>
    </AppShell>
  );
}

function RxDetail({rx}) {
  const meta = STATUS_META[rx.status];
  const [advance, setAdvance] = React.useState(false);
  return (
    <div style={{background: 'var(--paper)', display: 'flex', flexDirection: 'column', overflow: 'auto'}}>
      <div style={{padding: '20px 22px', borderBottom: '1px solid var(--line)', background: 'var(--surface)'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <div>
            <div className="bnds-mono" style={{fontSize: 12, color: 'var(--ink-3)'}}>{rx.id}</div>
            <h2 className="bnds-serif" style={{fontSize: 22, fontWeight: 500, marginTop: 2}}>{rx.patient}</h2>
            <div className="t-xs" style={{marginTop: 2}}>DOB {rx.dob} · {rx.ins}</div>
          </div>
          <span className={`pill pill-${meta.pill}`}><span className={`dot dot-${meta.dot}`}/>{meta.label}</span>
        </div>
      </div>

      {/* Drug card */}
      <div style={{padding: 22, display: 'flex', flexDirection: 'column', gap: 14}}>
        <div className="card card-pad" style={{padding: 16}}>
          <div className="t-eyebrow">Prescribed</div>
          <div className="bnds-serif" style={{fontSize: 22, marginTop: 4, fontWeight: 500}}>{rx.drug}</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14}}>
            <div><div className="t-xs">Quantity</div><div className="t-num" style={{fontSize: 14, fontWeight: 500}}>{rx.qty}</div></div>
            <div><div className="t-xs">Refills</div><div style={{fontSize: 14, fontWeight: 500}}>{rx.refills}</div></div>
            <div><div className="t-xs">Prescriber</div><div style={{fontSize: 14, fontWeight: 500}}>{rx.prescriber}</div></div>
            <div><div className="t-xs">Promised</div><div style={{fontSize: 14, fontWeight: 500}}>{rx.promised}</div></div>
          </div>
          <div className="t-xs" style={{marginTop: 14, padding: 10, background: 'var(--paper-2)', borderRadius: 6, fontFamily: 'var(--font-mono)'}}>
            SIG: Take one tablet by mouth daily. Do not crush or chew.
          </div>
        </div>

        {/* Flags */}
        {rx.flags.length > 0 && (
          <div className="card card-pad" style={{padding: 16, borderLeft: '3px solid var(--danger)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <I.Alert style={{color: 'var(--danger)'}}/>
              <div className="t-h3">Pharmacist review</div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10}}>
              {rx.flags.includes("DDI") && (
                <div style={{padding: 10, background: '#fbe6e0', borderRadius: 6, fontSize: 13}}>
                  <strong>Drug interaction:</strong> Lisinopril ↔ Spironolactone — increased risk of hyperkalemia.
                </div>
              )}
              {rx.flags.includes("ALG") && (
                <div style={{padding: 10, background: '#fbe6e0', borderRadius: 6, fontSize: 13}}>
                  <strong>Allergy:</strong> Patient profile lists Penicillin reaction (rash, 2019).
                </div>
              )}
              {rx.flags.includes("PA") && (
                <div style={{padding: 10, background: '#fdf3dc', borderRadius: 6, fontSize: 13}}>
                  <strong>Prior auth required</strong> — submitted 04/24, awaiting response.
                </div>
              )}
              {rx.flags.includes("INR") && (
                <div style={{padding: 10, background: '#fdf3dc', borderRadius: 6, fontSize: 13}}>
                  <strong>Recent INR:</strong> 3.4 (04/22). Confirm dosing with prescriber.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workflow */}
        <div className="card card-pad" style={{padding: 16}}>
          <div className="t-eyebrow">Workflow</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10}}>
            {[
              {label: "Intake", done: true,  who: "DH 9:42 AM"},
              {label: "Insurance approved", done: rx.status !== "insurance", who: "Auto 9:48 AM"},
              {label: "Filling", done: rx.status === "ready", who: rx.status === "ready" ? "DH 10:12 AM" : "—"},
              {label: "Pharmacist verify", done: rx.status === "ready", who: rx.status === "ready" ? "MB 10:18 AM" : "Awaiting"},
              {label: "Ready for pickup", done: rx.status === "ready", who: rx.status === "ready" ? "Bin A-14" : "—"},
            ].map((s, i) => (
              <div key={i} style={{display: 'flex', alignItems: 'center', gap: 10}}>
                <div style={{width: 18, height: 18, borderRadius: 999, background: s.done ? 'var(--bnds-leaf)' : 'var(--paper-2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: s.done ? 0 : '1px solid var(--line-2)'}}>
                  {s.done && <I.Check className="ic-sm"/>}
                </div>
                <div style={{flex: 1, fontSize: 13}}>{s.label}</div>
                <div className="t-xs">{s.who}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{display: 'flex', gap: 8}}>
          <button className="btn btn-primary" style={{flex: 1, justifyContent: 'center'}} onClick={()=>setAdvance(true)}>
            <I.Check/> Verify & advance
          </button>
          <button className="btn btn-secondary"><I.Phone/></button>
          <button className="btn btn-secondary"><I.Dots/></button>
        </div>
        {advance && (
          <div className="pill pill-leaf" style={{alignSelf: 'flex-start'}}>
            <I.Check className="ic-sm"/> Advanced — moved to Filling
          </div>
        )}
      </div>
    </div>
  );
}

window.RxQueue = RxQueue;
