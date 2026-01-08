import { Link, useLocation } from "react-router-dom";
import { Inbox, Plus, Webhook, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useInboxes, type Inbox as InboxType } from "@/hooks/useInboxes";

export function AppSidebar() {
  const location = useLocation();
  const { data } = useInboxes();

  let inboxes: InboxType[] = [];
  if (data && data.inboxes) {
    inboxes = data.inboxes;
  }

  let emptyMessage = null;
  if (inboxes.length === 0) {
    emptyMessage = (
      <div className="px-2 py-4 text-xs text-muted-foreground text-center group-data-[collapsible=icon]:hidden">
        No inboxes yet
      </div>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/" className="flex items-center gap-2 px-2 py-2 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Webhook className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Webhook Replay</span>
            <span className="text-xs text-muted-foreground">Studio</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/'}
                >
                  <Link to="/">
                    <Inbox className="h-4 w-4" />
                    <span>All Inboxes</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Inboxes</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 group-data-[collapsible=icon]:hidden"
              asChild
            >
              <Link to="/create-inbox">
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {inboxes.map((inbox: InboxType) => {
                let eventBadge = null;
                if (inbox.eventCount && inbox.eventCount > 0) {
                  eventBadge = (
                    <Badge 
                      variant="secondary" 
                      className="ml-auto h-5 min-w-5 px-1.5 text-xs group-data-[collapsible=icon]:hidden"
                    >
                      {inbox.eventCount}
                    </Badge>
                  );
                }
                return (
                  <SidebarMenuItem key={inbox.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === `/inbox/${inbox.id}`}
                    >
                      <Link to={`/inbox/${inbox.id}`}>
                        <Inbox className="h-4 w-4" />
                        <span className="truncate">{inbox.name}</span>
                        {eventBadge}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {emptyMessage}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
