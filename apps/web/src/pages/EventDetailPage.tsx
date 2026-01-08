import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Copy, Shield, Play, Eye, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MethodBadge } from "@/components/shared/MethodBadge";
import { JsonViewer } from "@/components/shared/JsonViewer";
import { useEvent } from "@/hooks/useEvents";
import { useSafeShare } from "@/hooks/useSafeShare";
import { useMutatePreview } from "@/hooks/useMutatePreview";
import { useReplayJobs, useReplayJob, useCreateReplayJob, useRunReplayJob, useCompareReplayJob } from "@/hooks/useReplayJobs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dateUtils";
import { useToast } from "@/hooks/use-toast";

export function EventDetailPage() {
  const { inboxId, eventId } = useParams<{ inboxId: string; eventId: string }>();
  const { data, isLoading } = useEvent(eventId);
  const { toast } = useToast();

  let event = null;
  if (data) {
    event = data.event;
  }

  const [safeShareMode, setSafeShareMode] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [headerOverridesText, setHeaderOverridesText] = useState("[]");
  const [jsonOverridesText, setJsonOverridesText] = useState("[]");
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [compareData, setCompareData] = useState<any>(null);
  const [destinationUrl, setDestinationUrl] = useState("");
  const [retryMax, setRetryMax] = useState("3");

  let safeShareEventId: string | undefined = undefined;
  if (safeShareMode && eventId) {
    safeShareEventId = eventId;
  }
  const safeShareQuery = useSafeShare(safeShareEventId);
  const mutatePreview = useMutatePreview();
  const replayJobsQuery = useReplayJobs(eventId);
  const replayJobQuery = useReplayJob(selectedJobId);
  const createReplayJob = useCreateReplayJob();
  const runReplayJob = useRunReplayJob();
  let compareJobId: string | undefined = undefined;
  if (compareData && selectedJobId) {
    compareJobId = selectedJobId;
  }
  const compareQuery = useCompareReplayJob(compareJobId);

  useEffect(() => {
    setSafeShareMode(false);
    setCopyStatus("");
    setPreviewData(null);
    setSelectedJobId("");
    setCompareData(null);
    setHeaderOverridesText("[]");
    setJsonOverridesText("[]");
    setDestinationUrl("");
    setRetryMax("3");
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/inbox/${inboxId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Event not found</p>
        </div>
      </div>
    );
  }

  let parsedBody: any = null;
  let isJson = false;
  if (event.body) {
    try {
      parsedBody = JSON.parse(event.body);
      isJson = true;
    } catch {
      isJson = false;
    }
  }

  let headers = {};
  if (event.headers) {
    headers = event.headers;
  }

  let queryParams = {};
  if (event.queryParams) {
    queryParams = event.queryParams;
  }

  let contentTypeDisplay = "N/A";
  if (event.contentType) {
    contentTypeDisplay = event.contentType;
  }

  let bodyDisplay = null;
  if (isJson) {
    bodyDisplay = <JsonViewer data={parsedBody} initialExpanded={true} />;
  } else {
    let bodyText = "(empty)";
    if (event.body) {
      bodyText = event.body;
    }
    bodyDisplay = (
      <pre className="bg-code-background p-4 rounded-lg overflow-auto font-mono text-sm">
        {bodyText}
      </pre>
    );
  }

  const handleEnterSafeShare = () => {
    setSafeShareMode(true);
  };

  const handleExitSafeShare = () => {
    setSafeShareMode(false);
    setCopyStatus("");
  };

  const handleCopySanitizedCurl = async () => {
    if (safeShareQuery.data && safeShareQuery.data.safe) {
      await navigator.clipboard.writeText(safeShareQuery.data.safe.curl);
      setCopyStatus("Copied to clipboard");
      toast({
        title: "Copied",
        description: "Sanitized cURL command copied to clipboard",
      });
    }
  };

  const handlePreviewChanges = async () => {
    let headerOverrides: any[] = [];
    let jsonOverrides: any[] = [];

    try {
      headerOverrides = JSON.parse(headerOverridesText);
      if (!Array.isArray(headerOverrides)) {
        toast({
          title: "Error",
          description: "Header overrides must be an array",
          variant: "destructive",
        });
        return;
      }
    } catch {
      toast({
        title: "Error",
        description: "Invalid JSON in header overrides",
        variant: "destructive",
      });
      return;
    }

    try {
      jsonOverrides = JSON.parse(jsonOverridesText);
      if (!Array.isArray(jsonOverrides)) {
        toast({
          title: "Error",
          description: "JSON overrides must be an array",
          variant: "destructive",
        });
        return;
      }
    } catch {
      toast({
        title: "Error",
        description: "Invalid JSON in JSON overrides",
        variant: "destructive",
      });
      return;
    }

    if (!eventId) {
      return;
    }

    try {
      const result = await mutatePreview.mutateAsync({
        eventId: eventId,
        data: {
          headerOverrides: headerOverrides,
          jsonOverrides: jsonOverrides,
        },
      });
      setPreviewData(result);
    } catch (error: any) {
      let errorMsg = "Failed to preview changes";
      if (error && error.message) {
        errorMsg = error.message;
      }
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleCreateReplayJob = async () => {
    if (!eventId) {
      return;
    }

    let headerOverrides: any[] = [];
    let jsonOverrides: any[] = [];

    try {
      headerOverrides = JSON.parse(headerOverridesText);
      if (!Array.isArray(headerOverrides)) {
        toast({
          title: "Error",
          description: "Header overrides must be an array",
          variant: "destructive",
        });
        return;
      }
    } catch {
      toast({
        title: "Error",
        description: "Invalid JSON in header overrides",
        variant: "destructive",
      });
      return;
    }

    try {
      jsonOverrides = JSON.parse(jsonOverridesText);
      if (!Array.isArray(jsonOverrides)) {
        toast({
          title: "Error",
          description: "JSON overrides must be an array",
          variant: "destructive",
        });
        return;
      }
    } catch {
      toast({
        title: "Error",
        description: "Invalid JSON in JSON overrides",
        variant: "destructive",
      });
      return;
    }

    let retryMaxNum = 3;
    try {
      retryMaxNum = parseInt(retryMax, 10);
      if (isNaN(retryMaxNum) || retryMaxNum < 1) {
        retryMaxNum = 3;
      }
    } catch {
      retryMaxNum = 3;
    }

    if (!destinationUrl || destinationUrl.length === 0) {
      toast({
        title: "Error",
        description: "Destination URL is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await createReplayJob.mutateAsync({
        eventId: eventId,
        data: {
          destinationUrl: destinationUrl,
          headerOverrides: headerOverrides,
          jsonOverrides: jsonOverrides,
          retryMax: retryMaxNum,
        },
      });
      toast({
        title: "Success",
        description: "Replay job created",
      });
      setDestinationUrl("");
    } catch (error: any) {
      let errorMsg = "Failed to create replay job";
      if (error && error.message) {
        errorMsg = error.message;
      }
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleRunJob = async (jobId: string) => {
    try {
      await runReplayJob.mutateAsync(jobId);
      toast({
        title: "Success",
        description: "Job started",
      });
    } catch (error: any) {
      let errorMsg = "Failed to run job";
      if (error && error.message) {
        errorMsg = error.message;
      }
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleViewJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setCompareData(null);
  };

  const handleCompare = () => {
    setCompareData(true);
  };

  let safeShareContent = null;
  if (safeShareMode) {
    if (safeShareQuery.isLoading) {
      safeShareContent = <Skeleton className="h-32 w-full" />;
    } else if (safeShareQuery.data && safeShareQuery.data.safe) {
      const safe = safeShareQuery.data.safe;
      let safeBodyDisplay = null;
      if (safe.body.isJson) {
        safeBodyDisplay = <JsonViewer data={safe.body.json} initialExpanded={true} />;
      } else {
        safeBodyDisplay = (
          <pre className="bg-code-background p-4 rounded-lg overflow-auto font-mono text-sm">
            {safe.body.raw}
          </pre>
        );
      }
      let copyStatusDisplay = null;
      if (copyStatus) {
        copyStatusDisplay = <p className="text-xs text-muted-foreground mt-1">{copyStatus}</p>;
      }
      safeShareContent = (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Sanitized Headers</div>
            <JsonViewer data={safe.headers} initialExpanded={true} />
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Sanitized Body</div>
            {safeBodyDisplay}
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Sanitized cURL</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted p-2 rounded text-xs overflow-auto">
                {safe.curl}
              </code>
              <Button size="sm" onClick={handleCopySanitizedCurl}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
            {copyStatusDisplay}
          </div>
        </div>
      );
    } else {
      safeShareContent = <p className="text-muted-foreground">Failed to load safe share data</p>;
    }
  }

  let previewContent = null;
  if (previewData) {
    let previewBodyDisplay = null;
    if (previewData.preview.body.isJson) {
      previewBodyDisplay = <JsonViewer data={previewData.preview.body.json} initialExpanded={true} />;
    } else {
      previewBodyDisplay = (
        <pre className="bg-code-background p-4 rounded-lg overflow-auto font-mono text-sm">
          {previewData.preview.body.raw}
        </pre>
      );
    }
    previewContent = (
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium mb-2">Diff Summary</div>
          <JsonViewer data={previewData.diff} initialExpanded={true} />
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Preview Headers</div>
          <JsonViewer data={previewData.preview.headers} initialExpanded={true} />
        </div>
        <div>
          <div className="text-sm font-medium mb-2">Preview Body</div>
          {previewBodyDisplay}
        </div>
      </div>
    );
  }

  let jobsList = null;
  if (replayJobsQuery.data && replayJobsQuery.data.jobs) {
    const jobs = replayJobsQuery.data.jobs;
    if (jobs.length > 0) {
      jobsList = (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Job {job.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      Status: <Badge variant="outline">{job.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {formatDate(job.createdAt, "PPpp")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewJob(job.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button size="sm" onClick={() => handleRunJob(job.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Run
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    } else {
      jobsList = <p className="text-sm text-muted-foreground">No replay jobs yet</p>;
    }
  }

  let jobDetailContent = null;
  if (selectedJobId && replayJobQuery.data) {
    const job = replayJobQuery.data.job;
    const attempts = replayJobQuery.data.attempts;
    let attemptsDisplay = null;
    if (attempts.length > 0) {
      attemptsDisplay = (
        <div className="space-y-2 mt-2">
          {attempts.map((att) => {
            let okBadge = null;
            if (att.ok) {
              okBadge = <Badge variant="default">Success</Badge>;
            } else {
              okBadge = <Badge variant="destructive">Failed</Badge>;
            }
            let errorDisplay = null;
            if (att.errorMessage) {
              errorDisplay = <div className="text-xs text-destructive">{att.errorMessage}</div>;
            }
            let snippetDisplay = null;
            if (att.responseSnippet) {
              snippetDisplay = (
                <div>
                  <div className="text-xs font-medium mb-1">Response Snippet</div>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {att.responseSnippet}
                  </code>
                </div>
              );
            }
            return (
              <Card key={att.id}>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Attempt #{att.attemptNo}</div>
                      {okBadge}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Status: {att.responseStatus}
                    </div>
                    {errorDisplay}
                    {snippetDisplay}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    } else {
      attemptsDisplay = <p className="text-sm text-muted-foreground">No attempts yet</p>;
    }

    let compareButton = null;
    if (attempts.length > 0) {
      compareButton = (
        <Button onClick={handleCompare}>
          <GitCompare className="h-4 w-4 mr-2" />
          Compare Last Attempt
        </Button>
      );
    }

    jobDetailContent = (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Job Details</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setSelectedJobId("")}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Destination URL</div>
            <code className="text-sm bg-muted p-2 rounded block">{job.destinationUrl}</code>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Status</div>
            <Badge variant="outline">{job.status}</Badge>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Attempts ({attempts.length})</div>
            {attemptsDisplay}
          </div>
          {compareButton}
        </CardContent>
      </Card>
    );
  }

  let compareContent = null;
  if (compareData && compareQuery.data) {
    const comp = compareQuery.data;
    let originalBodyDisplay = null;
    if (comp.original.body.isJson) {
      originalBodyDisplay = <JsonViewer data={JSON.parse(comp.original.body.raw)} initialExpanded={true} />;
    } else {
      originalBodyDisplay = (
        <pre className="bg-code-background p-4 rounded-lg overflow-auto font-mono text-sm">
          {comp.original.body.raw}
        </pre>
      );
    }
    let replayBodyDisplay = null;
    if (comp.replay.body.isJson) {
      replayBodyDisplay = <JsonViewer data={JSON.parse(comp.replay.body.raw)} initialExpanded={true} />;
    } else {
      replayBodyDisplay = (
        <pre className="bg-code-background p-4 rounded-lg overflow-auto font-mono text-sm">
          {comp.replay.body.raw}
        </pre>
      );
    }
    compareContent = (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Compare: Original vs Replay</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setCompareData(null)}>
              Close
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Diff Summary</div>
            <JsonViewer data={comp.diff} initialExpanded={true} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium mb-2">Original Headers</div>
              <JsonViewer data={comp.original.headers} initialExpanded={true} />
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Replay Headers</div>
              <JsonViewer data={comp.replay.headers} initialExpanded={true} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium mb-2">Original Body</div>
              {originalBodyDisplay}
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Replay Body</div>
              {replayBodyDisplay}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  let eventHeadersDisplay = headers;
  let eventBodyDisplay = bodyDisplay;
  if (safeShareMode && safeShareQuery.data) {
    const safeData = safeShareQuery.data.safe;
    if (safeData) {
      eventHeadersDisplay = safeData.headers;
      if (safeData.body.isJson) {
        eventBodyDisplay = <JsonViewer data={safeData.body.json} initialExpanded={true} />;
      } else {
        eventBodyDisplay = (
          <pre className="bg-code-background p-4 rounded-lg overflow-auto font-mono text-sm">
            {safeData.body.raw}
          </pre>
        );
      }
    }
  }

  let safeShareButton = null;
  if (safeShareMode) {
    safeShareButton = (
      <Button size="sm" variant="outline" onClick={handleExitSafeShare}>
        <Shield className="h-4 w-4 mr-2" />
        Exit Safe Share
      </Button>
    );
  } else {
    safeShareButton = (
      <Button size="sm" onClick={handleEnterSafeShare}>
        <Shield className="h-4 w-4 mr-2" />
        Enter Safe Share
      </Button>
    );
  }

  let queryParamsSection = null;
  if (Object.keys(queryParams).length > 0) {
    queryParamsSection = (
      <div>
        <div className="text-sm font-medium mb-2">Query Parameters</div>
        <JsonViewer data={queryParams} initialExpanded={true} />
      </div>
    );
  }

  let previewSection = null;
  if (previewContent) {
    previewSection = (
      <div className="mt-4">
        <Separator className="my-4" />
        {previewContent}
      </div>
    );
  }

  let jobDetailSection = null;
  if (jobDetailContent) {
    jobDetailSection = (
      <div className="mt-4">
        <Separator className="my-4" />
        {jobDetailContent}
      </div>
    );
  }

  let compareSection = null;
  if (compareContent) {
    compareSection = (
      <div className="mt-4">
        <Separator className="my-4" />
        {compareContent}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/inbox/${inboxId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Event Details</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDate(event.timestamp, "PPpp")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Method</div>
              <MethodBadge method={event.method} className="" />
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Path</div>
              <code className="text-sm bg-muted p-2 rounded block">{event.path}</code>
            </div>
            {queryParamsSection}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Content Type</div>
              <code className="text-sm bg-muted p-2 rounded block">{contentTypeDisplay}</code>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Size</div>
              <code className="text-sm bg-muted p-2 rounded block">{event.size} B</code>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Received At</div>
              <code className="text-sm bg-muted p-2 rounded block">
                {formatDate(event.timestamp, "PPpp")}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Safe Share</CardTitle>
            {safeShareButton}
          </div>
        </CardHeader>
        <CardContent>
          {safeShareContent}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mutations Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="header-overrides">Header Overrides (JSON array)</Label>
            <Textarea
              id="header-overrides"
              value={headerOverridesText}
              onChange={(e) => setHeaderOverridesText(e.target.value)}
              placeholder='[{"action": "set", "name": "Authorization", "value": "Bearer token"}]'
              className="font-mono text-xs"
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="json-overrides">JSON Overrides (JSON array)</Label>
            <Textarea
              id="json-overrides"
              value={jsonOverridesText}
              onChange={(e) => setJsonOverridesText(e.target.value)}
              placeholder='[{"path": "$.user.id", "value": "123"}]'
              className="font-mono text-xs"
              rows={4}
            />
          </div>
          <Button onClick={handlePreviewChanges} disabled={mutatePreview.isPending}>
            Preview Changes
          </Button>
          {previewSection}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Replay Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="destination-url">Destination URL</Label>
            <Input
              id="destination-url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </div>
          <div>
            <Label htmlFor="retry-max">Max Attempts</Label>
            <Input
              id="retry-max"
              type="number"
              value={retryMax}
              onChange={(e) => setRetryMax(e.target.value)}
              min="1"
            />
          </div>
          <Button onClick={handleCreateReplayJob} disabled={createReplayJob.isPending}>
            Create Replay Job
          </Button>
          <Separator />
          <div>
            <div className="text-sm font-medium mb-2">Jobs</div>
            {jobsList}
          </div>
          {jobDetailSection}
          {compareSection}
        </CardContent>
      </Card>

      <Tabs defaultValue="headers" className="w-full">
        <TabsList>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
        </TabsList>
        <TabsContent value="headers" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <JsonViewer data={eventHeadersDisplay} initialExpanded={true} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="body" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {eventBodyDisplay}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
