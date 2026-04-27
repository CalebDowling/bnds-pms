/* eslint-disable */
// ============================================================
// USERS — 4 variations
// ============================================================

// Shared staff data
const STAFF = [
  {id: 'U-001', name: 'Marie Boudreaux',  role: 'Pharmacist · PIC',     email: 'm.boudreaux@bndsrx.com',  phone: '(337) 555-0001', loc: 'Main St',     status: 'active',  last: 'Now',           lic: {npi: '1487612290', dea: 'BB1234567', state: 'LA · 026814', exp: '02/15/2027', expSoon: false}, you: true},
  {id: 'U-002', name: 'David Landry',     role: 'Pharmacist',           email: 'd.landry@bndsrx.com',     phone: '(337) 555-0002', loc: 'Main St',     status: 'active',  last: '12 min ago',    lic: {npi: '1932814700', dea: 'BL2018745', state: 'LA · 028912', exp: '04/30/2026', expSoon: true}},
  {id: 'U-003', name: 'Sara Comeaux',     role: 'Pharmacy tech · CPhT', email: 's.comeaux@bndsrx.com',    phone: '(337) 555-0003', loc: 'Main St',     status: 'active',  last: '2h ago',        lic: {npi: '—',          dea: '—',           state: 'LA · CT-4421', exp: '08/12/2026', expSoon: false}},
  {id: 'U-004', name: 'Trevor Mouton',    role: 'Pharmacy tech',        email: 't.mouton@bndsrx.com',     phone: '(337) 555-0004', loc: 'Carencro',    status: 'active',  last: '5h ago',        lic: {npi: '—',          dea: '—',           state: 'LA · CT-3812', exp: '11/04/2026', expSoon: false}},
  {id: 'U-005', name: 'Aliyah Hebert',    role: 'Cashier',              email: 'a.hebert@bndsrx.com',     phone: '(337) 555-0005', loc: 'Main St',     status: 'active',  last: 'Yesterday',     lic: null},
  {id: 'U-006', name: 'Pierre Doucet',    role: 'Pharmacist',           email: 'p.doucet@bndsrx.com',     phone: '(337) 555-0006', loc: 'Carencro',    status: 'active',  last: 'Yesterday',     lic: {npi: '1620874413', dea: 'BD1990422', state: 'LA · 022108', exp: '06/30/2027', expSoon: false}},
  {id: 'U-007', name: 'Camille Guidry',   role: 'Pharmacy tech',        email: 'c.guidry@bndsrx.com',     phone: '(337) 555-0007', loc: 'Breaux Br.',  status: 'inactive',last: '12 days ago',   lic: {npi: '—',          dea: '—',           state: 'LA · CT-5044', exp: '01/22/2026', expSoon: true}},
  {id: 'U-008', name: 'Jean Robichaux',   role: 'Manager',              email: 'j.robichaux@bndsrx.com',  phone: '(337) 555-0008', loc: 'All',         status: 'active',  last: '34 min ago',    lic: null},
  {id: 'U-009', name: 'Yvette Fontenot',  role: 'Pharmacy tech',        email: 'y.fontenot@bndsrx.com',   phone: '(337) 555-0009', loc: 'Main St',     status: 'active',  last: '1h ago',        lic: {npi: '—',          dea: '—',           state: 'LA · CT-4892', exp: '09/18/2026', expSoon: false}},
  {id: 'U-010', name: 'Marcus Thibodeaux',role: 'Cashier',              email: 'm.thibodeaux@bndsrx.com', phone: '(337) 555-0010', loc: 'Carencro',    status: 'active',  last: '3h ago',        lic: null},
];

const INVITES = [
  {email: 'k.fontenot@bndsrx.com',  role: 'Pharmacy tech', sent: '2 days ago',  sender: 'Jean R.'},
  {email: 't.benoit@bndsrx.com',    role: 'Cashier',       sent: '4 days ago',  sender: 'Marie B.'},
  {email: 'rebecca@bndsrx.com',     role: 'Pharmacist',    sent: '6 days ago',  sender: 'Marie B.', expiring: true},
];

