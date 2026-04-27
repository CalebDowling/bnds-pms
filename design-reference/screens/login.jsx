/* eslint-disable */
// ============================================================
// LOGIN VARIATIONS — three takes on the sign-in moment
// ============================================================

// ---------- Variation A: Split panel, heritage-warm ----------
function LoginSplit() {
  const [pw, setPw] = React.useState("");
  return (
    <div className="bnds" style={{display: 'grid', gridTemplateColumns: '1.1fr 1fr', height: 720, background: 'var(--paper)'}}>
      {/* Brand panel */}
      <div style={{background: 'var(--paper-2)', color: 'var(--ink)', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', borderRight: '1px solid var(--line)'}}>
        <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 10%, rgba(90,168,69,0.10), transparent 55%), radial-gradient(circle at 15% 90%, rgba(31,90,58,0.06), transparent 50%)'}} />
        <div style={{position: 'relative', zIndex: 1}}>
          <img src="assets/logo.webp" style={{height: 64}} />
        </div>
        <div style={{position: 'relative', zIndex: 1}}>
          <div className="t-eyebrow">Pharmacy Management System</div>
          <h1 className="bnds-serif" style={{fontSize: 44, lineHeight: 1.05, marginTop: 14, fontWeight: 500, color: 'var(--bnds-forest-900)'}}>
            A century of care,<br/>now in your hands.
          </h1>
          <p style={{marginTop: 18, color: 'var(--ink-2)', fontSize: 15, maxWidth: 380, lineHeight: 1.55}}>
            Sign in to manage prescriptions, patients, and inventory across all Boudreaux's locations.
          </p>
        </div>
        <div style={{position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 20, color: 'var(--ink-3)', fontSize: 12}}>
          <span>Est. 1923</span>
          <span style={{width: 3, height: 3, background: 'var(--ink-4)', borderRadius: 999}} />
          <span>HIPAA compliant</span>
          <span style={{width: 3, height: 3, background: 'var(--ink-4)', borderRadius: 999}} />
          <span>v4.2.1</span>
        </div>
      </div>
      {/* Form panel */}
      <div style={{padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 460}}>
        <div className="t-eyebrow">Sign in</div>
        <h2 className="bnds-serif" style={{fontSize: 32, marginTop: 8, fontWeight: 500}}>Welcome back.</h2>
        <p className="t-body" style={{color: 'var(--ink-3)', marginTop: 4}}>Enter your credentials to continue.</p>

        <div style={{marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14}}>
          <div>
            <label className="label">Email address</label>
            <input className="input" type="email" defaultValue="m.boudreaux@bndsrx.com" />
          </div>
          <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
              <label className="label">Password</label>
              <a href="#" style={{fontSize: 12, color: 'var(--bnds-forest)', textDecoration: 'none'}}>Forgot?</a>
            </div>
            <input className="input" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" />
          </div>
          <label style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', marginTop: 4}}>
            <input type="checkbox" /> Keep me signed in on this workstation
          </label>
          <button className="btn btn-primary btn-lg" style={{marginTop: 8, justifyContent: 'center'}}>
            Sign in <I.ChevR/>
          </button>
        </div>

        <div style={{marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-3)', fontSize: 12}}>
          <I.Shield className="ic-sm"/>
          Protected workstation · SSO available for staff
        </div>
      </div>
    </div>
  );
}

// ---------- Variation B: Centered card, soft & friendly ----------
function LoginCentered() {
  return (
    <div className="bnds" style={{height: 720, background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'}}>
      {/* decorative botanical wash */}
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 20%, rgba(90,168,69,0.08), transparent 50%), radial-gradient(circle at 85% 80%, rgba(31,90,58,0.06), transparent 55%)'}}/>
      <div style={{position: 'relative', width: 420}}>
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24}}>
          <img src="assets/logo.webp" style={{height: 64}} />
        </div>
        <div className="card" style={{padding: 32, boxShadow: 'var(--shadow-3)'}}>
          <h2 className="bnds-serif" style={{fontSize: 24, fontWeight: 500, textAlign: 'center'}}>Sign in to your account</h2>
          <p className="t-small" style={{color: 'var(--ink-3)', textAlign: 'center', marginTop: 4}}>Pharmacy Management System</p>
          <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24}}>
            <div>
              <label className="label">Email</label>
              <input className="input" placeholder="you@bndsrx.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="••••••••" />
            </div>
            <button className="btn btn-primary btn-lg" style={{justifyContent: 'center', marginTop: 6}}>Sign in</button>
            <a href="#" style={{textAlign: 'center', fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4, textDecoration: 'none'}}>Forgot password?</a>
          </div>
        </div>
        <p className="t-xs" style={{textAlign: 'center', marginTop: 18}}>
          © 2026 Boudreaux's New Drug Store · Est. 1923
        </p>
      </div>
    </div>
  );
}

