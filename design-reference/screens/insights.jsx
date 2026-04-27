/* eslint-disable */
// ============================================================
// INSIGHTS — Reports + Messaging
// ============================================================

function Reports() {
  const [tab, setTab] = React.useState('overview');

  return (
    <AppShell active="reports" sublabel="Insights" title="Reports"
      subtitle="April 2026 · Main St + 2 satellites"
      actions={<>
        <button className="btn btn-secondary btn-sm">Apr 2026 ▾</button>
        <button className="btn btn-secondary btn-sm"><I.Download className="ic-sm"/> Export PDF</button>
        <button className="btn btn-secondary btn-sm"><I.Print className="ic-sm"/></button>
      </>}>
      <Toolbar
        tabs={[
          {id: 'overview', label: 'Overview'},
          {id: 'fills', label: 'Fills'},
          {id: 'revenue', label: 'Revenue'},
          {id: 'inventory', label: 'Inventory'},
          {id: 'staff', label: 'Staff'},
          {id: 'compliance', label: 'Compliance'},
        ]}
        active={tab} onChange={setTab}
      />

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16}}>
        <KPI label="Fills MTD" value="2,184" trend={{dir: 'up', label: '+8.2% vs Mar'}} tone="forest"/>
        <KPI label="Revenue MTD" value="$184,212" trend={{dir: 'up', label: '+5.4%'}} tone="ok"/>
        <KPI label="Avg fill time" value="14.2 min" trend={{dir: 'up', label: '−1.8 min'}} tone="ok"/>
        <KPI label="Patient sat (CSAT)" value="4.78" hint="118 surveys" tone="info"/>
      </div>

      {/* Big chart */}
      <div className="card" style={{padding: 22, marginBottom: 16}}>
        <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18}}>
          <div>
            <div className="t-eyebrow">Fills · daily</div>
            <h3 className="bnds-serif" style={{fontSize: 22, fontWeight: 500, marginTop: 4}}>2,184 fills this month</h3>
            <div className="t-xs" style={{marginTop: 2}}>Avg 73/day · peak 112 (Apr 14)</div>
          </div>
          <div style={{display: 'flex', gap: 16, fontSize: 12}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><span style={{width: 10, height: 10, background: 'var(--bnds-forest)', borderRadius: 2}}/> New</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><span style={{width: 10, height: 10, background: 'var(--bnds-leaf)', borderRadius: 2}}/> Refill</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 6}}><span style={{width: 10, height: 10, background: 'var(--info)', borderRadius: 2}}/> Transfer</div>
          </div>
        </div>
        {/* Stacked bar chart */}
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 4, height: 220, paddingTop: 8}}>
          {Array.from({length: 26}).map((_, i) => {
            const seed = (i * 7 + 13) % 9;
            const total = 50 + seed * 8 + (i % 5 === 0 ? 30 : 0);
            const newR = total * 0.25, ref = total * 0.6, tr = total - newR - ref;
            return (
              <div key={i} style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 0, height: '100%'}}>
                <div style={{width: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden'}}>
                  <div style={{height: newR, background: 'var(--bnds-forest)'}}/>
                  <div style={{height: ref, background: 'var(--bnds-leaf)'}}/>
                  <div style={{height: tr, background: 'var(--info)'}}/>
                </div>
                {i % 5 === 0 && <div className="t-xs" style={{marginTop: 6, fontSize: 10, color: 'var(--ink-4)'}}>Apr {i+1}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
        {/* Top drugs */}
        <div className="card" style={{padding: 18}}>
          <div className="t-eyebrow">Top drugs by fills</div>
          {[
            {n: 'Lisinopril 10mg',     c: 184, color: 'var(--bnds-forest)'},
            {n: 'Atorvastatin 20mg',   c: 142, color: 'var(--bnds-leaf)'},
            {n: 'Metformin 500mg',     c: 128, color: '#7ab85f'},
            {n: 'Levothyroxine 50mcg', c: 102, color: 'var(--info)'},
            {n: 'Amoxicillin 500mg',   c:  86, color: 'var(--warn)'},
            {n: 'Sertraline 50mg',     c:  74, color: '#d97a2a'},
          ].map(d => (
            <div key={d.n} style={{marginTop: 12}}>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13}}>
                <span>{d.n}</span><span className="t-num" style={{fontWeight: 500}}>{d.c}</span>
              </div>
              <div style={{height: 5, borderRadius: 3, background: 'var(--paper-2)', marginTop: 4, overflow: 'hidden'}}>
                <div style={{height: '100%', width: `${(d.c / 184) * 100}%`, background: d.color}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue breakdown */}
        <div className="card" style={{padding: 18}}>
          <div className="t-eyebrow">Revenue mix</div>
          <div style={{display: 'flex', alignItems: 'center', gap: 24, marginTop: 14}}>
            {/* Donut */}
            <svg width="140" height="140" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.91" fill="transparent" stroke="var(--paper-2)" strokeWidth="6"/>
              <circle cx="21" cy="21" r="15.91" fill="transparent" stroke="var(--bnds-forest)" strokeWidth="6" strokeDasharray="62 38" strokeDashoffset="25" transform="rotate(-90 21 21)"/>
              <circle cx="21" cy="21" r="15.91" fill="transparent" stroke="var(--bnds-leaf)" strokeWidth="6" strokeDasharray="22 78" strokeDashoffset="-37" transform="rotate(-90 21 21)"/>
              <circle cx="21" cy="21" r="15.91" fill="transparent" stroke="var(--info)" strokeWidth="6" strokeDasharray="11 89" strokeDashoffset="-59" transform="rotate(-90 21 21)"/>
              <circle cx="21" cy="21" r="15.91" fill="transparent" stroke="var(--warn)" strokeWidth="6" strokeDasharray="5 95" strokeDashoffset="-70" transform="rotate(-90 21 21)"/>
            </svg>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 8}}>
              {[
                {l: 'Insurance reimb.',  v: '$114,212', share: 62, color: 'var(--bnds-forest)'},
                {l: 'Cash / OTC',        v: '$40,520',  share: 22, color: 'var(--bnds-leaf)'},
                {l: 'Compounding',       v: '$20,180',  share: 11, color: 'var(--info)'},
                {l: 'DME / Other',       v: '$9,300',   share:  5, color: 'var(--warn)'},
              ].map(r => (
                <div key={r.l} style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13}}>
                  <span style={{width: 8, height: 8, borderRadius: 2, background: r.color}}/>
                  <span style={{flex: 1}}>{r.l}</span>
                  <span className="t-num" style={{fontWeight: 500}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Messaging() {
  const [active, setActive] = React.useState('thread-2');

  const threads = [
    {id: 'thread-1', name: 'Dr. Landry · Lafayette Family Med', last: 'PA approved for Hebert', time: '11:42', unread: 0,  type: 'prescriber'},
    {id: 'thread-2', name: 'James Hebert', last: "Pickup ready — see you tomorrow?", time: '11:08', unread: 2, type: 'patient'},
    {id: 'thread-3', name: 'Yvette Robichaux', last: 'Driver ETA 3:40 PM', time: '10:50', unread: 1, type: 'patient'},
    {id: 'thread-4', name: 'Dr. Hebert · Lafayette Cardiology', last: 'Fax received — verifying', time: '10:22', unread: 0, type: 'prescriber'},
    {id: 'thread-5', name: '#staff-main-st', last: 'Sara: out at 3, covering David', time: '09:48', unread: 0, type: 'staff'},
    {id: 'thread-6', name: 'BCBS Louisiana · payer', last: 'Auth response received', time: '09:14', unread: 0, type: 'payer'},
    {id: 'thread-7', name: 'Marie Comeaux', last: 'Thank you!', time: 'Yesterday', unread: 0, type: 'patient'},
    {id: 'thread-8', name: 'Beau Thibodeaux', last: 'Sent identification photo', time: 'Yesterday', unread: 0, type: 'patient'},
  ];

  const messages = [
    {from: 'them', name: 'James Hebert', text: 'Hey Marie — got the text that my Atorvastatin is ready for pickup. Are y\'all open until 7 today?', time: '10:48 AM'},
    {from: 'me',   name: 'You',          text: 'Hi James! Yes, we close at 7 PM. Your script is in bin A-01 with a $14.20 copay.', time: '10:52 AM'},
    {from: 'them', name: 'James Hebert', text: 'Perfect. I can come by after work, around 5:30. Any chance Dr. Landry sent over my Lisinopril refill too?', time: '11:02 AM'},
    {from: 'me',   name: 'You',          text: 'Just checked — yes, Lisinopril 10mg #90 is also ready. No copay on that one (Medicare D). Want me to add a counseling slot for the new statin?', time: '11:06 AM'},
    {from: 'them', name: 'James Hebert', text: 'Pickup ready — see you tomorrow?', time: '11:08 AM'},
  ];

  const typeColor = {patient: 'var(--bnds-leaf)', prescriber: 'var(--info)', staff: 'var(--warn)', payer: 'var(--ink-3)'};
  const typeLabel = {patient: 'Patient', prescriber: 'Prescriber', staff: 'Staff', payer: 'Payer'};

  const sel = threads.find(t => t.id === active);

  return (
    <AppShell active="messaging" sublabel="Insights" title="Messaging" subtitle="Patients · prescribers · staff · payers — one inbox" dense>
      <div style={{display: 'grid', gridTemplateColumns: '320px 1fr 320px', height: '100%', minHeight: 0, background: 'var(--paper)'}}>
        {/* Thread list */}
        <div style={{borderRight: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', minHeight: 0}}>
          <div style={{padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10}}>
            <h2 className="bnds-serif" style={{fontSize: 20, fontWeight: 500, margin: 0, flex: 1}}>Inbox</h2>
            <button className="btn btn-ghost btn-sm"><I.Filter className="ic-sm"/></button>
            <button className="btn btn-primary btn-sm"><I.Plus/></button>
          </div>
          <div style={{padding: '8px 12px', borderBottom: '1px solid var(--line)'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 6}}>
              <I.Search className="ic-sm" style={{color: 'var(--ink-3)'}}/>
              <input placeholder="Search messages…" style={{border: 0, outline: 0, background: 'transparent', flex: 1, fontSize: 13, fontFamily: 'inherit'}}/>
            </div>
          </div>
          <div style={{flex: 1, overflowY: 'auto'}}>
            {threads.map(t => (
              <div key={t.id} onClick={() => setActive(t.id)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--line)',
                  background: active === t.id ? 'var(--bnds-leaf-100)' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', gap: 11, alignItems: 'flex-start',
                }}>
                <div style={{position: 'relative'}}>
                  <Avatar name={t.name} size={36}/>
                  <span style={{position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 999, background: typeColor[t.type], border: '2px solid var(--surface)'}}/>
                </div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{display: 'flex', alignItems: 'baseline', gap: 6}}>
                    <div style={{fontWeight: 600, fontSize: 13.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{t.name}</div>
                    <div className="t-xs">{t.time}</div>
                  </div>
                  <div className="t-xs" style={{marginTop: 2, color: t.unread ? 'var(--ink)' : 'var(--ink-3)', fontWeight: t.unread ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{t.last}</div>
                </div>
                {t.unread > 0 && <span style={{minWidth: 18, height: 18, padding: '0 6px', borderRadius: 999, background: 'var(--bnds-leaf)', color: 'white', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{t.unread}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Conversation */}
        <div style={{display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0}}>
          <div style={{padding: '14px 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12}}>
            <Avatar name={sel.name} size={36}/>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 600}}>{sel.name}</div>
              <div className="t-xs" style={{display: 'flex', alignItems: 'center', gap: 6}}>
                <span style={{width: 7, height: 7, borderRadius: 999, background: typeColor[sel.type]}}/> {typeLabel[sel.type]} · SMS via Twilio
              </div>
            </div>
            <button className="btn btn-ghost btn-sm"><I.Phone className="ic-sm"/></button>
            <button className="btn btn-ghost btn-sm"><I.Eye className="ic-sm"/> Profile</button>
          </div>
          <div style={{flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--paper)'}}>
            <div className="t-xs" style={{textAlign: 'center', color: 'var(--ink-4)'}}>— Today —</div>
            {messages.map((m, i) => (
              <div key={i} style={{display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start'}}>
                <div style={{maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 3, alignItems: m.from === 'me' ? 'flex-end' : 'flex-start'}}>
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: m.from === 'me' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: m.from === 'me' ? 'var(--bnds-forest)' : 'var(--surface)',
                    color: m.from === 'me' ? 'white' : 'var(--ink)',
                    border: m.from === 'me' ? 'none' : '1px solid var(--line)',
                    fontSize: 14, lineHeight: 1.45,
                  }}>{m.text}</div>
                  <div className="t-xs" style={{fontSize: 11}}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding: 14, borderTop: '1px solid var(--line)', background: 'var(--surface)'}}>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 10, padding: '10px 14px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10}}>
              <button className="btn btn-ghost btn-sm" style={{padding: 6}}><I.Paperclip className="ic-sm"/></button>
              <textarea placeholder="Type a message…" rows={1} style={{flex: 1, border: 0, outline: 0, background: 'transparent', resize: 'none', fontSize: 14, fontFamily: 'inherit', color: 'var(--ink)', padding: '4px 0'}}/>
              <button className="btn btn-primary btn-sm"><I.Send className="ic-sm"/> Send</button>
            </div>
            <div className="t-xs" style={{marginTop: 8, display: 'flex', gap: 14}}>
              <span>⌘+Enter to send</span>
              <span>Templates: Pickup ready · Refill due · Counseling</span>
            </div>
          </div>
        </div>

        {/* Patient context */}
        <div style={{borderLeft: '1px solid var(--line)', background: 'var(--surface)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto'}}>
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingBottom: 14, borderBottom: '1px solid var(--line)'}}>
            <Avatar name={sel.name} size={56}/>
            <div style={{fontWeight: 600, fontSize: 16}}>{sel.name}</div>
            <div className="t-xs">P-1042 · DOB 03/14/1958</div>
          </div>
          <div>
            <div className="t-eyebrow">Pickup ready</div>
            <div className="card" style={{padding: 12, marginTop: 6, background: 'var(--bnds-leaf-100)', borderColor: 'rgba(90,168,69,0.3)'}}>
              <div style={{fontWeight: 500, fontSize: 13}}>2 items · bin A-01</div>
              <div className="t-xs" style={{marginTop: 2}}>Atorvastatin 20mg · Lisinopril 10mg</div>
              <div className="t-num" style={{fontWeight: 500, marginTop: 6}}>$14.20 due</div>
            </div>
          </div>
          <div>
            <div className="t-eyebrow">Active prescriptions</div>
            <div style={{marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6}}>
              {['Atorvastatin 20mg', 'Lisinopril 10mg', 'Metformin 500mg'].map(d => (
                <div key={d} className="t-small" style={{padding: '6px 10px', background: 'var(--paper-2)', borderRadius: 6}}>{d}</div>
              ))}
            </div>
          </div>
          <div>
            <div className="t-eyebrow">Allergies</div>
            <div style={{marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap'}}>
              <StatusPill tone="danger" label="Sulfa"/>
              <StatusPill tone="danger" label="PCN"/>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{justifyContent: 'center'}}>Open full profile <I.ChevR className="ic-sm"/></button>
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, { Reports, Messaging });