const SESSIONS = [
  {who: 'Marie Boudreaux', station: 'Workstation 01 · Pharmacist desk', loc: 'Main St',    ip: '10.0.4.12',  since: '7:14 AM today', current: true},
  {who: 'Sara Comeaux',    station: 'Workstation 03 · Tech bench',       loc: 'Main St',    ip: '10.0.4.18',  since: '7:32 AM today'},
  {who: 'Aliyah Hebert',   station: 'Workstation 04 · Front counter',   loc: 'Main St',    ip: '10.0.4.22',  since: '8:00 AM today'},
  {who: 'David Landry',    station: 'iPad · Consult room',               loc: 'Main St',    ip: '10.0.4.41',  since: '11:18 AM'},
  {who: 'Pierre Doucet',   station: 'Workstation 02 · Pharmacist desk', loc: 'Carencro',   ip: '10.0.6.12',  since: '7:08 AM today'},
  {who: 'Trevor Mouton',   station: 'Workstation 05 · Tech bench',       loc: 'Carencro',   ip: '10.0.6.18',  since: '7:24 AM today'},
];

const AUDIT = [
  {who: 'Marie Boudreaux', action: 'Verified RX-77412',            target: 'James Hebert',     when: '2 min ago',  type: 'rx'},
  {who: 'Sara Comeaux',    action: 'Filled RX-77389',              target: 'Marie Comeaux',    when: '8 min ago',  type: 'rx'},
  {who: 'Marie Boudreaux', action: 'Released compound CMP-0411',   target: 'Beau Thibodeaux',  when: '14 min ago', type: 'compound'},
  {who: 'Jean Robichaux',  action: 'Updated par level',            target: 'Atorvastatin 20mg',when: '22 min ago', type: 'inventory'},
  {who: 'Aliyah Hebert',   action: 'Processed sale $14.20',         target: 'INV-8841',         when: '34 min ago', type: 'pos'},
  {who: 'Marie Boudreaux', action: 'Granted permission · Reorder', target: 'Trevor Mouton',    when: '1h ago',     type: 'admin'},
  {who: 'David Landry',    action: 'Transferred RX-77198',         target: 'Walgreens · Lafayette', when: '2h ago', type: 'rx'},
  {who: 'Sara Comeaux',    action: 'Restocked bin A-08',           target: 'Marcus Guidry',    when: '3h ago',     type: 'pickup'},
];

const ROLES = [
  {role: 'Pharmacist · PIC',  count: 1, perms: {dispense: 'all', verify: 'all', compound: 'all', inventory: 'all', users: 'all',  reports: 'all',  pos: 'all'}},
  {role: 'Pharmacist',        count: 3, perms: {dispense: 'all', verify: 'all', compound: 'all', inventory: 'edit',users: 'view', reports: 'all',  pos: 'all'}},
  {role: 'Pharmacy tech',     count: 4, perms: {dispense: 'fill',verify: 'no',  compound: 'asst',inventory: 'edit',users: 'no',   reports: 'view', pos: 'all'}},
  {role: 'Cashier',           count: 2, perms: {dispense: 'no',  verify: 'no',  compound: 'no',  inventory: 'view',users: 'no',   reports: 'no',   pos: 'all'}},
  {role: 'Manager',           count: 1, perms: {dispense: 'no',  verify: 'no',  compound: 'no',  inventory: 'all', users: 'all',  reports: 'all',  pos: 'all'}},
];

const PERM_COLS = [
  {id: 'dispense',  label: 'Dispense'},
  {id: 'verify',    label: 'Verify'},
  {id: 'compound',  label: 'Compound'},
  {id: 'inventory', label: 'Inventory'},
  {id: 'pos',       label: 'POS'},
  {id: 'reports',   label: 'Reports'},
  {id: 'users',     label: 'Users'},
];

