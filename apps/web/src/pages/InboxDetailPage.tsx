import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useInboxes, useDeleteInbox } from "@/hooks/useInboxes";
import { useEvents } from "@/hooks/useEvents";
import { useToast } from "@/hooks/use-toast";
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
import { EventsTable } from "@/components/events/EventsTable";
import { Skeleton } from "@/components/ui/skeleton";
import type { WebhookEvent } from "@/types/webhook";

export function InboxDetailPage() {
  const { inboxId } = useParams<{ inboxId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: inboxesData } = useInboxes();
  const { data: eventsData, isLoading: eventsLoading } = useEvents(inboxId);
  const deleteInbox = useDeleteInbox();

  let inbox = null;
  if (inboxesData && inboxesData.inboxes) {
    inbox = inboxesData.inboxes.find((i) => i.id === inboxId);
    if (!inbox) {
      inbox = null;
    }
  }

  let events: WebhookEvent[] = [];
  if (eventsData && eventsData.events) {
    events = eventsData.events;
  }

  const handleCopyUrl = async () => {
    if (inbox && inbox.webhookUrl) {
      await navigator.clipboard.writeText(inbox.webhookUrl);
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard",
      });
    }
  };

  const handleDelete = async () => {
    if (inboxId) {
      try {
        await deleteInbox.mutateAsync(inboxId);
        navigate("/");
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete inbox",
          variant: "destructive",
        });
      }
    }
  };

  if (!inbox) {
    return (
      <div className="animate-fade-up">
        <EmptyState
          icon={Zap}
          title="Inbox not found"
          description="The inbox you're looking for doesn't exist or has been deleted"
          action={
            <Button asChild>
              <Link to="/">Go Back</Link>
            </Button>
          }
        />
      </div>
    );
  }

  let eventsCountLabel = "events";
  if (events.length === 1) {
    eventsCountLabel = "event";
  }

  let eventsContentBlock = null;
  if (eventsLoading) {
    eventsContentBlock = (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  } else if (events.length === 0) {
    eventsContentBlock = (
      <EmptyState
        icon={Zap}
        title="No events yet"
        description="Send a webhook to this inbox to see events appear here"
        action={null}
      />
    );
  } else {
    eventsContentBlock = <EventsTable events={events} inboxId={inboxId as string} />;
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{inbox.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Webhook endpoint for receiving events
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyUrl}>
            <Copy className="mr-2 h-4 w-4" />
            Copy URL
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
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
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Webhook URL</span>
            <Badge variant="outline" className="font-mono text-xs">
              {events.length} {eventsCountLabel}
            </Badge>
          </div>
          <code className="block text-sm bg-muted p-2 rounded break-all">
            {inbox.webhookUrl}
          </code>
        </div>
      </div>

      {eventsContentBlock}
    </div>
  );
}
