import React from "react";
import { ShoppingCart, Users2, Box, DollarSign, CheckCircle2, Clock3, XCircle, Search, Bell, Settings, Star } from "lucide-react";
import Logo from "../components/Logo.jsx";

/* Données de démo (tu pourras brancher sur tes vraies stats) */
const cards = [
  { icon: ShoppingCart, label: "Total Orders", value: "7,390", delta: "+4.7%" },
  { icon: Users2,       label: "Active Customers", value: "45k", delta: "+3.4%" },
  { icon: Box,          label: "Available Products", value: "3,349", delta: "+2.3%" },
  { icon: DollarSign,   label: "Monthly Revenue", value: "$3.5M", delta: "-0.6%" },
];

const tasks = [
  { title: "Update user documentation",  tag: "High" },
  { title: "Review pending orders",      tag: "Low"  },
  { title: "Fix navigation menu bug",    tag: "Critical" },
  { title: "Deploy system updates",      tag: "Medium" },
];

const orders = [
  { id:"#1001", customer:"John Doe",  product:"iPhone 14",     price:"$999",  status:"Completed", date:"2025-07-01" },
  { id:"#1002", customer:"Jane Smith",product:"MacBook Pro",   price:"$2,399",status:"Pending",   date:"2025-07-02" },
  { id:"#1003", customer:"Mike Lee",  product:"AirPods Max",   price:"$549",  status:"Processing",date:"2025-07-03" },
  { id:"#1004", customer:"Lisa Wong", product:"iPad Air",      price:"$699",  status:"Cancelled", date:"2025-07-04" },
  { id:"#1005", customer:"Tom Ford",  product:"Apple Watch",   price:"$399",  status:"Shipped",   date:"2025-07-05" },
];

function StatusChip({ s }) {
  const map = {
    Completed: "chip green",
    Pending: "chip orange",
    Processing: "chip.blue",
    Cancelled: "chip red",
    Shipped: "chip blue"
  };
  const cls =
    s === "Completed" ? "chip green" :
    s === "Pending" ? "chip orange" :
    s === "Processing" ? "chip blue" :
    s === "Cancelled" ? "chip red" :
    "chip blue";
  return <span className={cls}>{s}</span>;
}

export default function AbleTheme() {
  return (
    <div className="theme-neo">
      <div className="grid grid-cols-12 gap-4 p-4">

        {/* Sidebar (desktop) */}
        <aside className="hidden xl:block col-span-2">
          <div className="glass-dark p-4 shadow-neo">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/70 grid place-items-center shadow-neo">
                <span className="font-bold">A</span>
              </div>
              <div className="font-semibold">AFARIS</div>
            </div>

            <nav className="space-y-1">
              {[
                {icon: Star, label:"Analytics", active:true},
                {icon: Clock3, label:"Transport"},
                {icon: Users2, label:"Social"},
                {icon: Settings, label:"HRM"},
                {icon: ShoppingCart, label:"E-commerce"},
                {icon: Box, label:"File Manager"},
              ].map((item,i)=>(
                <button key={i} className={`w-full text-left nav-neo ${item.active?"active":""} block px-3 py-2 rounded-xl hover:bg-white/10`}>
                  <span className="inline-flex items-center gap-2">
                    <item.icon size={16}/>{item.label}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Contenu principal */}
        <div className="col-span-12 xl:col-span-10 space-y-4">
          {/* Topbar */}
          <header className="glass-dark p-3 sticky top-2 z-40 shadow-neo">
            <div className="flex items-center gap-3">
              <button className="xl:hidden btn-neo">Menu</button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-60" size={16}/>
                <input className="input-neo w-full pl-9" placeholder="Search" />
              </div>
              <button className="btn-neo"><Bell size={16}/></button>
              <button className="btn-neo"><Settings size={16}/></button>
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 grid place-items-center">😊</div>
            </div>
          </header>

          {/* KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c,i)=>(
              <div key={i} className="card-neo">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-slate-300">{c.label}</div>
                  <c.icon size={18} className="opacity-70"/>
                </div>
                <div className="text-3xl font-bold">{c.value}</div>
                <div className={`mt-1 text-xs ${c.delta.startsWith("-")?"text-rose-300":"text-emerald-300"}`}>{c.delta}</div>
              </div>
            ))}
          </section>

          {/* Grille 2 colonnes */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tasks */}
            <div className="card-neo">
              <div className="font-semibold mb-2">Tasks</div>
              <ul className="space-y-2">
                {tasks.map((t,i)=>(
                  <li key={i} className="glass-dark p-2 rounded-xl flex items-center justify-between">
                    <span className="text-sm">{t.title}</span>
                    <span className="badge-neo">{t.tag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Orders table */}
            <div className="card-neo">
              <div className="font-semibold mb-2">Orders</div>
              <div className="overflow-auto">
                <table className="w-full table-neo">
                  <thead>
                    <tr>
                      <th>Order #</th><th>Customer</th><th>Product</th>
                      <th>Price</th><th>Status</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o)=>(
                      <tr key={o.id} className="border-t border-white/10 hover:bg-white/5">
                        <td>{o.id}</td>
                        <td className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 grid place-items-center">🙂</div>
                          {o.customer}
                        </td>
                        <td>{o.product}</td>
                        <td>{o.price}</td>
                        <td><StatusChip s={o.status}/></td>
                        <td>{o.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Deux blocs bas (placeholders “Revenue” / “Global Activity”) */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-6">
            <div className="card-neo h-64">
              <div className="font-semibold mb-2">Revenue Statistics</div>
              <div className="h-full grid place-items-center text-slate-400 text-sm">[Graphique à brancher]</div>
            </div>
            <div className="card-neo h-64">
              <div className="font-semibold mb-2">Global User Activity</div>
              <div className="h-full grid place-items-center text-slate-400 text-sm">[Carte/graph à brancher]</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
