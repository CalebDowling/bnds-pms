"use client";

interface PageCardProps {
  children: React.ReactNode;
  accent?: string;
  className?: string;
}

export function PageCard({ children, accent = "#40721d", className = "" }: PageCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 card-gradient-border card-hover ${className}`}
      style={{ "--card-accent": accent } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
