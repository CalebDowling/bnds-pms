/* eslint-disable */
// ============================================================
// DISPENSING — Compounding + Batch Records
// ============================================================

function Compounding() {
  const [tab, setTab] = React.useState('queue');

  const queue = [
    {id: 'CMP-0412', formula: 'Progesterone 100mg capsules',     patient: 'Yvette Robichaux', qty: 60,  due: 'Today 4 PM',     priority: 'high',   status: 'in-progress'},
    {id: 'CMP-0413', formula: 'Ketoprofen 10% / Lidocaine cream',patient: 'Marcus Guidry',    qty: 60,  due: 'Tomorrow 12 PM', priority: 'normal', status: 'queued'},
    {id: 'CMP-0414', formula: 'Tacrolimus 0.03% ointment',       patient: 'Camille Fontenot', qty: 30,  due: 'Apr 28',         priority: 'normal', status: 'queued'},
    {id: 'CMP-0415', formula: 'Estradiol 0.1mg/g vaginal cream', patient: 'Annette LeBlanc',  qty: 30,  due: 'Apr 28',         priority: 'normal', status: 'queued'},
    {id: 'CMP-0411', formula: 'BLT topical (Benzo/Lido/Tetra)',  patient: 'Beau Thibodeaux',  qty: 30,  due: 'Today 2 PM',     priority: 'high',   status: 'qc'},
    {id: 'CMP-0410', formula: 'Sildenafil 20mg troches',         patient: 'Pierre Boudreaux', qty: 30,  due: 'Today 5 PM',     priority: 'normal', status: 'qc'},
  ];

  const formulas = [
    {name: 'BLT topical (Benzo/Lido/Tetra)', cat: 'Topical · pain', last: '2 days ago',  uses: 142},
    {name: 'Progesterone 100mg capsules',    cat: 'HRT · oral',     last: 'Today',       uses: 312},
    {name: 'Ketoprofen 10% / Lidocaine 5%',  cat: 'Topical · pain', last: '4 days ago',  uses: 98},
    {name: 'Tacrolimus 0.03% ointment',      cat: 'Derm',           last: '1 week ago',  uses: 47},
    {name: 'Estradiol 0.1mg/g vaginal cream',cat: 'HRT · topical',  last: '3 days ago',  uses: 86},
    {name: 'Magic mouthwash',                cat: 'Oral · rinse',   last: 'Today',       uses: 204},
  ];

  const tone = {high: 'danger', normal: 'mute'};
  const statusTone = {'in-progress': 'info', 'queued': 'mute', 'qc': 'warn'};
  const statusLabel = {'in-progress': 'In progress', 'queued': 'Queued', 'qc': 'QC review'};

  return (
    <AppShell active="compounding" sublabel="Dispensing" title="Compounding"
      subtitle="6 formulas in queue · 2 awaiting QC"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Beaker className="ic-sm"/> Lab status</button>
        <button className="btn btn-primary btn-sm"><I.Plus/> New compound</button>
      </>}>
      <Toolbar
        tabs={[{id: 'queue', label: 'Active queue', count: 6}, {id: 'formulas', label: 'Formulas', count: 38}, {id: 'history', label: 'History'}, {id: 'ingredients', label: 'Ingredients'}]}
        active={tab} onChange={setTab}
        filters={[{label: 'Category', value: 'All'}, {label: 'Pharmacist'}]}
      />

      <div style={{display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'start'}}>
        <div className="card" style={{overflow: 'hidden'}}>
          <div style={{padding: '12px 14px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 13.5}}>
            Active queue
          </div>
          <table className="tbl">
            <thead><tr>
              <th>ID</th><th>Formula</th><th>Patient</th>
              <th className="t-num" style={{textAlign: 'right'}}>Qty</th>
              <th>Due</th><th>Priority</th><th>Status</th>
              <th style={{width: 36}}></th>
            </tr></thead>
            <tbody>
              {queue.map(q => (
                <tr key={q.id} style={{cursor: 'pointer'}}>
                  <td className="bnds-mono" style={{fontSize: 12, color: 'var(--bnds-forest)'}}>{q.id}</td>
                  <td style={{fontWeight: 500}}>{q.formula}</td>
                  <td className="t-xs">{q.patient}</td>
                  <td className="t-num" style={{textAlign: 'right'}}>{q.qty}</td>
                  <td className="t-xs" style={{color: q.due.startsWith('Today') ? 'var(--warn)' : 'var(--ink-3)', fontWeight: q.due.startsWith('Today') ? 500 : 400}}>{q.due}</td>
                  <td>{q.priority === 'high' ? <StatusPill tone="danger" label="High"/> : <span className="pill pill-mute">Normal</span>}</td>
                  <td><StatusPill tone={statusTone[q.status]} label={statusLabel[q.status]}/></td>
                  <td><I.ChevR style={{color: 'var(--ink-4)'}}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{padding: 0, overflow: 'hidden'}}>
          <div style={{padding: '12px 16px', borderBottom: '1px solid var(--line)'}}>
            <div className="t-eyebrow">Most-used formulas</div>
            <div style={{fontWeight: 600, fontSize: 14, marginTop: 4}}>Quick start</div>
          </div>
          {formulas.map(f => (
            <div key={f.name} style={{padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer'}}>
              <div style={{width: 36, height: 36, background: 'var(--bnds-leaf-100)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bnds-forest)'}}>
                <I.Beaker/>
              </div>
              <div style={{flex: 1, minWidth: 0}}>
                <div style={{fontWeight: 500, fontSize: 13.5}}>{f.name}</div>
                <div className="t-xs">{f.cat} · last {f.last} · {f.uses} uses</div>
              </div>
              <button className="btn btn-ghost btn-sm">Use</button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function BatchRecords() {
  const batches = [
    {id: 'BR-2026-0412', formula: 'Progesterone 100mg caps',    qty: 60, lot: 'PG2026-0412', expires: '10/2026', made: 'Today 11:42',  pharmacist: 'Marie B.',  qc: 'Sara C.', status: 'released'},
    {id: 'BR-2026-0411', formula: 'BLT topical',                qty: 30, lot: 'BL2026-0411', expires: '07/2026', made: 'Today 09:18',  pharmacist: 'Marie B.',  qc: 'Sara C.', status: 'released'},
    {id: 'BR-2026-0410', formula: 'Sildenafil 20mg troches',    qty: 30, lot: 'SD2026-0410', expires: '10/2026', made: 'Today 08:04',  pharmacist: 'David L.', qc: '—',       status: 'qc'},
    {id: 'BR-2026-0409', formula: 'Estradiol 0.1mg/g cream',    qty: 30, lot: 'ES2026-0409', expires: '07/2026', made: 'Yesterday 16:22', pharmacist: 'Marie B.', qc: 'Sara C.', status: 'released'},
    {id: 'BR-2026-0408', formula: 'Magic mouthwash',            qty: 480,lot: 'MM2026-0408', expires: '05/2026', made: 'Yesterday 14:10', pharmacist: 'David L.', qc: 'Marie B.', status: 'released'},
    {id: 'BR-2026-0407', formula: 'Tacrolimus 0.03% ointment',  qty: 30, lot: 'TC2026-0407', expires: '10/2026', made: 'Apr 24',        pharmacist: 'Marie B.', qc: 'Sara C.', status: 'released'},
    {id: 'BR-2026-0406', formula: 'BLT topical',                qty: 60, lot: 'BL2026-0406', expires: '07/2026', made: 'Apr 24',        pharmacist: 'David L.', qc: '—',      status: 'recalled'},
  ];
  const tone = {released: 'ok', qc: 'warn', recalled: 'danger'};
  const lbl  = {released: 'Released', qc: 'In QC', recalled: 'Recalled'};

  return (
    <AppShell active="batch" sublabel="Dispensing" title="Batch Records"
      subtitle="USP 795/797 compliant · 7-year retention"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Download className="ic-sm"/> Export CSV</button>
        <button className="btn btn-secondary btn-sm"><I.Print className="ic-sm"/> Print log</button>
      </>}>
      <Toolbar
        tabs={[{id: 'all', label: 'All', count: 1842}, {id: 'released', label: 'Released'}, {id: 'qc', label: 'In QC', count: 2}, {id: 'recalled', label: 'Recalled', count: 1}]}
        search="" searchPlaceholder="Search by lot #, formula, pharmacist…"
        filters={[{label: 'Date', value: 'Last 30d'}, {label: 'Pharmacist'}]}
      />

      <div className="card" style={{overflow: 'hidden'}}>
        <table className="tbl">
          <thead><tr>
            <th>Batch ID</th><th>Formula</th>
            <th className="t-num" style={{textAlign: 'right'}}>Qty</th>
            <th>Lot</th><th>Expires</th><th>Made</th>
            <th>Pharmacist</th><th>QC</th><th>Status</th>
            <th style={{width: 36}}></th>
          </tr></thead>
          <tbody>
            {batches.map(b => (
              <tr key={b.id} style={{cursor: 'pointer'}}>
                <td className="bnds-mono" style={{fontSize: 12, color: 'var(--bnds-forest)', fontWeight: 500}}>{b.id}</td>
                <td style={{fontWeight: 500}}>{b.formula}</td>
                <td className="t-num" style={{textAlign: 'right'}}>{b.qty}</td>
                <td className="t-xs bnds-mono">{b.lot}</td>
                <td className="t-xs">{b.expires}</td>
                <td className="t-xs">{b.made}</td>
                <td className="t-xs">{b.pharmacist}</td>
                <td className="t-xs" style={{color: b.qc === '—' ? 'var(--ink-4)' : 'var(--ink-2)'}}>{b.qc}</td>
                <td><StatusPill tone={tone[b.status]} label={lbl[b.status]}/></td>
                <td><I.ChevR style={{color: 'var(--ink-4)'}}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

Object.assign(window, { Compounding, BatchRecords });
