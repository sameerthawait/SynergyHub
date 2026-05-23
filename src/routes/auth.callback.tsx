import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if we have a session from the OAuth callback
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (data.session) {
          // Successfully authenticated, redirect to app
          navigate({ to: "/app" });
        } else {
          // No session yet, might need to check URL params
          const url = new URL(window.location.href);
          const code = url.searchParams.get("code");

          if (code) {
            // Handle the OAuth code exchange
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            navigate({ to: "/app" });
          } else {
            setError("No authentication code received");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
        <p className="mt-4 text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}
