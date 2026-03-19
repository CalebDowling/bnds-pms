function getRelativeTime(minutesAgo: number): { text: string; isRecent: boolean } {
  if (minutesAgo < 5) return { text: `${minutesAgo}m ago`, isRecent: true };
  if (minutesAgo < 60) return { text: `${minutesAgo}m ago`, isRecent: false };
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return { text: `${hoursAgo}h ago`, isRecent: false };
  const daysAgo = Math.floor(hoursAgo / 24);
  return { text: `${daysAgo}d ago`, isRecent: false };
}

function PulsingDot() {
  return (
    <span className="inline-block w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
  );
}

function VerifiedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function RightRail() {
  const recentActivity = [
    { rxNum: "714367", patient: "Destini Broussard", copay: "$250.00", profit: "$248.22", minutesAgo: 2 },
    { rxNum: "714360", patient: "Kayley Mancuso", copay: "$350.00", profit: "$342.44", minutesAgo: 12 },
    { rxNum: "714355", patient: "Mary Johnson", copay: "$45.00", profit: "$38.12", minutesAgo: 75 },
  ];

  const lowStock = [
    { name: "Progesterone USP", remaining: 2, reorderAt: 10 },
    { name: "Testosterone Cypionate", remaining: 4, reorderAt: 8 },
  ];

  return (
    <div>
      {/* Recent Activity */}
      <div className="card-gradient-border bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] mb-4 overflow-hidden" style={{ "--card-accent": "#10b981" } as React.CSSProperties}>
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500 px-4 pt-3.5 pb-2">
          Recent Activity
          <span className="text-[10px] bg-[var(--green-100)] text-[var(--green-700)] px-1.5 py-px rounded font-semibold">{recentActivity.length}</span>
        </div>
        <div className="divide-y divide-[var(--border-light)]">
          {recentActivity.map((item) => {
            const timeInfo = getRelativeTime(item.minutesAgo);
            return (
              <div
                key={item.rxNum}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="activity-icon" style={{
                      background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)"
                    }}>
                      <VerifiedIcon />
                    </div>
                    <div className="text-[11px] font-semibold text-[var(--green-700)] font-tabular">Rx# {item.rxNum}</div>
                  </div>
                  {timeInfo.isRecent && <PulsingDot />}
                </div>
                <div className="text-[13px] font-semibold text-[var(--text-primary)] mb-1.5">{item.patient}</div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>
                    <span className="font-tabular">{item.copay}</span> · <span className="font-tabular text-[var(--green-700)]">{item.profit}</span>
                  </span>
                  <span className="text-[10px] text-gray-400">{timeInfo.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Low Stock */}
      <div className="bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-500 px-4 pt-3.5 pb-2">
          Low Stock
          <span className="text-[10px] bg-[var(--amber-100)] text-[var(--amber-700)] px-1.5 py-px rounded font-semibold">{lowStock.length}</span>
        </div>
        <div className="divide-y divide-[var(--border-light)]">
          {lowStock.map((item) => (
            <div
              key={item.name}
              className="px-4 py-3 border-l-[3px] border-l-[var(--amber-500)] cursor-pointer hover:bg-gray-50 transition-colors group"
            >
              <div className="text-[13px] font-semibold text-[var(--amber-600)] mb-1.5">{item.name}</div>
              <div className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--amber-700)] transition-colors">
                <span className="font-tabular">{item.remaining}</span> remaining · Reorder at <span className="font-tabular">{item.reorderAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