// Render permission cell
function PermCell({val}) {
  const map = {
    all:  {l: '●●●', c: 'var(--bnds-forest)',     bg: 'var(--bnds-leaf-100)'},
    edit: {l: '●●○', c: 'var(--bnds-forest)',     bg: '#eef5e8'},
    fill: {l: '●○○', c: 'var(--bnds-forest)',     bg: '#f3f7ee'},
    view: {l: 'view',c: 'var(--ink-3)',           bg: 'var(--paper-2)'},
    asst: {l: 'asst',c: 'var(--ink-3)',           bg: 'var(--paper-2)'},
    no:   {l: '—',   c: 'var(--ink-4)',           bg: 'transparent'},
  };
  const m = map[val] || map.no;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 36, padding: '2px 8px', borderRadius: 999,
      background: m.bg, color: m.c, fontSize: 11, fontWeight: 600,
      letterSpacing: 0.04, fontFamily: 'var(--font-mono)',
    }}>{m.l}</span>
  );
}

// Status pill for staff
function StaffStatus({s}) {
  if (s === 'active')   return <StatusPill tone="ok"   label="Active"/>;
  if (s === 'inactive') return <StatusPill tone="mute" label="Inactive" dot={false}/>;
  return <StatusPill tone="warn" label={s}/>;
}

