import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, User, ArrowRight } from "lucide-react";
import { login, signup, getGoogleOAuthUrl } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

type AuthMode = "login" | "signup";

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Parallax state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position (-1 to 1)
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0f] flex items-center justify-center font-sans selection:bg-purple-500/30">
      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 8s ease-in-out infinite; animation-delay: 2s; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
      `}</style>

      {/* Dynamic Background Elements (Parallax) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        {/* Main purple orb */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/20 blur-[100px] animate-pulse-glow" />
        {/* Blue orb */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/20 blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
        {/* Accent pink orb */}
        <div className="absolute top-[20%] right-[10%] w-[20vw] h-[20vw] rounded-full bg-pink-500/10 blur-[80px] animate-float" />
      </div>

      {/* Floating Particles/Shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[15%] left-[20%] w-32 h-32 border border-white/5 rounded-full animate-float"
          style={{ transform: `translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)` }}
        />
        <div
          className="absolute bottom-[20%] right-[25%] w-24 h-24 border border-white/5 rounded-full animate-float-delayed"
          style={{ transform: `translate(${mousePos.x * -30}px, ${mousePos.y * -30}px)` }}
        />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md px-6">

        {/* Logo/Brand (Parallax slightly stronger) */}
        <div
          className="text-center mb-8 transform transition-transform duration-200" // Reduced motion for text to keep it readable
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-purple-500/20 to-blue-500/20 border border-white/10 mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.4)] animate-float">
            <div className="w-8 h-8 rounded-full bg-linear-to-r from-purple-400 to-blue-400" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white mb-2 drop-shadow-xl">
            Synapse
          </h1>
          <p className="text-slate-400 text-lg font-light tracking-wide">
            {mode === "login" ? "Unlock your knowledge" : "Join the network"}
          </p>
        </div>

        {/* Glass Card */}
        <div
          className="relative group rounded-3xl p-[1px] bg-linear-to-b from-white/20 to-white/5 shadow-2xl overflow-hidden backdrop-blur-xl"
        >
          {/* Card Inner Background */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xl rounded-3xl" />

          <div className="relative p-8 rounded-3xl bg-[#13131f]/40">
            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white text-black font-medium rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all duration-200 mb-6 group/google shadow-lg shadow-white/5"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5 transition-transform group-hover/google:scale-110" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span className="tracking-wide">Continue with Google</span>
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="px-4 bg-transparent text-slate-500 font-medium">Or via email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "signup" && (
                <div className="space-y-1.5 group/input">
                  <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Name</label>
                  <div className="relative transition-all duration-300 focus-within:transform focus-within:scale-[1.02]">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-purple-400 transition-colors" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 focus:bg-black/50 transition-all font-light"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 group/input">
                <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Email</label>
                <div className="relative transition-all duration-300 focus-within:transform focus-within:scale-[1.02]">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-purple-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 focus:bg-black/50 transition-all font-light"
                  />
                </div>
              </div>

              <div className="space-y-1.5 group/input">
                <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">Password</label>
                <div className="relative transition-all duration-300 focus-within:transform focus-within:scale-[1.02]">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-purple-400 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    minLength={6}
                    className="w-full pl-12 pr-4 py-3.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 focus:bg-black/50 transition-all font-light"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-6 text-lg bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(147,51,234,0.5)] transition-all duration-300 rounded-xl group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {mode === "login" ? "Sign In" : "Create Account"}
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-linear-to-r from-purple-400/0 via-white/20 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </Button>
            </form>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            {mode === "login" ? "First time here?" : "Already have an account?"}
            <button
              onClick={switchMode}
              className="ml-2 text-white hover:text-purple-400 font-medium transition-colors hover:underline decoration-purple-500/50 underline-offset-4"
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

