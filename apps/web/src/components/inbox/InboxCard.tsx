import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Inbox } from "@/hooks/useInboxes";

interface InboxCardProps {
  inbox: Inbox;
  onDelete: () => void;
}

export function InboxCard({ inbox, onDelete }: InboxCardProps) {
  let eventBadge = null;
  if (inbox.eventCount && inbox.eventCount > 0) {
    eventBadge = <Badge variant="secondary">{inbox.eventCount} events</Badge>;
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              <Link to={`/inbox/${inbox.id}`} className="hover:underline">
                {inbox.name}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1 text-xs font-mono break-all">
              {inbox.webhookUrl}
            </CardDescription>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Inbox</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this inbox. This will also delete all associated events.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {eventBadge}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/inbox/${inbox.id}`}>
              View Events
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
