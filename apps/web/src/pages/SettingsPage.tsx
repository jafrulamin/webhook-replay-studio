import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  let themeButtonContent = null;
  if (theme === "dark") {
    themeButtonContent = (
      <>
        <Sun className="mr-2 h-4 w-4" />
        Light Mode
      </>
    );
  } else {
    themeButtonContent = (
      <>
        <Moon className="mr-2 h-4 w-4" />
        Dark Mode
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your application settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the appearance of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Choose between light and dark mode
              </p>
            </div>
            <Button variant="outline" onClick={toggleTheme}>
              {themeButtonContent}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Configure API endpoint settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-base">API Base URL</Label>
            <Input
              id="api-base"
              value={import.meta.env.VITE_API_BASE || "http://127.0.0.1:8787"}
              disabled
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Configure this in your environment variables (VITE_API_BASE)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
