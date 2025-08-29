import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./Logo.jsx";
import { supabase } from "../lib/supabaseClient.js";

// ---- Config depuis les variables d'env
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
const GUEST_EMAILS = (import.meta.env.VITE_GUEST_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// ⚠️ Ne mets pas de valeur vide dans l'allowlist
const ALLOWED = new Set([ ...GUEST_EMAILS, ...(ADMIN_EMAIL ? [ADMIN_EMAIL] : []) ]);
const norm = (s) => (s || "").trim().toLowerCase();

// Petit “blob” animé d'arrière-plan
function Blob({ className = "", color = "rgba(99,102,241,0.6)" }) {
  return (
    <motion.div
      className={className}
      style={{
        background: `radial-gradient(closest-side at 50% 50%, ${color}, rgba(255,255,255,0) 60%)`,
        filter: "blur(40px)",
      }}
      initial={{ opacity: 0, x: -40, y: -40, scale: 0.9 }}
      animate={{
        opacity: 0.65,
        x: [0, 40, -30, 20, 0],
        y: [0, -30, 25, -15, 0],
        scale: [0.95, 1.02, 0.98, 1.03, 0.95],
      }}
      transition={{ duration: 14, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
    />
  );
}

export default function AdminLogin() {
  // ---- États du formulaire
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pwdRef = useRef(null);

  // ✅ Calcules DANS le composant (après le useState)
  const normalized = norm(email);
  const isAllowedEmail = ALLOWED.has(normalized);
  const isAdmin = ADMIN_EMAIL && normalized === ADMIN_EMAIL;

  // Si email non autorisé → on efface le mdp
  useEffect(() => { if (!isAllowedEmail) setPassword(""); }, [isAllowedEmail]);
  // Quand email autorisé, focus sur le mdp
  useEffect(() => { if (isAllowedEmail) pwdRef.current?.focus(); }, [isAllowedEmail]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Blocage immédiat si email non autorisé (pas d'appel Supabase)
    if (!isAllowedEmail) {
      setError("Accès réservé : cet email n'est pas autorisé.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: normalized,
        password,
      });
      if (error) throw error; // ex: "Invalid login credentials"
      // onAuthStateChange dans App.jsx s'occupera du reste
    } catch (err) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 12, scale: 0.98 },
    in: { opacity: 1, y: 0, scale: 1 },
    shake: { x: [0, -8, 8, -6, 6, -4, 4, -2, 2, 0], transition: { duration: 0.45 } },
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* Blobs de fond */}
      <Blob className="pointer-events-none absolute -top-24 -left-16 w-[32rem] h-[32rem]" color="rgba(99,102,241,0.55)" />
      <Blob className="pointer-events-none absolute -bottom-24 -right-16 w-[28rem] h-[28rem]" color="rgba(139,92,246,0.55)" />

      {/* Carte */}
      <div className="relative z-10 flex items-center justify-center p-6 min-h-screen">
        <motion.div
          variants={cardVariants}
          initial="initial"
          animate={error ? "shake" : "in"}
          transition={{ duration: 0.35 }}
          className="card max-w-md w-full p-6 bg-white/80 backdrop-blur-xl border border-indigo-200/40 shadow-2xl rounded-2xl"
        >
          <div className="flex items-center justify-center mb-4">
            <Logo className="scale-[0.95]" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 text-center">Connexion {isAdmin ? "administrateur" : "invité"}</h1>
          <p className="text-xs text-slate-500 text-center mb-6">Accès réservé. Identifiez-vous.</p>

          {!ADMIN_EMAIL && (
            <div className="mb-3 text-rose-600 text-sm">
              Variable <code>VITE_ADMIN_EMAIL</code> manquante. Ajoute-la dans <code>.env.local</code> puis redémarre.
            </div>
          )}

          <form onSubmit={submit} className="space-y-3" onKeyDown={(e)=>{ if(e.key==="Enter" && !isAllowedEmail) e.preventDefault(); }}>
            <label className="block text-sm">
              Email (autorisé)
              <motion.input
                whileFocus={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                type="email" required
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="admin@exemple.com"
                value={email}
                onChange={(e)=>{ setEmail(e.target.value); setError(""); }}
                autoFocus
              />
            </label>

            {/* Message si email non autorisé */}
            {!isAllowedEmail && ADMIN_EMAIL && email && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-rose-600 text-sm">
                Accès refusé : cet email n'est pas autorisé.
              </motion.div>
            )}

            {/* Bloc mot de passe + bouton, seulement si email autorisé */}
            <AnimatePresence initial={false} mode="wait">
              {isAllowedEmail && (
                <motion.div key="pwdblock" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-3">
                  <label className="block text-sm">
                    Mot de passe
                    <motion.input
                      ref={pwdRef}
                      whileFocus={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      type="password" required
                      className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e)=>setPassword(e.target.value)}
                    />
                  </label>

                  {error && <div className="text-rose-600 text-sm">{error}</div>}

                  <motion.button
                    type="submit"
                    disabled={loading || !password}
                    whileHover={{ y: -1, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-primary w-full justify-center relative overflow-hidden"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.6s_linear_infinite]" />
                    <span className="relative">{loading ? "Connexion…" : "Se connecter"}</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
