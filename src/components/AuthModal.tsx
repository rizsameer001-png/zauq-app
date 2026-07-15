import React, { useState } from "react";
import { 
  Mail, 
  Lock, 
  User, 
  X, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Shield, 
  Key, 
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup 
} from "firebase/auth";
import { auth, googleProvider, logUserActivity } from "../firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerToast: (msg: string) => void;
}

export default function AuthModal({ isOpen, onClose, triggerToast }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"user-login" | "user-register" | "admin-login">("user-login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all standard credentials.");
      return;
    }
    setErrorMsg("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await logUserActivity("sign_in", `User logged in via email: ${user.email}`, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });

      triggerToast(`Welcome back, ${user.displayName || "Adeeeb"}! ✨`);
      onClose();
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = "Failed to sign in. Please verify your email and password.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        friendlyMessage = "Incorrect email address or password. Please try again.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      }
      setErrorMsg(friendlyMessage);
      triggerToast("Login failed. Check your input.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setErrorMsg("All registration fields are mandatory.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters for safety.");
      return;
    }
    setErrorMsg("");
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName });

      await logUserActivity("sign_up", `New user registered: ${email}`, {
        uid: user.uid,
        email: user.email,
        displayName: displayName
      });

      triggerToast(`Account created successfully! Welcome to Zauq, ${displayName}. ✨`);
      onClose();
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = "Registration failed. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "This email is already registered. Please login instead.";
      } else if (err.code === "auth/invalid-email") {
        friendlyMessage = "Please enter a valid email address.";
      }
      setErrorMsg(friendlyMessage);
      triggerToast("Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Primary Administrator email and access key are required.");
      return;
    }
    setErrorMsg("");
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if email corresponds to the admin email
      if (user.email === "amancib007@gmail.com") {
        await logUserActivity("admin_sign_in", "Primary Administrator logged in successfully", {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        triggerToast("Primary Gatekeeper authenticated successfully! Welcome, Admin. 👑");
        onClose();
      } else {
        // Logged in but not primary admin
        await logUserActivity("unauthorized_admin_attempt", `User ${user.email} attempted admin gate entry`, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        setErrorMsg("Access denied. Authenticated account is not registered in the Gatekeeper database as a Primary Admin.");
        triggerToast("Admin authorization failed.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Admin verification failed. Incorrect credentials or unauthorized access.");
      triggerToast("Admin login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg("");
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await logUserActivity("login", "User authenticated successfully via Google", {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName
        });
        triggerToast("Successfully connected via Google! Welcome to Zauq. ✨");
        onClose();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Google OAuth failed or was cancelled.");
      triggerToast("Authentication cancelled.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md animate-fadeIn" id="auth-modal-overlay">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative bg-stone-900/90 border border-stone-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 sm:p-8 flex flex-col gap-6"
      >
        {/* Background glow accents */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
            <span className="font-serif font-bold text-amber-200 tracking-wide text-lg sm:text-xl">
              {activeTab === "admin-login" ? "Gatekeeper Access" : "Zauq Portal"}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-950/40 border border-stone-900 text-stone-500 hover:text-stone-300 hover:bg-stone-950 cursor-pointer transition-all"
            id="close-auth-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub tabs switcher */}
        <div className="grid grid-cols-3 gap-1 bg-stone-950/80 p-1.5 border border-stone-900 rounded-2xl relative z-10">
          <button
            onClick={() => {
              setActiveTab("user-login");
              setErrorMsg("");
            }}
            className={`py-2 text-[10px] sm:text-xs font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer font-bold ${
              activeTab === "user-login"
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-md"
                : "text-stone-500 hover:text-stone-300 hover:bg-stone-900/30"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab("user-register");
              setErrorMsg("");
            }}
            className={`py-2 text-[10px] sm:text-xs font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer font-bold ${
              activeTab === "user-register"
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-md"
                : "text-stone-500 hover:text-stone-300 hover:bg-stone-900/30"
            }`}
          >
            Register
          </button>
          <button
            onClick={() => {
              setActiveTab("admin-login");
              setErrorMsg("");
            }}
            className={`py-2 text-[10px] sm:text-xs font-mono uppercase tracking-wider rounded-xl transition-all cursor-pointer font-bold flex items-center justify-center gap-1.5 ${
              activeTab === "admin-login"
                ? "bg-red-500/10 border border-red-500/20 text-red-400 shadow-md"
                : "text-stone-500 hover:text-stone-300 hover:bg-stone-900/30"
            }`}
          >
            <Shield className="w-3 h-3" />
            Admin
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-start gap-2.5 text-xs font-serif leading-normal relative z-10 animate-shake">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auth Forms */}
        <div className="relative z-10 flex-1 flex flex-col">
          {activeTab === "user-login" && (
            <form onSubmit={handleUserLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-950/40 hover:bg-stone-950 border border-stone-800 rounded-xl focus:border-amber-500/50 text-stone-300 text-xs transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-950/40 hover:bg-stone-950 border border-stone-800 rounded-xl focus:border-amber-500/50 text-stone-300 text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-mono text-xs uppercase tracking-widest font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? "Signing In..." : "Authenticate"}
              </button>
            </form>
          )}

          {activeTab === "user-register" && (
            <form onSubmit={handleUserRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Adeeeb Pen Name / Display Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ghalib Sani"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-950/40 hover:bg-stone-950 border border-stone-800 rounded-xl focus:border-amber-500/50 text-stone-300 text-xs transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ghalib@zauq.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-950/40 hover:bg-stone-950 border border-stone-800 rounded-xl focus:border-amber-500/50 text-stone-300 text-xs transition-colors"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Access Password (min 6 chars)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-950/40 hover:bg-stone-950 border border-stone-800 rounded-xl focus:border-amber-500/50 text-stone-300 text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-mono text-xs uppercase tracking-widest font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? "Creating Account..." : "Create Free Account"}
              </button>
            </form>
          )}

          {activeTab === "admin-login" && (
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-900 text-stone-400 text-[10px] font-serif leading-normal mb-1">
                <span className="font-mono text-red-400 uppercase font-bold block mb-1">Administrator Notice</span>
                Primary Admin privileges are reserved for <span className="text-amber-300 font-mono">amancib007@gmail.com</span>. Please sign in with registered primary administrator credentials.
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Admin Registered Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amancib007@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-950/40 hover:bg-stone-950 border border-stone-800 rounded-xl focus:border-red-500/30 text-stone-300 text-xs transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Administrator Key</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-600" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-stone-950/40 hover:bg-stone-950 border border-stone-800 rounded-xl focus:border-red-500/30 text-stone-300 text-xs transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-stone-100 font-mono text-xs uppercase tracking-widest font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 mt-2 flex items-center justify-center gap-2 border border-red-500/20"
              >
                {isLoading ? "Verifying..." : "Validate Gatekeeper Key"}
              </button>
            </form>
          )}

          {/* Social login divider for user access */}
          {activeTab !== "admin-login" && (
            <div className="flex flex-col gap-4 mt-6 border-t border-stone-800/80 pt-6">
              <div className="relative flex items-center justify-center">
                <span className="bg-stone-900 px-3 text-[9px] font-mono uppercase tracking-widest text-stone-500 relative z-10">
                  Alternative Pathway
                </span>
                <div className="absolute w-full border-b border-stone-800" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-stone-950 border border-stone-800 hover:bg-stone-950/40 text-stone-300 font-mono text-[10px] uppercase tracking-wider font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                id="google-pathway-btn"
              >
                <svg className="w-3.5 h-3.5 text-stone-400" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Continue via Google Sync
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
