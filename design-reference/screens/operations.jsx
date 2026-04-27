/* eslint-disable */
// ============================================================
// OPERATIONS LANDING PAGES
// Pickup · Shipping · POS · Reorder
// ============================================================

// ---------------- Pickup (will-call bin board) ----------------
function Pickup() {
  const [tab, setTab] = React.useState('ready');
  const [search, setSearch] = React.useState('');
  const [sel, setSel] = React.useState(null);

  const bins = [
    {bin: 'A-01', patient: 'James Hebert',     items: 2, copay: 14.20, since: '2h',  flag: null,           insurance: 'BCBS LA'},
    {bin: 'A-02', patient: 'Marie Comeaux',    items: 1, copay: 0,     since: '4h',  flag: 'counsel',      insurance: 'Medicare'},
    {bin: 'A-03', patient: 'Beau Thibodeaux',  items: 3, copay: 28.00, since: '6h',  flag: 'C-II',         insurance: 'United HC'},
    {bin: 'A-04', patient: 'Camille Fontenot', items: 1, copay: 12.00, since: '1d',  flag: null,           insurance: 'Cash'},
    {bin: 'A-05', patient: 'Pierre Boudreaux', items: 4, copay: 0,     since: '2d',  flag: 'counsel',      insurance: 'Medicare'},
    {bin: 'A-06', patient: 'Annette LeBlanc',  items: 2, copay: 18.50, since: '3d',  flag: null,           insurance: 'BCBS LA'},
    {bin: 'A-07', patient: 'Yvette Robichaux', items: 5, copay: 0,     since: '5d',  flag: 'restock',      insurance: 'Medicare'},
    {bin: 'A-08', patient: 'Marcus Guidry',    items: 1, copay: 8.00,  since: '7d',  flag: 'restock',      insurance: 'Cigna'},
    {bin: 'B-01', patient: 'Delphine Mouton',  items: 2, copay: 22.00, since: '12d', flag: 'restock',      insurance: 'Humana'},
  ];

  const tabs = [
    {id: 'ready',     label: 'Ready for pickup', count: 47},
    {id: 'aging',     label: 'Aging > 7 days',   count: 8},
    {id: 'delivery',  label: 'Out for delivery', count: 12},
    {id: 'picked',    label: 'Picked up today',  count: 34},
  ];

  const ageColor = (s) => s.includes('d') && parseInt(s) >= 5 ? 'var(--danger)' : s.includes('d') ? 'var(--warn)' : 'var(--ink-3)';

  return (
    <AppShell active="pickup" sublabel="Operations" title="Pickup"
      subtitle="Will-call bins · keep aged scripts moving"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Print className="ic-sm"/> Print labels</button>
        <button className="btn btn-secondary btn-sm"><I.Send className="ic-sm"/> Notify all aging</button>
        <button className="btn btn-primary btn-sm"><I.Barcode className="ic-sm"/> Scan to release</button>
      </>}>
      <Toolbar
        tabs={tabs} active={tab} onChange={setTab}
        search={search} searchPlaceholder="Scan or type bin #, patient, Rx#…"
        filters={[
          {label: 'Bay', value: 'All'},
          {label: 'Has copay', icon: I.Dollar},
        ]}
      />

      {/* Bin grid */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: 18}}>
        {bins.map((b, i) => {
          const aged = b.since.endsWith('d') && parseInt(b.since) >= 3;
          const old  = b.since.endsWith('d') && parseInt(b.since) >= 7;
          return (
            <div key={b.bin} onClick={() => setSel(b.bin)}
              className="card"
              style={{
                padding: 14, cursor: 'pointer',
                borderColor: sel === b.bin ? 'var(--bnds-forest)' : (old ? 'var(--danger)' : aged ? 'var(--warn)' : 'var(--line)'),
                borderWidth: sel === b.bin || old || aged ? '1.5px' : '1px',
                background: sel === b.bin ? 'var(--bnds-leaf-100)' : 'var(--surface)',
                position: 'relative',
              }}>
              {old && <div style={{position: 'absolute', top: -1, right: -1, padding: '3px 7px', background: 'var(--danger)', color: 'white', borderRadius: '0 9px 0 9px', fontSize: 10, fontWeight: 600, letterSpacing: 0.06}}>RESTOCK</div>}
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8}}>
                <div className="bnds-mono" style={{fontSize: 13, fontWeight: 600, color: 'var(--bnds-forest)'}}>BIN {b.bin}</div>
                <div className="t-xs" style={{color: ageColor(b.since), fontWeight: 500}}>{b.since}</div>
              </div>
              <div style={{fontWeight: 500, fontSize: 14}}>{b.patient}</div>
              <div className="t-xs" style={{marginTop: 2}}>{b.items} item{b.items > 1 ? 's' : ''} · {b.insurance}</div>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)'}}>
                <div className="t-num" style={{fontWeight: 500, fontSize: 14, color: b.copay > 0 ? 'var(--ink)' : 'var(--ink-3)'}}>
                  {b.copay > 0 ? `$${b.copay.toFixed(2)}` : 'No copay'}
                </div>
                <div style={{display: 'flex', gap: 4}}>
                  {b.flag === 'counsel' && <span className="pill pill-info" style={{padding: '2px 6px'}}>Counsel</span>}
                  {b.flag === 'C-II'    && <span className="pill" style={{padding: '2px 6px'}}>C-II · ID</span>}
                  {b.flag === 'restock' && <span className="pill pill-warn" style={{padding: '2px 6px'}}>Old</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}

// ---------------- Shipping ----------------
function Shipping() {
  const [tab, setTab] = React.useState('today');

  const lanes = [
    {id: 'pack',     label: 'To pack',       count: 12, color: 'var(--info)'},
    {id: 'manifest', label: 'Awaiting carrier', count: 7, color: 'var(--warn)'},
    {id: 'transit',  label: 'In transit',    count: 24, color: 'var(--bnds-forest)'},
    {id: 'delivered',label: 'Delivered',     count: 18, color: 'var(--ok)'},
  ];

  const cards = {
    pack: [
      {id: 'SHP-2204', patient: 'Yvette Robichaux', items: 5, dest: 'Lafayette, LA', service: 'Local · Driver', priority: true},
      {id: 'SHP-2205', patient: 'Pierre Boudreaux', items: 2, dest: 'Breaux Bridge',  service: 'USPS Priority'},
      {id: 'SHP-2206', patient: 'Marie Comeaux',    items: 1, dest: 'Carencro',       service: 'USPS Priority', cold: true},
    ],
    manifest: [
      {id: 'SHP-2188', patient: 'Annette LeBlanc',  items: 2, dest: 'Scott',         service: 'USPS Priority'},
      {id: 'SHP-2189', patient: 'Marcus Guidry',    items: 1, dest: 'Youngsville',   service: 'UPS Ground'},
    ],
    transit: [
      {id: 'SHP-2150', patient: 'Theo Doucet',      items: 1, dest: 'New Iberia',    service: 'USPS · 9405...', eta: 'Today'},
      {id: 'SHP-2151', patient: 'Camille Fontenot', items: 3, dest: 'Abbeville',     service: 'UPS · 1Z9F...',  eta: 'Tomorrow'},
      {id: 'SHP-2152', patient: 'Beau Thibodeaux',  items: 2, dest: 'Lafayette',     service: 'Local Driver',   eta: '3:40 PM'},
    ],
    delivered: [
      {id: 'SHP-2099', patient: 'James Hebert',     items: 2, dest: 'Lafayette',     service: 'Driver',         delivered: '11:20 AM'},
      {id: 'SHP-2100', patient: 'Delphine Mouton',  items: 4, dest: 'Crowley',       service: 'USPS',           delivered: '9:42 AM'},
    ],
  };

  return (
    <AppShell active="shipping" sublabel="Operations" title="Shipping"
      subtitle="43 shipments active · 7 awaiting pickup by carrier"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Print className="ic-sm"/> Manifest</button>
        <button className="btn btn-secondary btn-sm"><I.MapPin className="ic-sm"/> Driver routes</button>
        <button className="btn btn-primary btn-sm"><I.Plus/> New shipment</button>
      </>}>
      <Toolbar
        tabs={[{id: 'today', label: 'Today', count: 43}, {id: 'week', label: 'This week', count: 187}, {id: 'cold', label: 'Cold-chain', count: 12}, {id: 'returns', label: 'Returns', count: 2}]}
        active={tab} onChange={setTab}
        filters={[{label: 'Carrier', value: 'All'}, {label: 'Driver', value: 'Any'}]}
      />

      {/* Kanban */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12}}>
        {lanes.map(lane => (
          <div key={lane.id} style={{display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px'}}>
              <span style={{width: 8, height: 8, borderRadius: 999, background: lane.color}}/>
              <div style={{fontWeight: 600, fontSize: 13}}>{lane.label}</div>
              <div className="t-xs" style={{marginLeft: 'auto', fontWeight: 500, color: 'var(--ink-3)'}}>{lane.count}</div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
              {(cards[lane.id] || []).map(c => (
                <div key={c.id} className="card" style={{padding: 12, cursor: 'grab'}}>
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <div className="bnds-mono" style={{fontSize: 11.5, color: 'var(--bnds-forest)'}}>{c.id}</div>
                    <div style={{display: 'flex', gap: 4}}>
                      {c.priority && <span className="pill pill-warn" style={{padding: '1px 6px', fontSize: 10}}>RUSH</span>}
                      {c.cold && <span className="pill pill-info" style={{padding: '1px 6px', fontSize: 10}}>❄ COLD</span>}
                    </div>
                  </div>
                  <div style={{fontWeight: 500, fontSize: 13.5, marginTop: 6}}>{c.patient}</div>
                  <div className="t-xs" style={{marginTop: 2}}>{c.items} item{c.items > 1 ? 's' : ''} · {c.dest}</div>
                  <div className="t-xs" style={{marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between'}}>
                    <span>{c.service}</span>
                    {c.eta && <span style={{color: 'var(--bnds-forest)', fontWeight: 500}}>ETA {c.eta}</span>}
                    {c.delivered && <span style={{color: 'var(--ok)', fontWeight: 500}}>✓ {c.delivered}</span>}
                  </div>
                </div>
              ))}
              <button style={{padding: '8px', border: '1px dashed var(--line-2)', borderRadius: 8, background: 'transparent', fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer', fontFamily: 'inherit'}}>+ Add</button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

// ---------------- POS ----------------
function POS() {
  const [items, setItems] = React.useState([
    {id: 1, name: 'Atorvastatin 20mg · 30ct', rx: 'RX-77412', patient: 'James Hebert', price: 14.20, type: 'Rx'},
    {id: 2, name: 'Lisinopril 10mg · 90ct',   rx: 'RX-77389', patient: 'James Hebert', price: 0,     type: 'Rx', covered: true},
    {id: 3, name: 'Tylenol PM · 100ct',                                                price: 12.99, type: 'OTC'},
    {id: 4, name: 'Boudreaux\'s tote bag',                                             price: 8.00,  type: 'OTC'},
  ]);

  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const tax = +(subtotal * 0.0945).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  const remove = (id) => setItems(items.filter(i => i.id !== id));

  return (
    <AppShell active="pos" sublabel="Operations" title="Point of Sale" subtitle="Workstation 04 · Front counter · Sara Comeaux"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Eye className="ic-sm"/> Look up sale</button>
        <button className="btn btn-secondary btn-sm">Drawer</button>
      </>}>
      <div style={{display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start'}}>
        {/* Cart */}
        <div className="card" style={{padding: 0, overflow: 'hidden'}}>
          <div style={{padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10}}>
            <Avatar name="James Hebert" size={32}/>
            <div style={{flex: 1}}>
              <div style={{fontWeight: 500}}>James Hebert</div>
              <div className="t-xs">P-1042 · BCBS Louisiana · 2 ready in bin A-01</div>
            </div>
            <button className="btn btn-ghost btn-sm">Change</button>
          </div>

          {/* Scan input */}
          <div style={{padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--paper)', borderBottom: '1px solid var(--line)'}}>
            <I.Barcode className="ic-lg" style={{color: 'var(--bnds-forest)'}}/>
            <input placeholder="Scan barcode or search item…" style={{flex: 1, border: 0, background: 'transparent', outline: 0, fontSize: 14, fontFamily: 'inherit'}}/>
            <span className="kbd">F2</span>
          </div>

          <table className="tbl">
            <thead><tr>
              <th>Item</th><th>Type</th>
              <th className="t-num" style={{textAlign: 'right'}}>Price</th>
              <th style={{width: 36}}></th>
            </tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td>
                    <div style={{fontWeight: 500}}>{i.name}</div>
                    {i.rx && <div className="t-xs bnds-mono">{i.rx}</div>}
                  </td>
                  <td><span className="pill" style={{background: i.type === 'Rx' ? 'var(--bnds-leaf-100)' : 'var(--paper-2)', color: i.type === 'Rx' ? 'var(--bnds-forest-700)' : 'var(--ink-2)'}}>{i.type}</span></td>
                  <td className="t-num" style={{textAlign: 'right', fontWeight: 500}}>{i.covered ? <span style={{color: 'var(--ok)', fontWeight: 500, fontSize: 12}}>Covered</span> : `$${i.price.toFixed(2)}`}</td>
                  <td><button onClick={() => remove(i.id)} style={{border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-4)'}}><I.X/></button></td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{padding: '14px 18px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13.5}}>
            <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)'}}><span>Subtotal</span><span className="t-num">${subtotal.toFixed(2)}</span></div>
            <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)'}}><span>Tax (9.45% · OTC only)</span><span className="t-num">${tax.toFixed(2)}</span></div>
            <div style={{display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)'}}><span>Insurance covered</span><span className="t-num">−$58.00</span></div>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 600, marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--line)'}}><span>Total due</span><span className="t-num bnds-serif" style={{color: 'var(--bnds-forest)'}}>${total.toFixed(2)}</span></div>
          </div>
        </div>

        {/* Pay panel */}
        <div className="card" style={{padding: 18, display: 'flex', flexDirection: 'column', gap: 14}}>
          <div className="t-eyebrow">Payment</div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
            {[
              {l: 'Card', icon: I.Card, primary: true},
              {l: 'Cash', icon: I.Dollar},
              {l: 'HSA / FSA', icon: I.Shield},
              {l: 'Charge acct', icon: I.Receipt},
              {l: 'Gift card', icon: I.Tag},
              {l: 'Split', icon: I.Hash},
            ].map(p => (
              <button key={p.l} className={p.primary ? 'btn btn-primary' : 'btn btn-secondary'} style={{justifyContent: 'flex-start', padding: '12px 14px'}}>
                <p.icon className="ic-sm"/> {p.l}
              </button>
            ))}
          </div>

          <div style={{padding: 12, background: 'var(--paper-2)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-2)'}}>
            <div style={{fontWeight: 500, marginBottom: 4}}>Counseling required</div>
            <div className="t-xs">First fill of Atorvastatin 20mg. Pharmacist must verify before sale. <a href="#" style={{color: 'var(--bnds-forest)'}}>Page pharmacist</a></div>
          </div>

          <div style={{display: 'flex', gap: 8, marginTop: 'auto'}}>
            <button className="btn btn-ghost" style={{flex: 1}}>Hold</button>
            <button className="btn btn-secondary" style={{flex: 1}}>Print quote</button>
          </div>
          <button className="btn btn-primary btn-lg" style={{justifyContent: 'center', fontSize: 15}}>Charge ${total.toFixed(2)} <I.ChevR/></button>
        </div>
      </div>
    </AppShell>
  );
}

// ---------------- Reorder ----------------
function Reorder() {
  const [cart, setCart] = React.useState({'00069-2940': true, '00169-4136': true, '00071-0155': true});

  const items = [
    {ndc: '00071-0155', name: 'Atorvastatin 20mg',     onHand: 88,   par: 200, vendor: 'McKesson',  pack: '90 ct', cost: 12.40, lead: '1 day',  status: 'low'},
    {ndc: '00069-2940', name: 'Amoxicillin 500mg',     onHand: 12,   par: 150, vendor: 'Cardinal',  pack: '500 ct',cost: 38.00, lead: '2 days', status: 'low'},
    {ndc: '00169-4136', name: 'Ozempic 0.5mg pen',     onHand: 0,    par: 8,   vendor: 'McKesson',  pack: '1 ea',  cost: 932.00,lead: '3 days', status: 'out',  cold: true},
    {ndc: '52268-0044', name: 'Eliquis 5mg',           onHand: 24,   par: 60,  vendor: 'AmerisourceBergen', pack: '60 ct', cost: 482.00, lead: '1 day', status: 'low'},
    {ndc: '00071-0156', name: 'Lisinopril 10mg',       onHand: 482,  par: 300, vendor: 'McKesson',  pack: '1000 ct', cost: 14.80, lead: '1 day', status: 'ok'},
    {ndc: '00378-0414', name: 'Metformin HCl 500mg',   onHand: 1240, par: 600, vendor: 'Cardinal',  pack: '500 ct', cost: 9.20,  lead: '2 days', status: 'ok'},
  ];

  const toggle = ndc => setCart(c => ({...c, [ndc]: !c[ndc]}));
  const cartItems = items.filter(i => cart[i.ndc]);
  const cartTotal = cartItems.reduce((s, i) => s + i.cost, 0);

  return (
    <AppShell active="reorder" sublabel="Operations" title="Reorder"
      subtitle="32 SKUs below par · 4 out of stock"
      actions={<>
        <button className="btn btn-secondary btn-sm"><I.Sparkle className="ic-sm"/> Auto-build cart</button>
        <button className="btn btn-secondary btn-sm">Vendor history</button>
        <button className="btn btn-primary btn-sm"><I.Send className="ic-sm"/> Send {cartItems.length} orders</button>
      </>}>
      <div style={{display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, alignItems: 'start'}}>
        {/* Suggestions table */}
        <div className="card" style={{overflow: 'hidden'}}>
          <div style={{padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10}}>
            <div style={{fontWeight: 600, fontSize: 13.5}}>Suggested orders</div>
            <div className="t-xs">Based on par levels & 30-day velocity</div>
            <div style={{flex: 1}}/>
            <button className="btn btn-ghost btn-sm"><I.Filter className="ic-sm"/> Vendor</button>
          </div>
          <table className="tbl">
            <thead><tr>
              <th style={{width: 36}}></th><th>Product</th>
              <th className="t-num" style={{textAlign: 'right'}}>On hand</th>
              <th className="t-num" style={{textAlign: 'right'}}>Par</th>
              <th>Vendor</th><th>Pack</th>
              <th className="t-num" style={{textAlign: 'right'}}>Cost</th>
              <th>Lead</th>
            </tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.ndc} className={cart[i.ndc] ? 'selected' : ''}>
                  <td><input type="checkbox" checked={!!cart[i.ndc]} onChange={() => toggle(i.ndc)}/></td>
                  <td>
                    <div style={{fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6}}>
                      {i.name}
                      {i.cold && <span className="pill pill-info" style={{padding: '1px 5px', fontSize: 10}}>❄</span>}
                    </div>
                    <div className="t-xs bnds-mono">{i.ndc}</div>
                  </td>
                  <td className="t-num" style={{textAlign: 'right', color: i.status === 'out' ? 'var(--danger)' : i.status === 'low' ? 'var(--warn)' : 'var(--ink)'}}>{i.onHand}</td>
                  <td className="t-num" style={{textAlign: 'right', color: 'var(--ink-3)'}}>{i.par}</td>
                  <td className="t-xs">{i.vendor}</td>
                  <td className="t-xs">{i.pack}</td>
                  <td className="t-num" style={{textAlign: 'right', fontWeight: 500}}>${i.cost.toFixed(2)}</td>
                  <td className="t-xs">{i.lead}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cart */}
        <div className="card" style={{padding: 0, overflow: 'hidden', position: 'sticky', top: 0}}>
          <div style={{padding: '14px 16px', borderBottom: '1px solid var(--line)'}}>
            <div className="t-eyebrow">Purchase order draft</div>
            <div style={{fontWeight: 600, fontSize: 16, marginTop: 4}}>{cartItems.length} items · 3 vendors</div>
          </div>
          {['McKesson', 'Cardinal', 'AmerisourceBergen'].map(v => {
            const vis = cartItems.filter(i => i.vendor === v);
            if (!vis.length) return null;
            const sub = vis.reduce((s, i) => s + i.cost, 0);
            return (
              <div key={v} style={{padding: '12px 16px', borderBottom: '1px solid var(--line)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
                  <div style={{fontWeight: 500, fontSize: 13}}>{v}</div>
                  <div className="t-num" style={{fontWeight: 500, fontSize: 13}}>${sub.toFixed(2)}</div>
                </div>
                {vis.map(i => (
                  <div key={i.ndc} className="t-xs" style={{display: 'flex', justifyContent: 'space-between', padding: '3px 0'}}>
                    <span>{i.name} <span style={{color: 'var(--ink-4)'}}>· {i.pack}</span></span>
                    <span className="t-num">${i.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div className="t-eyebrow">Total</div>
            <div className="bnds-serif t-num" style={{fontSize: 22, fontWeight: 500, color: 'var(--bnds-forest)'}}>${cartTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

Object.assign(window, { Pickup, Shipping, POS, Reorder });
