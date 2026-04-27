/* eslint-disable */
// ============================================================
// APP SHELL — light sidebar with sectioned groups
// ============================================================

function AppShell({active = "dashboard", title, subtitle, actions, children, dense = false, sublabel}) {
  const groups = [
    {name: null, items: [
      {id: 'dashboard',     label: 'Dashboard',     icon: I.Home},
      {id: 'patients',      label: 'Patients',      icon: I.Users},
      {id: 'queue',         label: 'Prescriptions', icon: I.Pill,      badge: 24},
      {id: 'pickup',        label: 'Pickup',        icon: I.Receipt},
    ]},
    {name: "Dispensing", items: [
      {id: 'compounding',   label: 'Compounding',   icon: I.Pill},
      {id: 'batch',         label: 'Batch Records', icon: I.Receipt},
    ]},
    {name: "Operations", items: [
      {id: 'inventory',     label: 'Inventory',     icon: I.Inventory},
      {id: 'reorder',       label: 'Reorder',       icon: I.Refill},
      {id: 'shipping',      label: 'Shipping',      icon: I.Truck,     badge: 7},
      {id: 'pos',           label: 'POS',           icon: I.Receipt},
    ]},
    {name: "Financial", items: [
      {id: 'billing',       label: 'Billing',       icon: I.Receipt},
      {id: 'insurance',     label: 'Insurance',     icon: I.Shield},
    ]},
    {name: "Insights", items: [
      {id: 'reports',       label: 'Reports',       icon: I.Chart},
      {id: 'messaging',     label: 'Messaging',     icon: I.Mail},
    ]},
  ];

  return (
    <div className="bnds" style={{display: 'grid', gridTemplateColumns: '232px 1fr', height: '100%', background: 'var(--paper)'}}>
      {/* Sidebar */}
      <aside style={{
        background: '#eef3e9',
        borderRight: '1px solid #d9e2d1',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{padding: '16px 18px 14px', borderBottom: '1px solid #d9e2d1'}}>
          <img src="assets/logo.webp" style={{height: 32, display: 'block'}}/>
        </div>

        {/* Nav */}
        <div style={{flex: 1, overflowY: 'auto', padding: '10px 10px'}}>
          {groups.map((g, gi) => (
            <div key={gi} style={{marginBottom: 4}}>
              {g.name && (
                <div style={{
                  fontSize: 10.5, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: '#7a8a78', padding: '14px 10px 6px'
                }}>{g.name}</div>
              )}
              {g.items.map(item => {
                const Ic = item.icon;
                const isActive = active === item.id;
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '8px 12px', margin: '1px 0',
                    borderRadius: 8,
                    background: isActive ? '#cfe0c0' : 'transparent',
                    color: isActive ? '#0f2e1f' : '#1f3829',
                    fontSize: 13.5, fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    border: isActive ? '1px solid #b6cba2' : '1px solid transparent',
                  }}>
                    <Ic style={{color: isActive ? '#1f5a3a' : '#3a5a44'}}/>
                    <span style={{flex: 1}}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        fontSize: 10.5, padding: '1px 6px', borderRadius: 999,
                        background: 'var(--bnds-leaf)', color: 'white', fontWeight: 600
                      }}>{item.badge}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{padding: '8px 10px', borderTop: '1px solid #d9e2d1'}}>
          {[
            {id: "users", l: "Users", icon: I.Users},
            {id: "settings", l: "Settings", icon: I.Settings},
          ].map(x => {
            const Ic = x.icon;
            const isActive = active === x.id;
            return (
              <div key={x.l} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px',
                fontSize: 13.5, cursor: 'pointer', borderRadius: 8,
                background: isActive ? '#cfe0c0' : 'transparent',
                border: isActive ? '1px solid #b6cba2' : '1px solid transparent',
                color: isActive ? '#0f2e1f' : '#1f3829',
                fontWeight: isActive ? 600 : 400,
              }}>
                <Ic style={{color: isActive ? '#1f5a3a' : '#3a5a44'}}/> {x.l}
              </div>
            );
          })}
        </div>
        <div style={{padding: '6px 10px 8px', borderTop: '1px solid #d9e2d1'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px', fontSize: 13.5, color: '#1f3829', cursor: 'pointer', borderRadius: 8}}>
            <I.Logout style={{color: '#3a5a44'}}/> Sign out
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 11, padding: '8px 12px', fontSize: 12.5, color: '#5a6b58', cursor: 'pointer', borderRadius: 8, borderTop: '1px solid #d9e2d1', marginTop: 4}}>
            <I.ChevR className="ic-sm" style={{transform: 'rotate(180deg)'}}/> Collapse
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden'}}>
        <div className="topbar">
          <div className="search">
            <I.Search/>
            <input placeholder="Search patients, Rx #, NDC, drug name…" />
            <span className="kbd">⌘K</span>
          </div>
          <div style={{flex: 1}}/>
          <button className="btn btn-secondary btn-sm"><I.Plus/> New Rx</button>
          <div style={{position: 'relative'}}>
            <I.Bell style={{color: 'var(--ink-2)'}}/>
            <div style={{position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: 999, background: 'var(--danger)'}}/>
          </div>
        </div>
        <div style={{padding: dense ? 0 : 24, flex: 1, overflow: 'auto', background: 'var(--paper)', position: 'relative'}}>
          {(title || actions) && !dense && (
            <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22}}>
              <div>
                {sublabel && <div className="t-eyebrow">{sublabel}</div>}
                <h1 className="bnds-serif" style={{fontSize: 28, fontWeight: 500, marginTop: 4}}>{title}</h1>
                {subtitle && <p className="t-body" style={{color: 'var(--ink-3)', marginTop: 4}}>{subtitle}</p>}
              </div>
              <div style={{display: 'flex', gap: 8}}>{actions}</div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

window.AppShell = AppShell;
