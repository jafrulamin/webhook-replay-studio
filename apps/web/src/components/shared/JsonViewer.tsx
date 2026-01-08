import { useState } from "react";
import { ChevronRight, ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: unknown;
  initialExpanded: boolean;
}

export function JsonViewer({ data, initialExpanded = true }: JsonViewerProps) {
  const { toast } = useToast();

  const handleCopy = async () => {
    if (data === null || data === undefined) {
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    toast({
      title: "Copied!",
      description: "JSON copied to clipboard",
    });
  };

  if (data === null || data === undefined) {
    return (
      <div className="bg-code-background p-4 rounded-lg overflow-auto font-mono text-sm">
        <span className="text-code-null">null</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 z-10"
        onClick={handleCopy}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      <div className="bg-code-background p-4 rounded-lg overflow-auto font-mono text-sm">
        <JsonNode data={data} path="" level={0} defaultExpanded={initialExpanded} keyName="" isLast={true} hasKeyName={false} />
      </div>
    </div>
  );
}

interface JsonNodeProps {
  data: unknown;
  path: string;
  level: number;
  defaultExpanded: boolean;
  keyName: string;
  isLast: boolean;
  hasKeyName: boolean;
}

function JsonNode({ data, path, level, defaultExpanded, keyName, isLast = true, hasKeyName = false }: JsonNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded && level < 3);

  const indent = level * 16;

  let keyDisplay = null;
  if (hasKeyName) {
    keyDisplay = (
      <>
        <span className="text-code-key">"{keyName}"</span>
        <span className="text-foreground">: </span>
      </>
    );
  }

  let comma = null;
  if (!isLast) {
    comma = <span className="text-foreground">,</span>;
  }

  if (data === null) {
    return (
      <div className="flex" style={{ paddingLeft: indent }}>
        {keyDisplay}
        <span className="text-code-null">null</span>
        {comma}
      </div>
    );
  }

  if (typeof data === "boolean") {
    return (
      <div className="flex" style={{ paddingLeft: indent }}>
        {keyDisplay}
        <span className="text-code-boolean">{String(data)}</span>
        {comma}
      </div>
    );
  }

  if (typeof data === "number") {
    return (
      <div className="flex" style={{ paddingLeft: indent }}>
        {keyDisplay}
        <span className="text-code-number">{data}</span>
        {comma}
      </div>
    );
  }

  if (typeof data === "string") {
    return (
      <div className="flex" style={{ paddingLeft: indent }}>
        {keyDisplay}
        <span className="text-code-string">"{data}"</span>
        {comma}
      </div>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="flex" style={{ paddingLeft: indent }}>
          {keyDisplay}
          <span className="text-foreground">[]</span>
          {comma}
        </div>
      );
    }

    let chevronIcon = null;
    if (expanded) {
      chevronIcon = <ChevronDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />;
    } else {
      chevronIcon = <ChevronRight className="h-3.5 w-3.5 mr-1 text-muted-foreground" />;
    }

    let collapsedContent = null;
    if (!expanded) {
      collapsedContent = (
        <>
          <span className="text-muted-foreground ml-1">
            {data.length} items
          </span>
          <span className="text-foreground">]</span>
          {comma}
        </>
      );
    }

    let expandedContent = null;
    if (expanded) {
      expandedContent = (
        <>
          {data.map((item, index) => (
            <JsonNode
              key={`${path}[${index}]`}
              data={item}
              path={`${path}[${index}]`}
              level={level + 1}
              defaultExpanded={defaultExpanded}
              isLast={index === data.length - 1}
              keyName=""
              hasKeyName={false}
            />
          ))}
          <div style={{ paddingLeft: indent }}>
            <span className="text-foreground">]</span>
            {comma}
          </div>
        </>
      );
    }

    return (
      <div>
        <div
          className="flex items-center cursor-pointer hover:bg-accent/50 rounded"
          style={{ paddingLeft: indent }}
          onClick={() => setExpanded(!expanded)}
        >
          {chevronIcon}
          {keyDisplay}
          <span className="text-foreground">[</span>
          {collapsedContent}
        </div>
        {expandedContent}
      </div>
    );
  }

  if (typeof data === "object" && data !== null) {
    const entries = Object.entries(data as Record<string, unknown>);
    
    if (entries.length === 0) {
      return (
        <div className="flex" style={{ paddingLeft: indent }}>
          {keyDisplay}
          <span className="text-foreground">{"{}"}</span>
          {comma}
        </div>
      );
    }

    let chevronIcon = null;
    if (level > 0) {
      if (expanded) {
        chevronIcon = <ChevronDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />;
      } else {
        chevronIcon = <ChevronRight className="h-3.5 w-3.5 mr-1 text-muted-foreground" />;
      }
    }

    let collapsedContent = null;
    if (!expanded) {
      collapsedContent = (
        <>
          <span className="text-muted-foreground ml-1">
            {entries.length} keys
          </span>
          <span className="text-foreground">{"}"}</span>
          {comma}
        </>
      );
    }

    let expandedContent = null;
    if (expanded) {
      expandedContent = (
        <>
          {entries.map(([key, value], index) => (
            <JsonNode
              key={`${path}.${key}`}
              data={value}
              path={`${path}.${key}`}
              level={level + 1}
              defaultExpanded={defaultExpanded}
              keyName={key}
              isLast={index === entries.length - 1}
              hasKeyName={true}
            />
          ))}
          <div style={{ paddingLeft: indent }}>
            <span className="text-foreground">{"}"}</span>
            {comma}
          </div>
        </>
      );
    }

    let wrapperClassName = "flex items-center cursor-pointer hover:bg-accent/50 rounded";
    if (level === 0) {
      wrapperClassName = "flex items-center cursor-default hover:bg-transparent";
    }

    const handleClick = () => {
      if (level > 0) {
        setExpanded(!expanded);
      }
    };

    return (
      <div>
        <div
          className={cn(wrapperClassName)}
          style={{ paddingLeft: indent }}
          onClick={handleClick}
        >
          {chevronIcon}
          {keyDisplay}
          <span className="text-foreground">{"{"}</span>
          {collapsedContent}
        </div>
        {expandedContent}
      </div>
    );
  }

  return null;
}
