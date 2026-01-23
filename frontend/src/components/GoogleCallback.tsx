import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { handleGoogleCallback } from "@/api/client";
import { Loader2, AlertCircle } from "lucide-react";

export function GoogleCallback() {
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      // Get token from URL params
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const errorParam = params.get("error");

      if (errorParam) {
        setError(`Authentication failed: ${errorParam}`);
        return;
      }

      if (!token) {
        setError("No authentication token received");
        return;
      }

      try {
        // Handle the callback and get user info
        const user = await handleGoogleCallback(token);
        setUser(user);

        // Redirect to main app (remove callback params)
        window.location.href = "/";
      } catch (err: any) {
        setError(
          err.response?.data?.detail || "Failed to complete authentication",
        );
      }
    };

    processCallback();
  }, [setUser]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="w-full max-w-md">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-red-500/50 p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Authentication Failed
            </h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors">
              Return to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-slate-300">Completing sign in...</p>
      </div>
    </div>
  );
}