// ---------- Variation C: Workstation-first (PIN + recent users) ----------
function LoginWorkstation() {
  const users = [
    {name: "Marie Boudreaux", role: "Pharmacist", initials: "MB", color: "#1f5a3a"},
    {name: "Dwayne Hebert",   role: "Pharm Tech",  initials: "DH", color: "#5aa845"},
    {name: "Aisha Reed",      role: "Pharmacist", initials: "AR", color: "#2b6c9b"},
    {name: "Tomás Vega",      role: "Pharm Tech",  initials: "TV", color: "#c98a14"},
  ];
  const [pin, setPin] = React.useState("");
  const [active, setActive] = React.useState(0);
  return (
    <div className="bnds" style={{height: 720, background: 'var(--paper)', padding: 40, display: 'flex', flexDirection: 'column'}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <img src="assets/logo.webp" style={{height: 40}} />
        <div className="t-xs" style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span className="dot dot-ok"/> Workstation 04 · Front counter
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, marginTop: 32, flex: 1}}>
        {/* User chooser */}
        <div>
          <div className="t-eyebrow">Recent users</div>
          <h2 className="bnds-serif" style={{fontSize: 26, fontWeight: 500, marginTop: 6}}>Who's signing in?</h2>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 20}}>
            {users.map((u, i) => (
              <button key={u.name} onClick={()=>setActive(i)}
                className="card"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: 14,
                  border: active===i ? '1px solid var(--bnds-forest)' : '1px solid var(--line)',
                  boxShadow: active===i ? '0 0 0 3px rgba(31,90,58,0.10)' : 'var(--shadow-1)',
                  background: 'white', cursor: 'pointer', textAlign: 'left'
                }}>
                <div style={{width: 40, height: 40, borderRadius: '50%', background: u.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14}}>{u.initials}</div>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontWeight: 500, fontSize: 14}}>{u.name}</div>
                  <div className="t-xs">{u.role}</div>
                </div>
                {active===i && <I.Check style={{color: 'var(--bnds-forest)'}}/>}
              </button>
            ))}
            <button className="card" style={{display: 'flex', alignItems: 'center', gap: 14, padding: 14, color: 'var(--ink-3)', cursor: 'pointer', justifyContent: 'center', borderStyle: 'dashed'}}>
              <I.Plus/> Different user
            </button>
          </div>
        </div>

        {/* PIN pad */}
        <div className="card card-pad" style={{padding: 24}}>
          <div className="t-eyebrow">Enter PIN</div>
          <div className="bnds-serif" style={{fontSize: 18, fontWeight: 500, marginTop: 4}}>{users[active].name}</div>
          <div style={{display: 'flex', gap: 8, marginTop: 18, justifyContent: 'center'}}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{width: 32, height: 40, borderRadius: 6, background: i<pin.length ? 'var(--bnds-forest)' : 'var(--paper-2)', border: '1px solid var(--line)'}}/>
            ))}
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 18}}>
            {["1","2","3","4","5","6","7","8","9","",0,"⌫"].map((n, i) => n === "" ? <div key={i}/> : (
              <button key={i} onClick={()=>{
                if (n === "⌫") setPin(p => p.slice(0,-1));
                else if (pin.length < 6) setPin(p => p + n);
              }} className="btn btn-secondary" style={{justifyContent: 'center', fontSize: 17, padding: '14px 0', fontFamily: 'var(--font-mono)'}}>{n}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-lg" style={{width: '100%', justifyContent: 'center', marginTop: 14}}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

window.LoginSplit = LoginSplit;
window.LoginCentered = LoginCentered;
window.LoginWorkstation = LoginWorkstation;
