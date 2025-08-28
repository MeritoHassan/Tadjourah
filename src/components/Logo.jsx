// Variante "onDark" pour afficher un logo très lisible sur fond sombre (header)

export default function Logo({ variant = "default", className = "" }) {
  const onDark = variant === "onDark";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Carré avec la lettre A (dégradé + anneau pour mieux ressortir) */}
      <div
        className={[
          "w-9 h-9 rounded-xl",
          "bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-600",
          "flex items-center justify-center font-bold text-white",
          "shadow-xl ring-2", onDark ? "ring-white/40" : "ring-indigo-200/60"
        ].join(" ")}
      >
        A
      </div>

      {/* Texte AFARIS : blanc si onDark (pour le header), sinon texte dégradé */}
      <div className="leading-tight">
        <div
          className={[
            "text-xl font-extrabold",
            onDark
              ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
              : "text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-violet-700"
          ].join(" ")}
        >
          AFARIS
        </div>
        <div className={onDark ? "text-white/80 text-[10px] tracking-wide" : "text-slate-500 text-[10px] tracking-wide"}>
          Association
        </div>
      </div>
    </div>
  );
}
