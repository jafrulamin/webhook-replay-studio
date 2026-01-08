import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: React.ComponentType<{ className: string }>;
  title: string;
  description: string;
  action: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action = null }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}
