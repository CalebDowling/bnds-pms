export default function RightRail() {
  const recentActivity = [
    { rxNum: "714367", patient: "Destini Broussard", copay: "$250.00", profit: "$248.22", time: "2:30 PM" },
    { rxNum: "714360", patient: "Kayley Mancuso", copay: "$350.00", profit: "$342.44", time: "2:30 PM" },
    { rxNum: "714355", patient: "Mary Johnson", copay: "$45.00", profit: "$38.12", time: "1:15 PM" },
  ];

  const lowStock = [
    { name: "Progesterone USP", remaining: 2, reorderAt: 10 },
    { name: "Testosterone Cypionate", remaining: 4, reorderAt: 8 },
  ];

  return (
    <div className="w-[280px] flex-shrink-0">
      {/* Recent Activity */}
      <div className="bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] mb-4 overflow-hidden">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] px-4 pt-3.5 pb-2">
          Recent Activity
          <span className="text-[10px] bg-[var(--green-100)] text-[var(--green-700)] px-1.5 py-px rounded-lg font-semibold">{recentActivity.length}</span>
        </div>
        {recentActivity.map((item) => (
          <div key={item.rxNum} className="px-4 py-2.5 border-t border-[var(--border-light)] cursor-pointer hover:bg-[var(--green-50)] transition-colors">
            <div className="text-[11px] font-semibold text-[var(--green-700)]">Rx# {item.rxNum}</div>
            <div className="text-[13px] font-semibold text-[var(--text-primary)]">{item.patient}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Copay: {item.copay} · Profit: {item.profit}<br/>{item.time}
            </div>
          </div>
        ))}
      </div>

      {/* Low Stock */}
      <div className="bg-[var(--card-bg)] rounded-[10px] border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)] px-4 pt-3.5 pb-2">
          Low Stock
          <span className="text-[10px] bg-[var(--green-100)] text-[var(--green-700)] px-1.5 py-px rounded-lg font-semibold">{lowStock.length}</span>
        </div>
        {lowStock.map((item) => (
          <div key={item.name} className="px-4 py-2.5 border-t border-[var(--border-light)] border-l-[3px] border-l-[var(--amber-500)] cursor-pointer hover:bg-[var(--amber-100)] transition-colors">
            <div className="text-[13px] font-semibold text-[var(--amber-500)]">{item.name}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{item.remaining} remaining · Reorder at {item.reorderAt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
