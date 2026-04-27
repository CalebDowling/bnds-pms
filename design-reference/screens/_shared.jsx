/* eslint-disable */
// ============================================================
// Shared bits used across landing pages
// ============================================================

function KPI({label, value, hint, tone, trend}) {
  const colors = {
    ok: 'var(--ok)', warn: 'var(--warn)', danger: 'var(--danger)',
    info: 'var(--info)', forest: 'var(--bnds-forest)', ink: 'var(--ink)',
  };
  const c = colors[tone] || 'var(--ink)';
  return (
    <div className="card" style={{padding: 16, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0}}>
      <div className="t-eyebrow">{label}</div>
      <div className="bnds-serif t-num" style={{fontSize: 28, fontWeight: 500, color: c, lineHeight: 1.05, marginTop: 2}}>{value}</div>
      {hint && <div className="t-xs" style={{color: 'var(--ink-3)'}}>{hint}</div>}
      {trend && (
        <div className="t-xs" style={{display: 'flex', alignItems: 'center', gap: 4, color: trend.dir === 'up' ? 'var(--ok)' : 'var(--danger)', marginTop: 2}}>
          {trend.dir === 'up' ? <I.TrendUp className="ic-sm"/> : <I.TrendDown className="ic-sm"/>} {trend.label}
        </div>
      )}
    </div>
  );
}

function Toolbar({tabs, active, onChange, right, search, searchPlaceholder, filters}) {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap'}}>
      {tabs && (
        <div style={{display: 'flex', gap: 2, padding: 3, background: 'var(--paper-2)', borderRadius: 8, border: '1px solid var(--line)'}}>
          {tabs.map(t => {
            const isActive = (active || tabs[0].id) === t.id;
            return (
              <button key={t.id} onClick={() => onChange && onChange(t.id)}
                style={{
                  padding: '6px 12px', fontSize: 12.5, fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  boxShadow: isActive ? 'var(--shadow-1)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'inherit',
                }}>
                {t.label}
                {t.count != null && (
                  <span style={{fontSize: 11, padding: '0 5px', borderRadius: 999, background: isActive ? 'var(--paper-2)' : 'transparent', color: 'var(--ink-3)', fontWeight: 500}}>{t.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {search != null && (
        <div style={{display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 6, minWidth: 220, flex: '0 1 320px'}}>
          <I.Search className="ic-sm" style={{color: 'var(--ink-3)'}}/>
          <input value={search} placeholder={searchPlaceholder || 'Search…'} readOnly
            style={{border: 0, outline: 0, background: 'transparent', flex: 1, fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)'}}/>
        </div>
      )}
      {filters && filters.map((f, i) => (
        <button key={i} className="btn btn-secondary btn-sm" style={{borderStyle: f.active ? 'solid' : 'dashed'}}>
          {f.icon ? <f.icon className="ic-sm"/> : <I.Filter className="ic-sm"/>}
          {f.label}
          {f.value && <span style={{color: 'var(--ink-3)', marginLeft: 2}}>· {f.value}</span>}
        </button>
      ))}
      <div style={{flex: 1}}/>
      {right}
    </div>
  );
}

// Status pill helper
function StatusPill({tone, label, dot = true}) {
  const cls = {ok: 'pill-leaf', warn: 'pill-warn', danger: 'pill-danger', info: 'pill-info', mute: 'pill-mute'}[tone] || '';
  const dotCls = {ok: 'dot-ok', warn: 'dot-warn', danger: 'dot-danger', info: 'dot-info'}[tone];
  return <span className={`pill ${cls}`}>{dot && dotCls && <span className={`dot ${dotCls}`}/>}{label}</span>;
}

// Avatar (initials, deterministic color)
function Avatar({name, size = 28}) {
  const initials = (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  // deterministic hue
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: `hsl(${h}, 28%, 88%)`, color: `hsl(${h}, 32%, 28%)`,
      fontSize: size * 0.42, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{initials}</div>
  );
}

// Empty state
function Empty({icon: Ic = I.Inventory, title, body}) {
  return (
    <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)'}}>
      <Ic className="ic-lg" style={{color: 'var(--ink-4)'}}/>
      <div style={{fontWeight: 500, color: 'var(--ink-2)', marginTop: 10}}>{title}</div>
      {body && <div className="t-xs" style={{marginTop: 4}}>{body}</div>}
    </div>
  );
}

// Tiny sparkline (svg) for KPIs
function Spark({values, color = 'var(--bnds-forest)', w = 80, h = 24}) {
  if (!values || !values.length) return null;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / span) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{display: 'block'}}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

Object.assign(window, { KPI, Toolbar, StatusPill, Avatar, Empty, Spark });
