import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { InboxListPage } from "@/pages/InboxListPage";
import { InboxDetailPage } from "@/pages/InboxDetailPage";
import { EventDetailPage } from "@/pages/EventDetailPage";
import { SettingsPage } from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<InboxListPage />} />
                <Route path="/inbox/:inboxId" element={<InboxDetailPage />} />
                <Route path="/inbox/:inboxId/event/:eventId" element={<EventDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
