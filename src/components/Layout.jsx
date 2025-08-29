import { motion } from "framer-motion";
import Logo from "./Logo.jsx";
import { LayoutGrid, Users, CalendarDays, CreditCard, LogOut, Settings } from "lucide-react";

export default function Layout({ view, setView, onSignOut, children }) {
  const nav = [
    { key: "attendance", label: "Absences & Retards", icon: CalendarDays },
    { key: "dues",       label: "Cotisations",        icon: CreditCard },
    // { key: "team",    label: "Équipe",            icon: Users }, // si tu veux plus tard
  ];

  return (
    <div className="app-bg">
      {/* Topbar */}
      <header className="sticky top-0 z-30">
        <div className="glass px-5 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold">A</div>
              <div className="font-extrabold tracking-wide">AFARIS</div>
              <span className="badge ml-2 hidden sm:inline-flex">Admin</span>
            </div>

            {/* Recherche factice + actions */}
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
              <div className="flex-1 glass rounded-xl px-3 py-2 text-sm text-slate-200/90">Rechercher…</div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={onSignOut} className="glass rounded-xl px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2">
                <LogOut size={16}/> <span className="hidden sm:inline">Se déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Body avec sidebar */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <div className="glass rounded-2xl p-2">
            {nav.map(({ key, label, icon:Icon }) => (
              <button
                key={key}
                onClick={()=>setView(key)}
                className={`nav-item w-full rounded-xl px-3 py-2 mb-1 flex items-center gap-2 text-left hover:bg-white/10 ${view===key ? "active" : ""}`}
              >
                <Icon size={18} /> <span className="text-sm">{label}</span>
              </button>
            ))}
            <div className="mt-3 px-3 py-2 text-xs text-slate-300/80">Tableaux</div>
            <div className="px-2 pb-2">
              <div className="glass rounded-xl p-3 text-xs text-slate-300/80 flex items-center gap-2">
                <LayoutGrid size={16}/> Tableau de bord
              </div>
            </div>
          </div>
        </aside>

        {/* Contenu */}
        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <motion.div initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} transition={{duration:.25}} className="space-y-6">
            {children}
          </motion.div>
        </main>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-300/70">AFARIS © {new Date().getFullYear()}</footer>
    </div>
  );
}
