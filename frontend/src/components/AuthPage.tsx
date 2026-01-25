import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { login, signup, getGoogleOAuthUrl } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

type AuthMode = "login" | "signup";

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const response = await login({ email, password });
        setUser(response.user);
      } else {
        if (!name.trim()) {
          setError("Please enter your name");
          setIsLoading(false);
          return;
        }
        const response = await signup({ email, password, name });
        setUser(response.user);
      }
    } catch (err: any) {
      const message = err.response?.data?.detail || "An error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const url = await getGoogleOAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      const message =
        err.response?.data?.detail || "Failed to initiate Google sign in";
      setError(message);
      setIsGoogleLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
  };

  return (
    <div className="flex min-h-screen w-full bg-black text-white selection:bg-purple-500/30 font-sans">
      {/* LEFT PANEL - Visual Side */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-black p-6">
        <div className="w-full h-full rounded-[20px] relative overflow-hidden flex flex-col justify-between p-12 z-10">
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-linear-to-b  z-0" />

          {/* Top Texture/Glow */}
          <div className="absolute top-0 left-0 right-0 h-[500px] bg-linear-to-b from-white/10 to-transparent pointer-events-none z-0 mix-blend-overlay" />
          <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-purple-400/30 rounded-full blur-[120px] pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-purple-600" />
              </div>
              <span className="font-semibold text-xl tracking-tight">
                Synapse
              </span>
            </div>
          </div>

          {/* Middle Content */}
          <div className="relative z-10 mt-auto mb-20 space-y-8">
            <h1 className="text-5xl font-bold tracking-tight leading-[1.1]">
              Get Started with Us
            </h1>
            <p className="text-purple-100/80 text-lg max-w-md font-light">
              Complete these easy steps to unlock your knowledge graph.
            </p>

            {/* Stepper */}
            <div className="space-y-4 max-w-sm mt-8">
              {/* Step 1 */}
              <div
                className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-300 ${mode === "signup" ? "bg-white text-black shadow-xl" : "bg-black/20 text-white/50 border border-white/5"}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${mode === "signup" ? "bg-black text-white" : "bg-white/10"}`}>
                  1
                </div>
                <span className="font-medium">Create your account</span>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-2xl flex items-center gap-4 bg-black/20 text-white/50 border border-white/5 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <span className="font-medium">Upload documents</span>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-2xl flex items-center gap-4 bg-black/20 text-white/50 border border-white/5 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <span className="font-medium">Explore knowledge</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="text-left space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {mode === "login" ? "Welcome Back" : "Sign Up Account"}
            </h2>
            <p className="text-slate-400">
              {mode === "login"
                ? "Enter your credentials to access your account."
                : "Enter your personal data to create your account."}
            </p>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-1 gap-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-[#1a1a1a] hover:bg-[#252525] border border-white/5 rounded-xl transition-all duration-200 group">
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                </svg>
              )}
              <span className="font-medium text-sm">Google</span>
            </button>
          </div>

          <div className="relative flex items-center gap-3 py-4">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-xs text-slate-500 uppercase tracking-widest">
              Or
            </span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="eg. John Doe"
                  className="w-full bg-[#1a1a1a] border border-white/5 focus:border-purple-500/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 outline-none transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eg. john@example.com"
                className="w-full bg-[#1a1a1a] border border-white/5 focus:border-purple-500/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-600 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-[#1a1a1a] border border-white/5 focus:border-purple-500/50 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-slate-600 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Must be at least 8 characters.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-white hover:bg-slate-200 text-black font-bold h-12 rounded-xl text-base shadow-none hover:shadow-lg transition-all">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === "login" ? (
                "Log In"
              ) : (
                "Sign Up"
              )}
            </Button>

            <div className="text-center pt-2">
              <p className="text-slate-500 text-sm">
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
                <button
                  type="button"
                  onClick={switchMode}
                  className="ml-2 text-white hover:underline font-medium">
                  {mode === "login" ? "Sign Up" : "Log In"}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
