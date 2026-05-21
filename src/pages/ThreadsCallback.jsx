import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function ThreadsCallback() {
  const [status, setStatus] = useState("processing");
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      setError("No code found in URL.");
      setStatus("error");
      return;
    }

    base44.functions.invoke("exchangeThreadsCode", { code })
      .then((res) => {
        if (res.data?.access_token) {
          setToken(res.data.access_token);
          setStatus("success");
        } else {
          setError(res.data?.error || "Token exchange failed.");
          setStatus("error");
        }
      })
      .catch((e) => {
        setError(e.message);
        setStatus("error");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="max-w-lg w-full bg-card border border-border rounded-xl p-8 shadow-sm">
        {status === "processing" && (
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-foreground font-medium">Exchanging Threads token...</p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="text-green-600 text-4xl mb-4 text-center">✓</div>
            <h2 className="text-xl font-bold text-foreground mb-2 text-center">Token received!</h2>
            <p className="text-muted-foreground text-sm mb-4 text-center">
              Copy this token and paste it into your <strong>THREADS_ACCESS_TOKEN</strong> secret in the Base44 dashboard settings.
            </p>
            <div className="bg-muted rounded-lg p-3 break-all text-xs font-mono text-foreground select-all border border-border">
              {token}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">Click the token above to select all, then copy it.</p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="text-destructive text-4xl mb-4">✗</div>
            <h2 className="text-xl font-bold text-foreground mb-2">Something went wrong</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}