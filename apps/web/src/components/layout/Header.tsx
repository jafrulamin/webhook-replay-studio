import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Moon, Sun, RefreshCw } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Breadcrumbs } from "./Breadcrumbs";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  let themeTitle = "Switch to light mode";
  if (theme === "light") {
    themeTitle = "Switch to dark mode";
  }

  let themeIcon = null;
  if (theme === "dark") {
    themeIcon = <Sun className="h-4 w-4" />;
  } else {
    themeIcon = <Moon className="h-4 w-4" />;
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />
      
      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleTheme}
          title={themeTitle}
        >
          {themeIcon}
        </Button>
      </div>
    </header>
  );
}
