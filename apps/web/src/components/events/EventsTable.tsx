import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MethodBadge } from "@/components/shared/MethodBadge";
import { formatDate } from "@/lib/dateUtils";
import type { WebhookEvent } from "@/types/webhook";

interface EventsTableProps {
  events: WebhookEvent[];
  inboxId: string;
}

export function EventsTable({ events, inboxId }: EventsTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Path</TableHead>
            <TableHead>Content Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            let contentTypeDisplay = "N/A";
            if (event.contentType) {
              contentTypeDisplay = event.contentType;
            }
            return (
              <TableRow key={event.id}>
                <TableCell className="font-mono text-xs">
                  {formatDate(event.timestamp, "MMM d, HH:mm:ss")}
                </TableCell>
                <TableCell>
                  <MethodBadge method={event.method} className="" />
                </TableCell>
                <TableCell className="font-mono text-xs">{event.path}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {contentTypeDisplay}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {event.size} B
                </TableCell>
                <TableCell>
                  <Link to={`/inbox/${inboxId}/event/${event.id}`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                      View
                    </Badge>
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
