/* eslint-disable */
// ============================================================
// LIST VIEWS — Patients index + Prescriptions index
// ============================================================

// ---------------- Patients list ----------------
function PatientsList() {
  const [tab, setTab] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [sel, setSel] = React.useState(null);

  const patients = [
    {id: 'P-1042', name: 'James Hebert',     dob: '03/14/1958', phone: '(337) 555-0182', plan: 'BCBS Louisiana', flags: ['allergy'],     activeRx: 7,  lastFill: '2 days ago',  status: 'active'},
    {id: 'P-2188', name: 'Marie Comeaux',    dob: '07/22/1971', phone: '(337) 555-0934', plan: 'Medicare Part D', flags: [],            activeRx: 3,  lastFill: '6 days ago',  status: 'active'},
    {id: 'P-0917', name: 'Beau Thibodeaux',  dob: '11/02/1985', phone: '(337) 555-0445', plan: 'United HC',        flags: ['DUR'],      activeRx: 4,  lastFill: 'Today',       status: 'active'},
    {id: 'P-3301', name: 'Camille Fontenot', dob: '04/19/1992', phone: '(337) 555-0710', plan: 'Cash',             flags: [],           activeRx: 1,  lastFill: '3 weeks ago', status: 'active'},
    {id: 'P-2044', name: 'Pierre Boudreaux', dob: '09/30/1944', phone: '(337) 555-0212', plan: 'Medicare Part D', flags: ['allergy', 'C-II'], activeRx: 9, lastFill: '1 day ago',  status: 'active'},
    {id: 'P-4488', name: 'Annette LeBlanc',  dob: '01/12/1966', phone: '(337) 555-0101', plan: 'BCBS Louisiana', flags: [],             activeRx: 5,  lastFill: 'Yesterday',   status: 'active'},
    {id: 'P-5512', name: 'Theo Doucet',      dob: '06/08/2003', phone: '(337) 555-0688', plan: 'BCBS Louisiana', flags: ['minor'],      activeRx: 1,  lastFill: '4 months ago', status: 'inactive'},
    {id: 'P-1129', name: 'Yvette Robichaux', dob: '12/30/1949', phone: '(337) 555-0301', plan: 'Medicare Part D', flags: ['delivery'], activeRx: 11, lastFill: 'Today',       status: 'active'},
    {id: 'P-6675', name: 'Marcus Guidry',    dob: '02/17/1979', phone: '(337) 555-0533', plan: 'Cigna',            flags: [],           activeRx: 2,  lastFill: '2 weeks ago', status: 'active'},
    {id: 'P-7720', name: 'Delphine Mouton',  dob: '08/04/1955', phone: '(337) 555-0892', plan: 'Humana',           flags: ['allergy'],   activeRx: 6,  lastFill: '5 days ago',  status: 'active'},
  ];

  const tabs = [
    {id: 'all',      label: 'All',          count: 1284},
    {id: 'recent',   label: 'Recent',       count: 24},
    {id: 'flagged',  label: 'Flagged',      count: 18},
    {id: 'birthdays', label: 'Birthdays this week', count: 6},
  ];

  return (
    <AppShell active="patients" sublabel="People" title="Patients" subtitle="1,284 active patients · across 3 locations"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Download className="ic-sm"/> Export</button>
        <button className="btn btn-primary btn-sm"><I.Plus/> Add patient</button>
      </>}>
      <Toolbar
        tabs={tabs} active={tab} onChange={setTab}
        search={search} searchPlaceholder="Search by name, phone, DOB, Rx#…"
        filters={[
          {label: 'Plan', value: 'Any'},
          {label: 'Location', value: 'Main St'},
          {label: 'Sort: Recently filled'},
        ]}
        right={<>
          <button className="btn btn-ghost btn-sm"><I.Print className="ic-sm"/></button>
        </>}
      />

      <div className="card" style={{overflow: 'hidden'}}>
        <table className="tbl">
          <thead><tr>
            <th style={{width: 36}}></th>
            <th>Patient</th>
            <th>DOB</th>
            <th>Phone</th>
            <th>Insurance</th>
            <th>Flags</th>
            <th className="t-num" style={{textAlign: 'right'}}>Active Rx</th>
            <th>Last fill</th>
            <th style={{width: 36}}></th>
          </tr></thead>
          <tbody>
            {patients.map(p => (
              <tr key={p.id} onClick={() => setSel(p.id)} className={sel === p.id ? 'selected' : ''} style={{cursor: 'pointer'}}>
                <td><Avatar name={p.name} size={30}/></td>
                <td>
                  <div style={{fontWeight: 500}}>{p.name}</div>
                  <div className="t-xs bnds-mono">{p.id}</div>
                </td>
                <td className="t-xs">{p.dob}</td>
                <td className="t-xs bnds-mono">{p.phone}</td>
                <td className="t-xs">{p.plan}</td>
                <td>
                  <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                    {p.flags.includes('allergy') && <span className="pill pill-danger" style={{padding: '2px 6px'}}>Allergy</span>}
                    {p.flags.includes('DUR')     && <span className="pill pill-warn"   style={{padding: '2px 6px'}}>DUR</span>}
                    {p.flags.includes('C-II')    && <span className="pill"             style={{padding: '2px 6px'}}>C-II</span>}
                    {p.flags.includes('delivery')&& <span className="pill pill-info"   style={{padding: '2px 6px'}}>Delivery</span>}
                    {p.flags.includes('minor')   && <span className="pill pill-mute"   style={{padding: '2px 6px'}}>Minor</span>}
                  </div>
                </td>
                <td className="t-num" style={{textAlign: 'right', fontWeight: 500}}>{p.activeRx}</td>
                <td className="t-xs" style={{color: p.lastFill === 'Today' ? 'var(--bnds-forest)' : 'var(--ink-3)'}}>{p.lastFill}</td>
                <td><I.ChevR style={{color: 'var(--ink-4)'}}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-3)'}}>
          <div>Showing 10 of 1,284</div>
          <div style={{display: 'flex', gap: 6}}>
            <button className="btn btn-ghost btn-sm">Prev</button>
            <button className="btn btn-secondary btn-sm">Next</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ---------------- Prescriptions list (different from queue — full archive) ----------------
function PrescriptionsList() {
  const [tab, setTab] = React.useState('active');
  const [search, setSearch] = React.useState('');
  const [sel, setSel] = React.useState(null);

  const rxs = [
    {id: 'RX-77412', drug: 'Atorvastatin 20mg',     qty: 30, days: 30, refills: '3 of 5', patient: 'James Hebert',     prescriber: 'Dr. Landry',   filled: '04/26/26', status: 'active'},
    {id: 'RX-77389', drug: 'Lisinopril 10mg',       qty: 90, days: 90, refills: '4 of 5', patient: 'Marie Comeaux',    prescriber: 'Dr. Landry',   filled: '04/22/26', status: 'active'},
    {id: 'RX-77356', drug: 'Metformin HCl 500mg',   qty: 60, days: 30, refills: '2 of 11',patient: 'Pierre Boudreaux', prescriber: 'Dr. Hebert',   filled: '04/19/26', status: 'active'},
    {id: 'RX-77301', drug: 'Amoxicillin 500mg',     qty: 21, days: 7,  refills: 'None',   patient: 'Camille Fontenot', prescriber: 'Dr. Landry',   filled: '04/14/26', status: 'completed'},
    {id: 'RX-77287', drug: 'Oxycodone 5mg · C-II',  qty: 30, days: 15, refills: 'None',   patient: 'Beau Thibodeaux',  prescriber: 'Dr. Mouton',   filled: '04/12/26', status: 'active'},
    {id: 'RX-77244', drug: 'Levothyroxine 50mcg',   qty: 90, days: 90, refills: '5 of 5', patient: 'Annette LeBlanc',  prescriber: 'Dr. Hebert',   filled: '04/08/26', status: 'active'},
    {id: 'RX-77198', drug: 'Ozempic 0.5mg pen',     qty: 1,  days: 28, refills: '0 of 3', patient: 'Yvette Robichaux', prescriber: 'Dr. Landry',   filled: '04/04/26', status: 'transferred'},
    {id: 'RX-77150', drug: 'Sertraline 50mg',       qty: 30, days: 30, refills: '1 of 5', patient: 'Marcus Guidry',    prescriber: 'Dr. Mouton',   filled: '03/30/26', status: 'active'},
    {id: 'RX-77103', drug: 'Albuterol HFA inhaler', qty: 1,  days: 30, refills: '2 of 5', patient: 'Theo Doucet',      prescriber: 'Dr. Hebert',   filled: '03/24/26', status: 'expired'},
  ];

  const statusTone = {active: 'ok', completed: 'mute', transferred: 'info', expired: 'warn'};
  const statusLabel = {active: 'Active', completed: 'Completed', transferred: 'Transferred', expired: 'Expired'};

  const tabs = [
    {id: 'active',      label: 'Active',       count: 1024},
    {id: 'completed',   label: 'Completed',    count: 412},
    {id: 'transferred', label: 'Transferred'},
    {id: 'expired',     label: 'Expired',      count: 88},
    {id: 'all',         label: 'All'},
  ];

  return (
    <AppShell active="queue" sublabel="Pharmacy" title="Prescriptions" subtitle="All filled prescriptions · for the active fill queue, see the Workflow Queue"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Download className="ic-sm"/> Export</button>
        <button className="btn btn-secondary btn-sm">Open Workflow Queue →</button>
        <button className="btn btn-primary btn-sm"><I.Plus/> New Rx</button>
      </>}>
      <Toolbar
        tabs={tabs} active={tab} onChange={setTab}
        search={search} searchPlaceholder="Search Rx#, drug, patient, prescriber…"
        filters={[
          {label: 'Drug class', value: 'Any'},
          {label: 'Prescriber', value: 'Any'},
          {label: 'Date', value: 'Last 30 days'},
        ]}
      />

      <div className="card" style={{overflow: 'hidden'}}>
        <table className="tbl">
          <thead><tr>
            <th>Rx #</th>
            <th>Drug</th>
            <th>Patient</th>
            <th>Prescriber</th>
            <th className="t-num" style={{textAlign: 'right'}}>Qty</th>
            <th className="t-num" style={{textAlign: 'right'}}>Days</th>
            <th>Refills</th>
            <th>Filled</th>
            <th>Status</th>
            <th style={{width: 36}}></th>
          </tr></thead>
          <tbody>
            {rxs.map(r => (
              <tr key={r.id} onClick={() => setSel(r.id)} className={sel === r.id ? 'selected' : ''} style={{cursor: 'pointer'}}>
                <td className="bnds-mono" style={{fontSize: 12, fontWeight: 500, color: 'var(--bnds-forest)'}}>{r.id}</td>
                <td style={{fontWeight: 500}}>{r.drug}</td>
                <td>{r.patient}</td>
                <td className="t-xs">{r.prescriber}</td>
                <td className="t-num" style={{textAlign: 'right'}}>{r.qty}</td>
                <td className="t-num" style={{textAlign: 'right'}}>{r.days}</td>
                <td className="t-xs">{r.refills}</td>
                <td className="t-xs">{r.filled}</td>
                <td><StatusPill tone={statusTone[r.status]} label={statusLabel[r.status]}/></td>
                <td><I.ChevR style={{color: 'var(--ink-4)'}}/></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--ink-3)'}}>
          <div>Showing 9 of 1,524</div>
          <div style={{display: 'flex', gap: 6}}>
            <button className="btn btn-ghost btn-sm">Prev</button>
            <button className="btn btn-secondary btn-sm">Next</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, { PatientsList, PrescriptionsList });
