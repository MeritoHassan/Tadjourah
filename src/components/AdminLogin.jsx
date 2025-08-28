import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Logo from "./Logo.jsx";
import { supabase } from "../lib/supabaseClient.js";

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || "").trim().toLowerCase();
const norm = (s) => (s || "").trim().toLowerCase();

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pwdRef = useRef(null);

  const isAllowedEmail = !!ADMIN_EMAIL && norm(email) === ADMIN_EMAIL;

  // Dès que l'email n'est pas celui de l’admin, on vide le mot de passe et on masque le formulaire
  useEffect(() => {
    if (!isAllowedEmail) setPassword("");
  }, [isAllowedEmail]);

  // Auto focus sur le mot de passe quand l'email admin devient valide
  useEffect(() => {
    if (isAllowedEmail) pwdRef.current?.focus();
  }, [isAllowedEmail]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Sécurité UI : si l'email ≠ admin, on bloque sans appeler Supabase
    if (!isAllowedEmail) {
      setError("Accès réservé : cet email n'est pas autorisé.");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: norm(email),
        password,
      });
      if (error) throw error; // ex: "Invalid login credentials"
      // onAuthStateChange dans App.jsx prendra le relais
    } catch (err) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 flex items-center justify-center p-6">
      <motion.div initial={{opacity:0,y:10,scale:.98}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.35}} className="card max-w-md w-full p-6">
        <div className="flex items-center justify-center mb-4">
          <Logo variant="onDark" className="scale-95" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 text-center">Connexion administrateur</h1>
        <p className="text-xs text-slate-500 text-center mb-6">Accès réservé à l’admin.</p>

        {!ADMIN_EMAIL && (
          <div className="mb-3 text-rose-600 text-sm">
            Variable VITE_ADMIN_EMAIL manquante. Ajoute-la dans <code>.env.local</code> puis redémarre.
          </div>
        )}

        <form onSubmit={submit} className="space-y-3" onKeyDown={(e)=>{ if(e.key==="Enter" && !isAllowedEmail) e.preventDefault(); }}>
          <label className="block text-sm">
            Email (admin)
            <input
              type="email"
              required
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring focus:ring-indigo-200"
              placeholder="admin@exemple.com"
              value={email}
              onChange={(e)=>{ setEmail(e.target.value); setError(""); }}
              autoFocus
            />
          </label>

          {/* Si l'email n'est pas autorisé, on n'affiche PAS le champ mot de passe */}
          {!isAllowedEmail && ADMIN_EMAIL && email && (
            <div className="text-rose-600 text-sm">
              Accès refusé : cet email n'est pas autorisé.
            </div>
          )}

          {isAllowedEmail && (
            <>
              <label className="block text-sm">
                Mot de passe
                <input
                  ref={pwdRef}
                  type="password"
                  required
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring focus:ring-indigo-200"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                />
              </label>

              {error && <div className="text-rose-600 text-sm">{error}</div>}

              <button type="submit" disabled={loading || !password} className="btn btn-primary w-full justify-center">
                {loading ? "Connexion…" : "Se connecter"}
              </button>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
}
