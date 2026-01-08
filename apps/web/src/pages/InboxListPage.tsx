import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Inbox as InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { useInboxes, useCreateInbox, type Inbox } from "@/hooks/useInboxes";
import { CreateInboxDialog } from "@/components/inbox/CreateInboxDialog";
import { InboxCard } from "@/components/inbox/InboxCard";
import { useDeleteInbox } from "@/hooks/useInboxes";
import { Skeleton } from "@/components/ui/skeleton";

export function InboxListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading } = useInboxes();
  const createInbox = useCreateInbox();
  const deleteInbox = useDeleteInbox();
  
  let inboxes: Inbox[] = [];
  if (data && data.inboxes) {
    inboxes = data.inboxes;
  }
  const showCreateDialog = searchParams.get("create") === "true";

  const handleCreateInbox = async (name: string) => {
    try {
      const result = await createInbox.mutateAsync({ name });
      setSearchParams({});
      navigate(`/inbox/${result.inbox.id}`);
    } catch (error) {
      console.error("Failed to create inbox:", error);
    }
  };

  const handleOpenCreateDialog = () => {
    setSearchParams({ create: "true" });
  };

  const handleCloseCreateDialog = () => {
    setSearchParams({});
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  let contentBlock = null;
  if (inboxes.length === 0) {
    contentBlock = (
      <EmptyState
        icon={InboxIcon}
        title="No inboxes yet"
        description="Create your first inbox to start capturing webhook events"
        action={
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Inbox
          </Button>
        }
      />
    );
  } else {
    contentBlock = (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {inboxes.map((inbox) => (
          <InboxCard
            key={inbox.id}
            inbox={inbox}
            onDelete={() => deleteInbox.mutate(inbox.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inboxes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your webhook inboxes and captured events
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Create Inbox
        </Button>
      </div>

      {contentBlock}

      <CreateInboxDialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseCreateDialog();
          }
        }}
        onSubmit={handleCreateInbox}
      />
    </div>
  );
}
