/* eslint-disable */
// ============================================================
// SETTINGS — 4 variations
// ============================================================

// Shared settings catalog
const SETTINGS_CATEGORIES = [
  {id: 'pharmacy',  label: 'Pharmacy profile',  icon: 'Building',  desc: 'Name, address, NPI, DEA, NCPDP'},
  {id: 'hours',     label: 'Hours of operation',icon: 'Clock',     desc: 'Open hours, holidays, on-call'},
  {id: 'devices',   label: 'Workstations & devices', icon: 'Cpu',  desc: 'Printers, scanners, scales, tablets'},
  {id: 'integ',     label: 'Integrations',      icon: 'Plug',      desc: 'E-prescribe, payers, SMS, fax, accounting'},
  {id: 'notif',     label: 'Notifications & alerts', icon: 'Bell', desc: 'Refill reminders, low-stock, license exp'},
  {id: 'workflow',  label: 'Workflow rules',    icon: 'Workflow',  desc: 'Auto-refill, counseling, par levels'},
  {id: 'branding',  label: 'Branding',          icon: 'Palette',   desc: 'Logo, receipts, patient comms'},
  {id: 'tax',       label: 'Tax & pricing',     icon: 'Calculator',desc: 'Tax rates, markup, copay rules'},
  {id: 'security',  label: 'Security & 2FA',    icon: 'Shield',    desc: 'Sign-in, 2FA, session policy, IP rules'},
  {id: 'backup',    label: 'Backup & data export', icon: 'Database', desc: 'Backups, exports, retention'},
];