// ============================================================
// USERS A — Table + side panels (Pending invites · Sessions · Audit)
// ============================================================
function UsersA() {
  const [tab, setTab] = React.useState('staff');
  const [sel, setSel] = React.useState(null);

  const tabs = [
    {id: 'staff',     label: 'Staff',           count: STAFF.length},
    {id: 'invites',   label: 'Pending invites', count: INVITES.length},
    {id: 'sessions',  label: 'Active sessions', count: SESSIONS.length},
    {id: 'roles',     label: 'Roles & permissions'},
    {id: 'audit',     label: 'Audit log'},
  ];

  return (
    <AppShell active="users" sublabel="Administration" title="Users"
      subtitle="11 staff across 3 locations · 6 sessions active right now"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Download className="ic-sm"/> Export</button>
        <button className="btn btn-secondary btn-sm">License calendar</button>
        <button className="btn btn-primary btn-sm"><I.Plus/> Invite user</button>
      </>}>
      <Toolbar
        tabs={tabs} active={tab} onChange={setTab}
        search="" searchPlaceholder="Search by name, email, role, location…"
        filters={tab === 'staff' ? [{label: 'Role', value: 'All'}, {label: 'Location', value: 'All'}, {label: 'Status'}] : undefined}
      />

      {tab === 'staff' && (
        <div className="card" style={{overflow: 'hidden'}}>
          <table className="tbl">
            <thead><tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Location</th>
              <th>License (state · DEA)</th>
              <th>Status</th>
              <th>Last active</th>
              <th style={{width: 36}}></th>
            </tr></thead>
            <tbody>
              {STAFF.map(u => (
                <tr key={u.id} onClick={() => setSel(u.id)} className={sel === u.id ? 'selected' : ''} style={{cursor: 'pointer'}}>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <span style={{fontWeight: 500}}>{u.name}</span>
                      {u.you && <span className="pill pill-leaf" style={{padding: '1px 6px', fontSize: 10}}>You</span>}
                    </div>
                    <div className="t-xs bnds-mono">{u.id}</div>
                  </td>
                  <td className="t-xs">{u.role}</td>
                  <td className="t-xs bnds-mono" style={{fontSize: 11.5}}>{u.email}</td>
                  <td className="t-xs">{u.loc}</td>
                  <td className="t-xs">
                    {u.lic ? (
                      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <span className="bnds-mono" style={{fontSize: 11.5}}>{u.lic.state}</span>
                        {u.lic.dea !== '—' && <span className="bnds-mono" style={{fontSize: 11.5, color: 'var(--ink-3)'}}>· {u.lic.dea}</span>}
                        {u.lic.expSoon && <StatusPill tone="warn" label="Exp soon" dot={false}/>}
                      </div>
                    ) : <span style={{color: 'var(--ink-4)'}}>—</span>}
                  </td>
                  <td><StaffStatus s={u.status}/></td>
                  <td className="t-xs" style={{color: u.last === 'Now' ? 'var(--ok)' : 'var(--ink-3)', fontWeight: u.last === 'Now' ? 500 : 400}}>{u.last}</td>
                  <td><I.ChevR style={{color: 'var(--ink-4)'}}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'invites' && (
        <div className="card" style={{overflow: 'hidden'}}>
          <table className="tbl">
            <thead><tr><th>Email</th><th>Role</th><th>Sent by</th><th>Sent</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {INVITES.map((i, idx) => (
                <tr key={idx}>
                  <td className="bnds-mono" style={{fontSize: 12, fontWeight: 500}}>{i.email}</td>
                  <td>{i.role}</td>
                  <td className="t-xs">{i.sender}</td>
                  <td className="t-xs">{i.sent}</td>
                  <td>{i.expiring ? <StatusPill tone="warn" label="Expires in 24h"/> : <StatusPill tone="info" label="Pending"/>}</td>
                  <td><div style={{display: 'flex', gap: 6, justifyContent: 'flex-end'}}><button className="btn btn-ghost btn-sm">Resend</button><button className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}}>Revoke</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="card" style={{overflow: 'hidden'}}>
          <table className="tbl">
            <thead><tr><th>User</th><th>Workstation</th><th>Location</th><th>IP</th><th>Signed in</th><th></th></tr></thead>
            <tbody>
              {SESSIONS.map((s, i) => (
                <tr key={i}>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                      <span style={{fontWeight: 500}}>{s.who}</span>
                      {s.current && <span className="pill pill-leaf" style={{padding: '1px 6px', fontSize: 10}}>This session</span>}
                    </div>
                  </td>
                  <td className="t-xs">{s.station}</td>
                  <td className="t-xs">{s.loc}</td>
                  <td className="t-xs bnds-mono">{s.ip}</td>
                  <td className="t-xs">{s.since}</td>
                  <td><div style={{display: 'flex', gap: 6, justifyContent: 'flex-end'}}>{!s.current && <button className="btn btn-ghost btn-sm" style={{color: 'var(--danger)'}}>Force sign out</button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && (
        <div className="card" style={{overflow: 'hidden'}}>
          <table className="tbl">
            <thead><tr>
              <th>Role</th><th className="t-num" style={{textAlign: 'right'}}>Members</th>
              {PERM_COLS.map(c => <th key={c.id} style={{textAlign: 'center'}}>{c.label}</th>)}
              <th></th>
            </tr></thead>
            <tbody>
              {ROLES.map(r => (
                <tr key={r.role}>
                  <td style={{fontWeight: 500}}>{r.role}</td>
                  <td className="t-num" style={{textAlign: 'right'}}>{r.count}</td>
                  {PERM_COLS.map(c => <td key={c.id} style={{textAlign: 'center'}}><PermCell val={r.perms[c.id]}/></td>)}
                  <td><button className="btn btn-ghost btn-sm">Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{padding: '10px 14px', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: 'var(--ink-3)'}}>
            <span><span className="bnds-mono" style={{fontWeight: 600, color: 'var(--bnds-forest)'}}>●●●</span> Full</span>
            <span><span className="bnds-mono" style={{fontWeight: 600, color: 'var(--bnds-forest)'}}>●●○</span> Edit</span>
            <span><span className="bnds-mono" style={{fontWeight: 600, color: 'var(--bnds-forest)'}}>●○○</span> Limited</span>
            <span>view · read-only</span>
            <span style={{color: 'var(--ink-4)'}}>— no access</span>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card" style={{overflow: 'hidden'}}>
          <table className="tbl">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th><th>Type</th><th></th></tr></thead>
            <tbody>
              {AUDIT.map((a, i) => (
                <tr key={i}>
                  <td className="t-xs" style={{whiteSpace: 'nowrap'}}>{a.when}</td>
                  <td style={{fontWeight: 500}}>{a.who}</td>
                  <td>{a.action}</td>
                  <td className="t-xs">{a.target}</td>
                  <td><span className="pill pill-mute" style={{padding: '1px 7px'}}>{a.type}</span></td>
                  <td><I.ChevR style={{color: 'var(--ink-4)'}}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

Object.assign(window, { UsersA });
