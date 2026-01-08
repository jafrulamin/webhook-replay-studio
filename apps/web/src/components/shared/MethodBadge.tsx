import type { HttpMethod } from "@/types/webhook";
import { cn } from "@/lib/utils";

interface MethodBadgeProps {
  method: HttpMethod;
  className: string;
}

const methodStyles: Record<HttpMethod, string> = {
  GET: "method-get",
  POST: "method-post",
  PUT: "method-put",
  PATCH: "method-patch",
  DELETE: "method-delete",
  OPTIONS: "method-options",
  HEAD: "method-head",
};

export function MethodBadge({ method, className = "" }: MethodBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide",
        methodStyles[method],
        className
      )}
    >
      {method}
    </span>
  );
}
