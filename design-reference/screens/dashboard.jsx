/* eslint-disable */
// ============================================================
// DASHBOARD — three-column workflow / quick access / activity
// Modeled on the existing layout, refreshed for clarity & rhythm
// ============================================================

const WORKFLOW_QUEUE = [
  {label: "Intake",         dot: "#5aa845", count: 0},
  {label: "Sync",           dot: "#2b6c9b", count: 0},
  {label: "Reject",         dot: "#b8442e", count: 0},
  {label: "Print",          dot: "#1f5a3a", count: 2},
  {label: "Scan",           dot: "#5aa845", count: 1},
  {label: "Verify",         dot: "#c98a14", count: 4},
  {label: "Out of Stock",   dot: "#c98a14", count: 0},
  {label: "Waiting Bin",    dot: "#c98a14", count: 18, hot: true},
  {label: "Renewals",       dot: "#5aa845", count: 0},
  {label: "Todo",           dot: "#2b6c9b", count: 0},
  {label: "Price Check",    dot: "#b8442e", count: 0},
  {label: "Prepay",         dot: "#5aa845", count: 0},
  {label: "OK to Charge",   dot: "#1f5a3a", count: 0},
  {label: "Decline",        dot: "#b8442e", count: 0},
  {label: "OK to Charge Clinic", dot: "#5aa845", count: 0},
  {label: "Mochi",          dot: "#8b5cf6", count: 0},
];

const QUICK_TILES = [
  {label: "Patient",     sub: "3 today",      icon: I.Users,     bg: "#1f5a3a"},
  {label: "Rx",          sub: "5 today",      icon: I.Pill,      bg: "#2b6c9b"},
  {label: "Item",        sub: "112,143",      icon: I.Inventory, bg: "#7c3aed"},
  {label: "Prescriber",  sub: "5,351",        icon: I.Users,     bg: "#d97706"},
  {label: "Compound",    sub: "0 pend",       icon: I.Pill,      bg: "#be185d"},
  {label: "Inventory",   sub: "30 low",       icon: I.Alert,     bg: "#c98a14"},
  {label: "Sales",       sub: "0 today",      icon: I.Receipt,   bg: "#1f5a3a"},
  {label: "Claims",      sub: "0 rej",        icon: I.Shield,    bg: "#7c3aed"},
  {label: "System",      sub: "Admin",        icon: I.Settings,  bg: "#0f4c5c"},
];

const RECENT_ACTIVITY = [
  {ref: "725369", patient: "Jessica Anter",        flow: "Waiting Bin → Sold",   tech: "Caleb Dowling", when: "48m"},
  {ref: "725368", patient: "Round8 Walkthrough",   flow: "Waiting Bin → Sold",   tech: "Caleb Dowling", when: "1h"},
  {ref: "725367", patient: "DurTest Walkthrough4", flow: "Waiting Bin → Sold",   tech: "Caleb Dowling", when: "2h", amt: "$5.00"},
  {ref: "725366", patient: "Test Patient",         flow: "Waiting Bin → Sold",   tech: "Caleb Dowling", when: "4h"},
];

const STOCK_ALERTS = [
  {name: "Lipoderm Base",         qty: "0 in stock",  out: true},
  {name: "Lisinopril 10mg Tablets", qty: "0 in stock", out: true},
  {name: "Synthroid 50mcg Tablets", qty: "0 in stock", out: true},
  {name: "Humalog Insulin 100u/mL", qty: "3 in stock", out: false},
  {name: "Ketamine HCl USP",      qty: "18 in stock", out: false},
  {name: "Humalog Insulin 100u/mL", qty: "3 in stock", out: false},
  {name: "Ketamine HCl USP",      qty: "18 in stock", out: false},
];