// Mini icons for settings (renders inline svgs because our I.* set is rx-themed)
const SI = {
  Building: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h2M9 11h2M9 15h2M13 7h2M13 11h2M13 15h2M9 19v2M15 19v2"/></svg>,
  Clock:    (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  Cpu:      (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9" y="9" width="6" height="6"/><path d="M3 9h3M3 15h3M18 9h3M18 15h3M9 3v3M15 3v3M9 18v3M15 18v3"/></svg>,
  Plug:     (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><path d="M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-10 0V8zM12 17v5"/></svg>,
  Bell:     (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16zM10 21a2 2 0 0 0 4 0"/></svg>,
  Workflow: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="9" y="15" width="6" height="6" rx="1"/><path d="M6 9v3h12V9M12 12v3"/></svg>,
  Palette:  (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><path d="M12 3a9 9 0 1 0 4 17 2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h2a4 4 0 0 0 4-4 9 9 0 0 0-9-5z"/><circle cx="7" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/></svg>,
  Calculator:(p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><rect x="5" y="3" width="14" height="18" rx="1"/><rect x="8" y="6" width="8" height="3"/><circle cx="9" cy="13" r=".5"/><circle cx="12" cy="13" r=".5"/><circle cx="15" cy="13" r=".5"/><circle cx="9" cy="17" r=".5"/><circle cx="12" cy="17" r=".5"/><circle cx="15" cy="17" r=".5"/></svg>,
  Shield:   (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>,
  Database: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}><ellipse cx="12" cy="5" rx="8" ry="2.5"/><path d="M4 5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5M4 11v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6"/></svg>,
};

// Setting row primitives
function SRow({label, hint, control, danger}) {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--line)'}}>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: 13.5, fontWeight: 500, color: danger ? 'var(--danger)' : 'var(--ink)'}}>{label}</div>
        {hint && <div className="t-xs" style={{marginTop: 2}}>{hint}</div>}
      </div>
      <div>{control}</div>
    </div>
  );
}

function Toggle({on}) {
  return (
    <div style={{
      width: 36, height: 20, borderRadius: 999, background: on ? 'var(--bnds-forest)' : 'var(--ink-4)', position: 'relative', cursor: 'pointer'
    }}>
      <div style={{position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'}}/>
    </div>
  );
}

function TextField({value, mono}) {
  return (
    <div style={{padding: '6px 10px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface)', minWidth: 220, fontSize: 13, fontFamily: mono ? 'var(--font-mono)' : 'inherit'}}>{value}</div>
  );
}

// ----- Section content blocks (shared across variations) -----

function SectionPharmacy() {
  return (
    <div>
      <SectionHeader title="Pharmacy profile" desc="Visible on prescriptions, receipts, and patient comms."/>
      <div className="card card-pad" style={{padding: '4px 18px'}}>
        <SRow label="Pharmacy name" control={<TextField value="Boudreaux & Doucet's Apothecary"/>}/>
        <SRow label="DBA" control={<TextField value="BNDS Rx"/>}/>
        <SRow label="Address" hint="Used on labels and shipping" control={<TextField value="208 W Main St, Lafayette LA 70501"/>}/>
        <SRow label="NPI" control={<TextField value="1487612290" mono/>}/>
        <SRow label="DEA" control={<TextField value="BB1234567" mono/>}/>
        <SRow label="NCPDP / NABP" control={<TextField value="1992847" mono/>}/>
        <SRow label="State license" hint="Louisiana Board of Pharmacy" control={<TextField value="PHY.04471 · Exp 06/30/2027" mono/>}/>
        <SRow label="Time zone" control={<TextField value="America/Chicago (CT)"/>}/>
      </div>
    </div>
  );
}

function SectionHours() {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const hours = ['8:00 AM – 7:00 PM','8:00 AM – 7:00 PM','8:00 AM – 7:00 PM','8:00 AM – 7:00 PM','8:00 AM – 7:00 PM','9:00 AM – 4:00 PM','Closed'];
  return (
    <div>
      <SectionHeader title="Hours of operation" desc="Patient-facing hours used in messages and on the website."/>
      <div className="card card-pad" style={{padding: '4px 18px'}}>
        {days.map((d, i) => (
          <SRow key={d} label={d} control={<TextField value={hours[i]}/>}/>
        ))}
      </div>
      <div style={{marginTop: 14}}>
        <SectionHeader title="Holidays" tight desc="Closed dates for 2026"/>
        <div className="card card-pad" style={{padding: '4px 18px'}}>
          <SRow label="New Year's Day" hint="Jan 1, 2026" control={<StatusPill tone="mute" label="Closed"/>}/>
          <SRow label="Mardi Gras (Fat Tuesday)" hint="Feb 17, 2026 · Local observance" control={<StatusPill tone="mute" label="Closed"/>}/>
          <SRow label="Independence Day" hint="Jul 4, 2026" control={<StatusPill tone="mute" label="Closed"/>}/>
          <SRow label="Thanksgiving" hint="Nov 26, 2026" control={<StatusPill tone="mute" label="Closed"/>}/>
          <SRow label="Christmas" hint="Dec 25, 2026" control={<StatusPill tone="mute" label="Closed"/>}/>
        </div>
      </div>
    </div>
  );
}

function SectionDevices() {
  const dev = [
    {n: 'Zebra ZD420 · Label printer',     loc: 'Workstation 01', s: 'Online',  tone: 'ok'},
    {n: 'Zebra ZD420 · Label printer',     loc: 'Workstation 02', s: 'Online',  tone: 'ok'},
    {n: 'Brother HL-L2390DW · Document',   loc: 'Front counter',   s: 'Online',  tone: 'ok'},
    {n: 'Honeywell Voyager 1450g · Scanner',loc: 'Tech bench',     s: 'Online',  tone: 'ok'},
    {n: 'Symbol DS2208 · Scanner',          loc: 'POS',             s: 'Offline 2h', tone: 'warn'},
    {n: 'Mettler Toledo XS204 · Scale',     loc: 'Compound lab',    s: 'Online',  tone: 'ok'},
    {n: 'iPad Pro 11" · Consult',           loc: 'Consult room',    s: 'Online',  tone: 'ok'},
  ];
  return (
    <div>
      <SectionHeader title="Workstations & devices" desc="Hardware paired with this pharmacy. Click a device to test or reassign."/>
      <div className="card" style={{overflow: 'hidden'}}>
        <table className="tbl">
          <thead><tr><th>Device</th><th>Assigned to</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {dev.map((d, i) => (
              <tr key={i}>
                <td style={{fontWeight: 500}}>{d.n}</td>
                <td className="t-xs">{d.loc}</td>
                <td><StatusPill tone={d.tone} label={d.s}/></td>
                <td><div style={{display: 'flex', gap: 6, justifyContent: 'flex-end'}}><button className="btn btn-ghost btn-sm">Test print</button><button className="btn btn-ghost btn-sm">Reassign</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn-secondary btn-sm" style={{marginTop: 12}}><I.Plus className="ic-sm"/> Pair new device</button>
    </div>
  );
}

function SectionIntegrations() {
  const ints = [
    {n: 'Surescripts',          d: 'E-prescribe, eligibility, formulary',    on: true,  status: 'Connected · 1,284 Rx routed (30d)', tone: 'ok'},
    {n: 'Change Healthcare',    d: 'Claims clearinghouse',                    on: true,  status: 'Connected', tone: 'ok'},
    {n: 'Twilio',               d: 'SMS for refill reminders & pickup',       on: true,  status: 'Connected · 2,140 sent (30d)', tone: 'ok'},
    {n: 'eFax Corporate',        d: 'Inbound/outbound fax',                    on: true,  status: 'Connected', tone: 'ok'},
    {n: 'McKesson Connect',     d: 'Wholesaler ordering',                     on: true,  status: 'Connected · last sync 4 min ago', tone: 'ok'},
    {n: 'Cardinal Health',      d: 'Wholesaler ordering',                     on: true,  status: 'Connected', tone: 'ok'},
    {n: 'Stripe',               d: 'Card processing',                         on: true,  status: 'Connected · $48.2k MTD', tone: 'ok'},
    {n: 'QuickBooks Online',    d: 'Accounting · auto-sync invoices',         on: false, status: 'Not connected', tone: 'mute'},
    {n: 'NarcX (PMP)',          d: 'Louisiana PMP reporting',                 on: true,  status: 'Connected · daily upload at 11:00 PM', tone: 'ok'},
    {n: 'Mailchimp',            d: 'Patient newsletters',                     on: false, status: 'Not connected', tone: 'mute'},
  ];
  return (
    <div>
      <SectionHeader title="Integrations" desc="External services connected to BNDS."/>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10}}>
        {ints.map((it, i) => (
          <div key={i} className="card" style={{padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12}}>
            <div style={{width: 36, height: 36, borderRadius: 8, background: 'var(--paper-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--ink-3)'}}>
              {it.n.split(' ').map(w => w[0]).join('').slice(0, 2)}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <span style={{fontWeight: 600, fontSize: 14}}>{it.n}</span>
                <Toggle on={it.on}/>
              </div>
              <div className="t-xs" style={{marginTop: 2}}>{it.d}</div>
              <div className="t-xs" style={{marginTop: 6, color: it.tone === 'ok' ? 'var(--ok)' : 'var(--ink-4)', fontWeight: 500}}>{it.status}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionNotifications() {
  return (
    <div>
      <SectionHeader title="Notifications & alerts" desc="When you and your staff get pinged."/>
      <div className="card card-pad" style={{padding: '4px 18px'}}>
        <SRow label="Refill reminders" hint="SMS to patient 7 days before depletion" control={<Toggle on/>}/>
        <SRow label="Pickup ready" hint="SMS + email when Rx enters pickup queue" control={<Toggle on/>}/>
        <SRow label="Pickup aged > 7 days" hint="Daily digest to PIC" control={<Toggle on/>}/>
        <SRow label="Low stock" hint="Push alert when SKU drops below par" control={<Toggle on/>}/>
        <SRow label="Out of stock" hint="Immediate alert to manager" control={<Toggle on/>}/>
        <SRow label="License expiration" hint="Email staff & PIC 60 days before expiry" control={<Toggle on/>}/>
        <SRow label="Failed claims" hint="Inbox alert to billing tech" control={<Toggle on/>}/>
        <SRow label="DEA threshold report" hint="Auto-generate weekly C-II summary" control={<Toggle on/>}/>
        <SRow label="System backups" hint="Email on success/failure" control={<Toggle/>}/>
      </div>
    </div>
  );
}

function SectionWorkflow() {
  return (
    <div>
      <SectionHeader title="Workflow rules" desc="Defaults that govern day-to-day pharmacy operations."/>
      <div className="card card-pad" style={{padding: '4px 18px'}}>
        <SRow label="Auto-refill enrollment" hint="New patients opt-in by default" control={<Toggle on/>}/>
        <SRow label="Auto-refill window" hint="Refill is queued this many days before depletion" control={<TextField value="7 days"/>}/>
        <SRow label="Counseling required for" hint="Force pharmacist counseling step" control={<TextField value="Controls · New Rx · High-risk meds"/>}/>
        <SRow label="Default par level method" hint="How par is calculated when not manually set" control={<TextField value="2× weekly velocity"/>}/>
        <SRow label="Pickup hold period" hint="Days before unsold Rx is restocked" control={<TextField value="14 days"/>}/>
        <SRow label="Compound batch QC" hint="Two-pharmacist sign-off" control={<Toggle on/>}/>
        <SRow label="C-II perpetual count" hint="Daily blind count" control={<Toggle on/>}/>
      </div>
    </div>
  );
}

function SectionBranding() {
  return (
    <div>
      <SectionHeader title="Branding" desc="How BNDS looks to patients."/>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14}}>
        <div className="card card-pad">
          <div className="t-eyebrow">Logo</div>
          <div style={{marginTop: 12, padding: 28, border: '1px dashed var(--line)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-2)'}}>
            <img src="logo.png" alt="BNDS" style={{height: 48}} onError={(e) => {e.target.style.display = 'none';}}/>
            <span className="bnds-serif" style={{fontSize: 28, fontWeight: 500, marginLeft: 8}}>BNDS</span>
          </div>
          <button className="btn btn-secondary btn-sm" style={{marginTop: 12}}>Upload new logo</button>
        </div>
        <div className="card card-pad">
          <div className="t-eyebrow">Receipt template</div>
          <div style={{marginTop: 12, padding: 14, background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6}}>
            <div style={{textAlign: 'center', fontWeight: 600}}>BOUDREAUX & DOUCET'S</div>
            <div style={{textAlign: 'center'}}>208 W Main St, Lafayette LA</div>
            <div style={{textAlign: 'center'}}>(337) 555-0100</div>
            <div style={{borderTop: '1px dashed var(--ink-4)', margin: '8px 0'}}/>
            <div>RX-77412 · Atorvastatin 20mg…</div>
            <div>Qty 30 · DAW 0 · BB1234567</div>
            <div style={{borderTop: '1px dashed var(--ink-4)', margin: '8px 0'}}/>
            <div style={{textAlign: 'center'}}>Bonjour, y'all. See you soon.</div>
          </div>
          <div style={{display: 'flex', gap: 8, marginTop: 12}}>
            <button className="btn btn-secondary btn-sm">Edit template</button>
            <button className="btn btn-ghost btn-sm">Test print</button>
          </div>
        </div>
      </div>
      <div style={{marginTop: 14}}>
        <div className="card card-pad" style={{padding: '4px 18px'}}>
          <SRow label="Patient SMS sender ID" hint="What patients see in their texts" control={<TextField value="BNDS Rx"/>}/>
          <SRow label="Patient email from" control={<TextField value="hello@bndsrx.com" mono/>}/>
          <SRow label="Brand color" control={<div style={{display: 'flex', gap: 8, alignItems: 'center'}}><span style={{width: 22, height: 22, borderRadius: 4, background: 'var(--bnds-forest)', border: '1px solid var(--line)'}}/><span className="bnds-mono" style={{fontSize: 12}}>#1F4D2A · forest</span></div>}/>
        </div>
      </div>
    </div>
  );
}

function SectionTax() {
  return (
    <div>
      <SectionHeader title="Tax & pricing" desc="How items are priced and taxed."/>
      <div className="card card-pad" style={{padding: '4px 18px'}}>
        <SRow label="Sales tax rate" hint="Lafayette Parish, LA · 9.45%" control={<TextField value="9.45%"/>}/>
        <SRow label="Tax Rx items" hint="Most prescriptions are tax-exempt" control={<Toggle/>}/>
        <SRow label="Tax OTC" control={<Toggle on/>}/>
        <SRow label="Default OTC markup" control={<TextField value="35% over cost"/>}/>
        <SRow label="Compound margin floor" control={<TextField value="40% min"/>}/>
        <SRow label="Cash price method" hint="When billing the patient directly" control={<TextField value="AWP × 0.85 + $4.50"/>}/>
        <SRow label="Copay rounding" control={<TextField value="Round to nearest $0.05"/>}/>
      </div>
    </div>
  );
}

function SectionSecurity() {
  return (
    <div>
      <SectionHeader title="Security & 2FA" desc="Sign-in and session policy."/>
      <div className="card card-pad" style={{padding: '4px 18px'}}>
        <SRow label="Two-factor authentication" hint="Required for all pharmacist accounts" control={<Toggle on/>}/>
        <SRow label="2FA method" control={<TextField value="Authenticator app (preferred) · SMS fallback"/>}/>
        <SRow label="Session timeout" hint="Idle sign-out duration" control={<TextField value="30 minutes"/>}/>
        <SRow label="Quick-PIN at workstation" hint="4-digit PIN for fast switch within a shift" control={<Toggle on/>}/>
        <SRow label="Allowed IP ranges" hint="Block sign-ins from outside the pharmacy network" control={<TextField value="10.0.4.0/24, 10.0.6.0/24" mono/>}/>
        <SRow label="Password policy" control={<TextField value="12+ chars, mixed case, rotate 90d"/>}/>
        <SRow label="Failed attempts lockout" control={<TextField value="5 attempts → 15 min lockout"/>}/>
        <SRow label="Audit log retention" control={<TextField value="7 years (HIPAA)"/>}/>
      </div>
    </div>
  );
}

function SectionBackup() {
  return (
    <div>
      <SectionHeader title="Backup & data export" desc="Where your data lives and how to get it out."/>
      <div className="card card-pad" style={{padding: '4px 18px'}}>
        <SRow label="Automatic backups" hint="Encrypted, off-site" control={<Toggle on/>}/>
        <SRow label="Backup frequency" control={<TextField value="Hourly · 7-day point-in-time recovery"/>}/>
        <SRow label="Last successful backup" hint="All systems green" control={<span className="t-xs" style={{color: 'var(--ok)', fontWeight: 500}}>14 minutes ago · 2.4 GB</span>}/>
        <SRow label="Geographic redundancy" control={<TextField value="us-east (primary), us-west-2 (replica)"/>}/>
      </div>
      <div style={{marginTop: 14}}>
        <SectionHeader title="Manual exports" tight/>
        <div className="card card-pad" style={{padding: '4px 18px'}}>
          <SRow label="Export patient list" hint="CSV · all active patients" control={<button className="btn btn-secondary btn-sm"><I.Download className="ic-sm"/> Download</button>}/>
          <SRow label="Export Rx history" hint="CSV · select date range" control={<button className="btn btn-secondary btn-sm"><I.Download className="ic-sm"/> Download</button>}/>
          <SRow label="Export financial reports" control={<button className="btn btn-secondary btn-sm"><I.Download className="ic-sm"/> Download</button>}/>
          <SRow label="Full data export (HIPAA)" hint="Complete data archive — takes 10–20 min to generate" control={<button className="btn btn-secondary btn-sm">Request</button>}/>
        </div>
      </div>
    </div>
  );
}

// Section header
function SectionHeader({title, desc, tight}) {
  return (
    <div style={{marginBottom: tight ? 8 : 14}}>
      <h3 className="bnds-serif" style={{fontSize: tight ? 15 : 18, fontWeight: 500, margin: 0}}>{title}</h3>
      {desc && <div className="t-xs" style={{marginTop: 3}}>{desc}</div>}
    </div>
  );
}

// Map id → component
const SECTION_RENDERERS = {
  pharmacy: SectionPharmacy,
  hours: SectionHours,
  devices: SectionDevices,
  integ: SectionIntegrations,
  notif: SectionNotifications,
  workflow: SectionWorkflow,
  branding: SectionBranding,
  tax: SectionTax,
  security: SectionSecurity,
  backup: SectionBackup,
};

// ============================================================
// SETTINGS A — Two-pane (Linear / Stripe style)
// ============================================================
function SettingsA() {
  const [active, setActive] = React.useState('pharmacy');
  const Renderer = SECTION_RENDERERS[active];

  return (
    <AppShell active="settings" sublabel="Administration" title="Settings"
      subtitle="Configure how BNDS Rx behaves at this pharmacy"
      dense>
      <div style={{display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%', minHeight: 0, background: 'var(--paper)'}}>
        <div style={{borderRight: '1px solid var(--line)', background: 'var(--surface)', padding: '14px 0', overflowY: 'auto'}}>
          <div style={{padding: '0 16px 10px', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)'}}>Configuration</div>
          {SETTINGS_CATEGORIES.map(c => {
            const Icon = SI[c.icon];
            return (
              <div key={c.id} onClick={() => setActive(c.id)}
                style={{
                  padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', fontSize: 13.5,
                  background: active === c.id ? 'var(--bnds-leaf-100)' : 'transparent',
                  borderLeft: active === c.id ? '3px solid var(--bnds-forest)' : '3px solid transparent',
                  fontWeight: active === c.id ? 600 : 400,
                  color: active === c.id ? 'var(--bnds-forest-deep)' : 'var(--ink)',
                }}>
                <Icon style={{flexShrink: 0, color: active === c.id ? 'var(--bnds-forest)' : 'var(--ink-3)'}}/>
                <span>{c.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{overflowY: 'auto', padding: 32}}>
          <div style={{maxWidth: 880}}>
            <Renderer/>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, { SettingsA });