function Dashboard({ tweaks = {} }) {
  const showStockAlerts = tweaks.showStockAlerts ?? false;
  const showRecentActivity = tweaks.showRecentActivity ?? true;
  const showPhoneSystem = tweaks.showPhoneSystem ?? true;
  const showWorkflowQueue = tweaks.showWorkflowQueue ?? true;
  const tilesPerRow = tweaks.tilesPerRow ?? 3;
  const accent = tweaks.accent ?? '#1f5a3a';

  // dynamic grid columns based on which side rails are visible
  let cols = '';
  if (showWorkflowQueue) cols += '300px ';
  cols += '1fr';
  const showRight = showRecentActivity || showStockAlerts;
  if (showRight) cols += ' 320px';

  return (
    <AppShell active="dashboard" dense>
      <div style={{padding: 18, height: '100%', overflow: 'auto'}}>
        <div className="t-xs" style={{marginBottom: 10}}>Home <span style={{color: 'var(--ink-4)'}}>›</span> Dashboard</div>

        <div style={{display: 'grid', gridTemplateColumns: cols, gap: 14, alignItems: 'start'}}>

          {/* ===== Left: Workflow Queue ===== */}
          {showWorkflowQueue && <div className="card" style={{overflow: 'hidden'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--line)'}}>
              <div className="t-eyebrow">Workflow Queue</div>
              <a href="#" style={{fontSize: 11.5, color: 'var(--bnds-forest)', textDecoration: 'none', fontWeight: 500}}>Open Queue</a>
            </div>
            <div>
              {WORKFLOW_QUEUE.map((w, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px',
                  borderBottom: i < WORKFLOW_QUEUE.length - 1 ? '1px solid var(--line)' : 'none',
                  background: w.hot ? 'rgba(201,138,20,0.06)' : 'transparent',
                  cursor: 'pointer',
                }}>
                  <span style={{width: 6, height: 6, borderRadius: 999, background: w.dot}}/>
                  <span style={{flex: 1, fontSize: 13, color: w.count > 0 ? 'var(--ink)' : 'var(--ink-2)', fontWeight: w.hot ? 500 : 400}}>{w.label}</span>
                  <span className="t-num" style={{
                    fontSize: 13,
                    fontWeight: w.count > 0 ? 600 : 400,
                    color: w.hot ? 'var(--warn)' : w.count > 0 ? 'var(--ink)' : 'var(--ink-4)',
                    minWidth: 18, textAlign: 'right'
                  }}>{w.count}</span>
                  <I.ChevR className="ic-sm" style={{color: 'var(--ink-4)'}}/>
                </div>
              ))}
            </div>
          </div>}

          {/* ===== Center: Quick Access + Phone System ===== */}
          <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            <div className="card">
              <div style={{padding: '12px 16px', borderBottom: '1px solid var(--line)'}}>
                <div className="t-eyebrow">Quick Access</div>
              </div>
              <div style={{padding: 14, display: 'grid', gridTemplateColumns: `repeat(${tilesPerRow}, 1fr)`, gap: 12}}>
                {QUICK_TILES.map((t, i) => {
                  const Ic = t.icon;
                  const variant = tweaks.tileStyle ?? 'minimal';

                  // Style A · Minimal type-led (no icon emblem, just type rhythm)
                  if (variant === 'minimal') {
                    return (
                      <button key={i} style={{
                        padding: '14px 16px',
                        display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start',
                        cursor: 'pointer', background: 'var(--surface)', textAlign: 'left',
                        border: '1px solid var(--line)', borderRadius: 8,
                        transition: 'border-color .12s, background .12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bnds-forest)'; e.currentTarget.style.background = 'var(--paper)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--surface)'; }}>
                        <div className="bnds-serif" style={{fontSize: 17, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em'}}>{t.label}</div>
                        <div style={{fontSize: 12, color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums'}}>{t.sub}</div>
                      </button>
                    );
                  }

                  // Style B · Stroke icon, side-by-side (flat, mono)
                  if (variant === 'mono') {
                    return (
                      <button key={i} style={{
                        padding: '14px', display: 'flex', alignItems: 'center', gap: 12,
                        cursor: 'pointer', background: 'var(--surface)', textAlign: 'left',
                        border: '1px solid var(--line)', borderRadius: 8,
                        transition: 'border-color .12s, background .12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bnds-forest)'; e.currentTarget.style.background = 'var(--paper)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--surface)'; }}>
                        <Ic className="ic-lg" style={{color: 'var(--bnds-forest)'}}/>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{fontSize: 13.5, fontWeight: 600, color: 'var(--ink)'}}>{t.label}</div>
                          <div className="t-xs" style={{marginTop: 1}}>{t.sub}</div>
                        </div>
                        <I.ChevR className="ic-sm" style={{color: 'var(--ink-4)'}}/>
                      </button>
                    );
                  }

                  // Style C · Number-forward (count is the hero)
                  if (variant === 'numeric') {
                    const num = (t.sub.match(/[\d,]+/) || [''])[0];
                    const after = t.sub.replace(num, '').trim();
                    return (
                      <button key={i} style={{
                        padding: '14px 16px',
                        display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start',
                        cursor: 'pointer', background: 'var(--surface)', textAlign: 'left',
                        border: '1px solid var(--line)', borderRadius: 8,
                        transition: 'border-color .12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bnds-forest)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}>
                        <div className="t-eyebrow" style={{fontSize: 10}}>{t.label}</div>
                        <div style={{display: 'flex', alignItems: 'baseline', gap: 6}}>
                          <span className="bnds-serif t-num" style={{fontSize: 24, fontWeight: 500, color: 'var(--bnds-forest)', lineHeight: 1}}>{num || '—'}</span>
                          <span className="t-xs" style={{color: 'var(--ink-3)'}}>{after}</span>
                        </div>
                      </button>
                    );
                  }

                  // Style D · Edge accent (color stripe on the left, otherwise neutral)
                  return (
                    <button key={i} style={{
                      padding: '14px 14px 14px 12px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', background: 'var(--surface)', textAlign: 'left',
                      border: '1px solid var(--line)', borderLeft: `3px solid ${t.bg}`,
                      borderRadius: 8,
                      transition: 'background .12s',
                      fontFamily: 'var(--font-sans)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--paper)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}>
                      <Ic className="ic-lg" style={{color: t.bg}}/>
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontSize: 13, fontWeight: 400, color: 'var(--ink)', fontFamily: 'var(--font-sans)'}}>{t.label}</div>
                        <div style={{fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2, fontFamily: 'var(--font-sans)'}}>{t.sub}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone system */}
            {showPhoneSystem && <div className="card">
              <div style={{padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                  <I.Phone className="ic-sm"/>
                  <div className="t-eyebrow">Phone System</div>
                  <span className="dot dot-ok" style={{marginLeft: 4}}/>
                </div>
                <a href="#" style={{fontSize: 11.5, color: 'var(--bnds-forest)', textDecoration: 'none', fontWeight: 500}}>Full Dashboard →</a>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid var(--line)'}}>
                {[
                  {label: "Active",  n: 0, icon: I.Phone},
                  {label: "On Hold", n: 0, icon: I.Clock},
                  {label: "Today",   n: 0, icon: I.Calendar},
                  {label: "Missed",  n: 0, icon: I.X},
                ].map((s, i) => {
                  const Ic = s.icon;
                  return (
                    <div key={i} style={{padding: 14, textAlign: 'center', borderRight: i < 3 ? '1px solid var(--line)' : 'none'}}>
                      <Ic className="ic-sm" style={{color: 'var(--ink-3)'}}/>
                      <div className="bnds-serif t-num" style={{fontSize: 22, fontWeight: 500, marginTop: 2}}>{s.n}</div>
                      <div className="t-xs" style={{textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10}}>{s.label}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--line)'}}>
                {[{l: "Active Calls", t: "No active calls"}, {l: "On Hold", t: "No callers on hold"}].map((c, i) => (
                  <div key={i} style={{padding: '14px 16px', borderRight: i === 0 ? '1px solid var(--line)' : 'none'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span className="t-eyebrow" style={{fontSize: 10}}>{c.l}</span>
                      <span className="t-num" style={{fontSize: 11, color: 'var(--ink-4)'}}>0</span>
                    </div>
                    <div style={{height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, color: 'var(--ink-4)'}}>
                      {i === 0 ? <I.Phone/> : <I.Clock/>}
                      <span className="t-xs">{c.t}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{padding: '12px 16px', borderBottom: '1px solid var(--line)'}}>
                <div className="t-eyebrow" style={{fontSize: 10, marginBottom: 8}}>Departments</div>
                <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                  {["Pharmacy", "Pharmacist", "Billing", "Shipping", "Voicemail"].map(d => (
                    <span key={d} className="pill pill-leaf"><span className="dot dot-ok"/>{d}</span>
                  ))}
                </div>
              </div>

              <div style={{padding: 12, display: 'flex', gap: 8}}>
                <button className="btn btn-primary" style={{flex: 1, justifyContent: 'center'}}>
                  <I.Phone className="ic-sm"/> Open Call Center
                </button>
                <button className="btn btn-secondary"><I.Clock className="ic-sm"/> History</button>
              </div>
            </div>}
          </div>

          {/* ===== Right: Recent Activity + Stock Alerts ===== */}
          {showRight && <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            {showRecentActivity && <div className="card">
              <div style={{padding: '12px 14px', borderBottom: '1px solid var(--line)'}}>
                <div className="t-eyebrow">Recent Activity</div>
              </div>
              <div>
                {RECENT_ACTIVITY.map((a, i) => (
                  <div key={i} style={{
                    padding: '10px 14px',
                    borderBottom: i < RECENT_ACTIVITY.length - 1 ? '1px solid var(--line)' : 'none',
                  }}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                      <span className="bnds-mono" style={{fontSize: 11, color: 'var(--ink-3)'}}>Ref# {a.ref}</span>
                      <span className="t-xs">{a.when}</span>
                    </div>
                    <div style={{fontSize: 13, fontWeight: 500, marginTop: 2}}>{a.patient}</div>
                    <div className="t-xs" style={{marginTop: 1, display: 'flex', justifyContent: 'space-between'}}>
                      <span>{a.flow} · {a.tech}</span>
                      {a.amt && <span className="t-num" style={{color: 'var(--bnds-forest)', fontWeight: 500}}>{a.amt}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>}

            {showStockAlerts && <div className="card">
              <div style={{padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div className="t-eyebrow">Stock Alerts</div>
                <a href="#" style={{fontSize: 11.5, color: 'var(--bnds-forest)', textDecoration: 'none', fontWeight: 500}}>View All</a>
              </div>
              <div>
                {STOCK_ALERTS.map((s, i) => (
                  <div key={i} style={{
                    padding: '10px 14px',
                    borderBottom: i < STOCK_ALERTS.length - 1 ? '1px solid var(--line)' : 'none',
                    borderLeft: s.out ? '2px solid var(--danger)' : '2px solid transparent',
                  }}>
                    <div style={{fontSize: 13, fontWeight: 500, color: s.out ? 'var(--danger)' : 'var(--ink)'}}>{s.name}</div>
                    <div className="t-xs" style={{marginTop: 1}}>{s.qty}</div>
                  </div>
                ))}
              </div>
            </div>}
          </div>}
        </div>

        {/* Floating + button */}
        <button style={{
          position: 'absolute', bottom: 24, right: 24,
          width: 52, height: 52, borderRadius: '50%', border: 0,
          background: 'var(--bnds-leaf)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 6px 20px rgba(31,90,58,0.30)'
        }}>
          <I.Plus className="ic-lg"/>
        </button>
      </div>
    </AppShell>
  );
}

window.Dashboard = Dashboard;
