import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Users, Settings, Plus, Search, 
  ChevronRight, AlertCircle, User, DollarSign, Laptop, 
  ShieldCheck, Tag, Building2, Printer, Trash2, X, Shield, FileText, Landmark, Lock, Bell, LogOut, Filter, History, Database, BarChart3, CheckCircle2, AlertTriangle, HardDrive, CreditCard, TrendingUp, PieChart, Activity, Download, Calendar, ShoppingCart, Briefcase, Coins, Globe, Menu
} from 'lucide-react';

/**
 * AUTHORIZED PERSONNEL REGISTRY
 */
const AUTHORIZED_USERS = [
  { displayName: "Ranjith O V", username: "ranjukalpetta@gmail.com", password: "Quaggaterm@2026", role: "Chief Asset Officer", initials: "R.O" },
  { displayName: "Operations Lead", username: "ops@itam.gov", password: "Operations@2026", role: "Registry Supervisor", initials: "O.L" },
  { displayName: "Regional Auditor", username: "audit@itam.gov", password: "SecureAudit@2026", role: "Compliance Officer", initials: "R.A" }
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (INR)', rate: 1 },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)', rate: 0.012 },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR)', rate: 0.011 },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP)', rate: 0.0094 },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (JPY)', rate: 1.84 }
];

const INITIAL_ASSETS = [
  { id: 'AST-9001', name: 'Server Node R740', serial: 'SV-78291-X', type: 'Server', user: 'Data Center A', status: 'Deployed', purchaseDate: '2025-01-15', cost: 1000000, currency: 'INR', warrantyExp: '2028-01-15', usefulLife: 5, lastVerified: '2026-04-10' },
  { id: 'AST-9002', name: 'Workstation Z8 G5', serial: 'WS-11022-P', type: 'Workstation', user: 'Engineering', status: 'In Stock', purchaseDate: '2025-11-20', cost: 350000, currency: 'INR', warrantyExp: '2027-11-20', usefulLife: 4, lastVerified: '2026-03-05' },
];

/**
 * AMORTIZATION LOGIC
 */
const calculateDepreciation = (asset) => {
  if (!asset || !asset.purchaseDate || !asset.cost || !asset.usefulLife) return 0;
  try {
    const purchaseDate = new Date(asset.purchaseDate);
    if (isNaN(purchaseDate.getTime())) return 0;
    const today = new Date();
    const ageInMonths = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth());
    const usefulLifeMonths = (asset.usefulLife || 1) * 12;
    if (ageInMonths <= 0) return asset.cost;
    if (ageInMonths >= usefulLifeMonths) return 0;
    const monthlyDepreciation = asset.cost / usefulLifeMonths;
    const currentVal = asset.cost - (monthlyDepreciation * ageInMonths);
    return isNaN(currentVal) ? 0 : Math.max(0, currentVal);
  } catch (e) { return 0; }
};

// --- SHARED UI COMPONENTS ---
const Badge = ({ children }) => {
  const styles = {
    deployed: 'bg-blue-100 text-blue-800 border-blue-200',
    'in stock': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    maintenance: 'bg-amber-100 text-amber-800 border-amber-200',
    retired: 'bg-slate-200 text-slate-700 border-slate-300',
    pending: 'bg-orange-100 text-orange-800 border-orange-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    default: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight ${styles[String(children).toLowerCase()] || styles.default}`}>
      {children}
    </span>
  );
};

const Card = ({ children, title, icon: Icon, subtitle, action }) => {
  const IconComp = Icon || Shield;
  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md text-left">
      <div className="px-4 md:px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-md border border-slate-200 text-blue-900">
            <IconComp size={16} />
          </div>
          <div className="text-left leading-none">
            <h3 className="text-[10px] md:text-xs font-black text-slate-900 uppercase tracking-widest">{title}</h3>
            {subtitle && <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase mt-1">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-4 md:p-5 flex-1">{children}</div>
    </div>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assets, setAssets] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [sysCurrency, setSysCurrency] = useState(CURRENCIES[0]);
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [fbRefs, setFbRefs] = useState({ auth: null, db: null });

  const [reportDates, setReportDates] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      #root { max-width: 100% !important; margin: 0 !important; padding: 0 !important; width: 100vw !important; height: 100vh !important; text-align: left !important; display: block !important; }
      body { margin: 0; padding: 0; overflow: hidden; background: #f8fafc; }
      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      .gov-active { background: #1e3a8a !important; color: white !important; border-left: 4px solid #60a5fa !important; }
      .animate-in { animation: fadeIn 0.2s ease-out; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);

    const loadCore = async () => {
      try {
        const scriptUrls = [
          'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
          'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js',
          'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js' 
        ];
        for (const url of scriptUrls) {
          await new Promise((res, rej) => {
            const script = document.createElement('script');
            script.src = url; script.async = true; script.onload = res; script.onerror = rej;
            document.head.appendChild(script);
          });
        }

        const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
        if (!configStr) {
          setIsLocalMode(true); setAssets(INITIAL_ASSETS); setIsSystemReady(true); return;
        }
        const app = window.firebase.initializeApp(JSON.parse(configStr));
        const auth = app.auth(); const db = app.firestore();
        setFbRefs({ auth, db });
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-pro-v2';
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await auth.signInWithCustomToken(__initial_auth_token);
        else await auth.signInAnonymously();

        db.collection(`/artifacts/${appId}/public/data/assets`).onSnapshot((snap) => {
          const docs = []; snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
          setAssets(docs.length ? docs : INITIAL_ASSETS);
        });
        db.collection(`/artifacts/${appId}/public/data/purchase_orders`).onSnapshot((snap) => {
          const docs = []; snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
          setPurchaseOrders(docs); setIsSystemReady(true);
        }, () => { setIsLocalMode(true); setAssets(INITIAL_ASSETS); setIsSystemReady(true); });
      } catch (err) { setIsLocalMode(true); setAssets(INITIAL_ASSETS); setIsSystemReady(true); }
    };
    loadCore();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const user = AUTHORIZED_USERS.find(u => u.username.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword);
    if (user) {
      setIsLoggedIn(true); setCurrentUser(user); setLoginError('');
      setAuditLog(prev => [{ action: 'System Access Granted', user: user.displayName, timestamp: new Date().toISOString(), id: Date.now() }, ...prev]);
    } else setLoginError('Invalid Identification: Access Restricted.');
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const currency = CURRENCIES.find(c => c.code === fd.get('currency'));
    const poData = {
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      item: fd.get('item'),
      quantity: parseInt(fd.get('qty')),
      unitPrice: parseFloat(fd.get('price')),
      vendor: fd.get('vendor'),
      currency: fd.get('currency'),
      symbol: currency.symbol,
      status: 'Pending Approval',
      requestor: currentUser?.displayName,
      date: new Date().toISOString().split('T')[0],
      total: parseInt(fd.get('qty')) * parseFloat(fd.get('price'))
    };
    if (!isLocalMode && fbRefs.db) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-pro-v2';
      await fbRefs.db.collection(`/artifacts/${appId}/public/data/purchase_orders`).add(poData);
    } else setPurchaseOrders(prev => [poData, ...prev]);
    setIsPOModalOpen(false);
  };

  const handleDownloadPOPDF = (po) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFillColor(2, 6, 23); doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text('GOVERNMENT OF NEXUS', 20, 25);
    doc.setFontSize(10); doc.text('CENTRAL IT ASSET MANAGEMENT BUREAU', 20, 32);
    doc.setTextColor(0); doc.text(`PO: ${po.poNumber}`, 20, 60);
    doc.text(`VENDOR: ${po.vendor}`, 20, 70);
    doc.text(`ITEM: ${po.item}`, 20, 80);
    doc.text(`TOTAL: ${po.symbol}${po.total.toLocaleString()} ${po.currency}`, 20, 90);
    doc.save(`${po.poNumber}_REQUISITION.pdf`);
  };

  const handleGenerateReport = () => {
    const start = new Date(reportDates.start);
    const end = new Date(reportDates.end);
    const targetAssets = assets.filter(a => { const p = new Date(a.purchaseDate); return p >= start && p <= end; });
    const csv = ["Node ID,Nomenclature,Serial,Status,Value", ...targetAssets.map(a => `${a.id},"${a.name}",${a.serial},${a.status},${Math.round(calculateDepreciation(a))}`)].join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "ITAM_REPORT.csv"; link.click();
  };

  const handleVerifyAsset = async (asset) => {
    if (!isLocalMode && fbRefs.db) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-pro-v2';
      await fbRefs.db.doc(`/artifacts/${appId}/public/data/assets/${asset.id}`).update({ lastVerified: new Date().toISOString().split('T')[0] });
    } else {
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, lastVerified: new Date().toISOString().split('T')[0] } : a));
    }
    setSelectedAsset(null);
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const assetData = {
      name: fd.get('name'), serial: fd.get('serial'), type: fd.get('type'), status: 'In Stock', user: 'Unassigned',
      currency: fd.get('currency'), purchaseDate: fd.get('date'), cost: parseFloat(fd.get('cost')) || 0,
      usefulLife: parseInt(fd.get('life')) || 4, lastVerified: new Date().toISOString().split('T')[0]
    };
    if (!isLocalMode && fbRefs.db) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-pro-v2';
      await fbRefs.db.collection(`/artifacts/${appId}/public/data/assets`).add(assetData);
    } else setAssets(prev => [{ id: 'L-' + Date.now(), ...assetData }, ...prev]);
    setIsAddModalOpen(false);
  };

  const stats = useMemo(() => {
    const totalVal = assets.reduce((acc, a) => {
      const depValue = calculateDepreciation(a);
      const assetCurrency = CURRENCIES.find(c => c.code === (a.currency || 'INR'));
      return acc + ((depValue / (assetCurrency?.rate || 1)) * sysCurrency.rate);
    }, 0);
    return { totalVal, count: assets.length, expired: assets.filter(a => a.warrantyExp && new Date(a.warrantyExp) < new Date()).length, critical: assets.filter(a => a.cost > 0 && (calculateDepreciation(a) / a.cost) < 0.2).length };
  }, [assets, sysCurrency]);

  const filteredAssets = assets.filter(a => (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (a.serial || '').toLowerCase().includes(searchQuery.toLowerCase()));

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020617] px-4">
        <div className="w-full max-w-sm p-6 md:p-10 bg-white rounded-xl shadow-2xl z-10 text-left animate-in border-b-[12px] border-blue-900">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-slate-900 text-blue-400 rounded-2xl mb-6 border border-slate-700">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase">Nexus ITAM</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Government Asset Command</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4 md:space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Official ID</label>
              <input type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:border-blue-900 outline-none" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Secure Key</label>
              <input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold focus:border-blue-900 outline-none" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            </div>
            {loginError && <div className="p-3 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg uppercase flex items-center gap-2"><AlertCircle size={14}/> {loginError}</div>}
            <button type="submit" className="w-full bg-blue-900 text-white py-4 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg active:scale-95">Authorize Access</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-900 flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#010413] border-b border-slate-800 p-4 flex items-center justify-between z-[110]">
        <div className="flex items-center gap-2">
          <Landmark size={20} className="text-blue-500" />
          <span className="text-sm font-black text-white tracking-widest">NEXUS PRO</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-300"><Menu size={24} /></button>
      </div>

      {/* Responsive Sidebar */}
      <aside className={`
        fixed md:relative inset-0 md:inset-auto z-[100] md:z-0 w-full md:w-72 
        bg-[#020617] md:bg-[#020617] flex flex-col shrink-0 text-slate-300
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between md:bg-[#010413]">
          <div className="flex items-center gap-3">
            <Landmark size={28} className="text-blue-500" />
            <div className="leading-tight">
              <span className="text-lg font-black block text-white tracking-tighter">NEXUS PRO</span>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest leading-none">Asset Bureau</span>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500"><X size={24}/></button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-6 text-left">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-4">Core Modules</p>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Central Command' },
            { id: 'inventory', icon: Package, label: 'Master Registry' },
            { id: 'audits', icon: History, label: 'System Audit' },
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-tight ${activeTab === item.id ? 'gov-active' : 'hover:bg-slate-800/50 hover:text-white text-slate-500'}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-4 mt-8">Administrative</p>
          {[
            { id: 'procurement', icon: CreditCard, label: 'Procurement' },
            { id: 'reports', icon: BarChart3, label: 'Fiscal Reports' },
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-tight ${activeTab === item.id ? 'gov-active' : 'hover:bg-slate-800/50 hover:text-white text-slate-500'}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 bg-[#010413] border-t border-slate-800">
           <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center font-black text-xs text-blue-100 uppercase">{currentUser?.initials || 'U'}</div>
              <div className="flex-1 min-w-0 text-left">
                 <p className="text-[10px] font-black text-white truncate leading-none">{currentUser?.displayName}</p>
                 <p className="text-[8px] text-blue-500 font-bold uppercase tracking-tighter mt-1 leading-none">{currentUser?.role}</p>
              </div>
              <button onClick={() => setIsLoggedIn(false)} className="text-slate-500"><LogOut size={14}/></button>
           </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className={`px-4 md:px-8 py-2 flex items-center justify-between border-b text-[8px] md:text-[10px] font-black uppercase tracking-widest shrink-0 ${isLocalMode ? 'bg-amber-500 text-white' : 'bg-blue-900 text-white'}`}>
           <div className="flex items-center gap-2 md:gap-3">
              <Shield size={12} />
              <span className="truncate max-w-[200px] md:max-w-none">Verified Active • {sysCurrency.code}</span>
           </div>
           <div className="hidden sm:flex items-center gap-4 font-mono">
              <Database size={12}/> DB_SYNC_SECURE
           </div>
        </div>

        <header className="min-h-20 bg-white border-b border-slate-200 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 py-4 md:py-0 shadow-sm shrink-0">
          <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Query Ledger..." className="w-full md:w-[300px] lg:w-[400px] bg-slate-100 border-none rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-xl">
               <Globe size={12} className="text-slate-400 ml-1" />
               <select className="bg-transparent border-none text-[9px] font-black uppercase outline-none focus:ring-0 cursor-pointer pr-3" value={sysCurrency.code} onChange={(e) => setSysCurrency(CURRENCIES.find(c => c.code === e.target.value))}>
                 {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
               </select>
            </div>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="w-full md:w-auto bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all uppercase leading-none"><Plus size={16}/> Certify Asset</button>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6 md:space-y-10 animate-in">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 md:space-y-10">
               {/* KPI GRID */}
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {[
                    { label: `Registry Value (${sysCurrency.code})`, v: `${sysCurrency.symbol}${Math.round(stats.totalVal || 0).toLocaleString()}`, icon: Coins, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                    { label: 'Managed Nodes', v: stats.count || 0, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
                    { label: 'Critical Breaches', v: stats.expired || 0, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-500/10' },
                    { label: 'Lifecycle Alert', v: stats.critical || 0, icon: HardDrive, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-5 md:p-7 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm group hover:border-blue-300 transition-all text-left">
                       <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 md:mb-6 leading-none border-b border-slate-50 pb-3">{s.label}</p>
                       <div className="flex items-center justify-between">
                          <h4 className="text-xl md:text-2xl font-black text-slate-900 tabular-nums leading-none">{s.v}</h4>
                          <div className={`${s.bg} ${s.color} p-2.5 rounded-xl`}><s.icon size={20} /></div>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                  <div className="lg:col-span-2">
                    <Card title="Database Amortization" subtitle="Live Fiscal Projections" icon={BarChart3}>
                       <div className="space-y-3 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-1">
                          {assets.map(a => {
                            const curVal = calculateDepreciation(a);
                            const assetCurrency = CURRENCIES.find(c => c.code === (a.currency || 'INR'));
                            const displayVal = (curVal / (assetCurrency?.rate || 1)) * sysCurrency.rate;
                            const percent = Math.min(100, Math.max(0, a.cost > 0 ? (curVal / a.cost) * 100 : 0));
                            return (
                              <div key={a.id} className="flex flex-col p-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all cursor-pointer shadow-sm" onClick={() => setSelectedAsset(a)}>
                                 <div className="flex justify-between items-center mb-3">
                                   <div className="flex items-center gap-3">
                                      <Laptop size={14} className="text-slate-400" />
                                      <p className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[120px] md:max-w-none">{a.name}</p>
                                   </div>
                                   <p className="text-[11px] font-black text-slate-900 tabular-nums">{sysCurrency.symbol}{Math.round(displayVal).toLocaleString()}</p>
                                 </div>
                                 <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                   <div className={`h-full transition-all duration-1000 ${percent < 25 ? 'bg-rose-600' : 'bg-blue-600'}`} style={{ width: `${percent}%` }}></div>
                                 </div>
                               </div>
                             );
                           })}
                       </div>
                    </Card>
                  </div>
                  <Card title="Sync Status" subtitle="Cluster sync integrity">
                    <div className="flex flex-col gap-4 py-2">
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase leading-none">
                          <span>Registry Link</span>
                          <span className={`font-black uppercase ${isLocalMode ? 'text-amber-600' : 'text-emerald-700'}`}>{isLocalMode ? 'Local_Only' : 'Certified'}</span>
                        </div>
                        <div className="p-4 bg-[#020617] rounded-xl shadow-inner text-left">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">System Load</p>
                          <div className="flex items-center gap-3">
                              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: '92%' }}></div>
                              </div>
                              <span className="text-[8px] font-black text-blue-400 uppercase">Optimal</span>
                          </div>
                        </div>
                    </div>
                  </Card>
               </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4 animate-in text-left">
               <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter border-b-2 border-slate-300 pb-3 flex justify-between items-center leading-none">
                  Master Ledger
                  <span className="text-[10px] font-black text-slate-400 tabular-nums uppercase">{assets.length} Entries</span>
               </h2>
               <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden text-left">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse leading-none min-w-[700px]">
                      <thead className="bg-slate-50 border-b border-slate-300 text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none text-left">
                        <tr>
                          <th className="px-6 py-5">Ref ID</th>
                          <th className="px-6 py-5">Equipment & Serial</th>
                          <th className="px-6 py-5">Status</th>
                          <th className="px-6 py-5">Current Value</th>
                          <th className="px-6 py-5 text-right">Access</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-bold text-slate-700 leading-none">
                        {filteredAssets.map(a => {
                            const curVal = calculateDepreciation(a);
                            const assetCurrency = CURRENCIES.find(c => c.code === (a.currency || 'INR'));
                            const displayVal = (curVal / (assetCurrency?.rate || 1)) * sysCurrency.rate;
                            return (
                              <tr key={a.id} className="hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setSelectedAsset(a)}>
                                <td className="px-6 py-4 font-mono text-[10px] text-blue-900 italic">#{a.id.substring(0, 8)}</td>
                                <td className="px-6 py-4 uppercase font-black">
                                  <p>{a.name}</p>
                                  <div className="text-[8px] text-slate-400 font-normal mt-1">S/N: {a.serial}</div>
                                </td>
                                <td className="px-6 py-4"><Badge>{a.status}</Badge></td>
                                <td className="px-6 py-4 tabular-nums text-sm">{sysCurrency.symbol}{Math.round(displayVal).toLocaleString()}</td>
                                <td className="px-6 py-4 text-right"><ChevronRight size={16} className="text-slate-300 ml-auto" /></td>
                              </tr>
                            );
                        })}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'procurement' && (
            <div className="space-y-8 animate-in text-left">
               <div className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-slate-200 pb-6 gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">Procurement</h2>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acquisitions Ledger</p>
                  </div>
                  <button onClick={() => setIsPOModalOpen(true)} className="w-full sm:w-auto bg-blue-900 text-white px-6 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-3 shadow-xl active:scale-95 uppercase tracking-widest leading-none"><Plus size={18}/> New Requisition</button>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <Card title="Active Requisitions" icon={Briefcase}>
                       {purchaseOrders.length === 0 ? (
                         <div className="p-20 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl uppercase font-black text-[10px] tracking-widest">No pending requisition nodes</div>
                       ) : (
                         <div className="space-y-4">
                           {purchaseOrders.map(po => (
                             <div key={po.id} className="p-4 border border-slate-200 rounded-xl bg-white hover:border-blue-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                                <div className="flex items-center gap-4">
                                   <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-blue-50"><FileText size={18} className="text-slate-400" /></div>
                                   <div>
                                      <p className="text-xs font-black text-slate-900 uppercase">{po.poNumber}</p>
                                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">{po.vendor} • {po.item}</p>
                                   </div>
                                </div>
                                <div className="flex items-center justify-between w-full sm:w-auto gap-4 border-t sm:border-none pt-4 sm:pt-0">
                                   <div className="text-right leading-none">
                                      <p className="text-xs font-black text-slate-900 tabular-nums">{po.symbol}{po.total.toLocaleString()} <span className="text-[8px] text-slate-400">{po.currency}</span></p>
                                      <div className="mt-1"><Badge>{po.status}</Badge></div>
                                   </div>
                                   <button onClick={() => handleDownloadPOPDF(po)} className="flex items-center gap-2 p-2 px-3 text-[9px] font-black bg-slate-900 text-white rounded-lg active:scale-95 uppercase tracking-widest">
                                      <Download size={12} /> PDF
                                   </button>
                                </div>
                             </div>
                           ))}
                         </div>
                       )}
                    </Card>
                  </div>
                  <Card title="Vetted Entities" icon={Landmark}>
                     <div className="space-y-3">
                        {['Dell Gov India', 'Apple Corp', 'Insight Global'].map(v => (
                           <div key={v} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center transition-all hover:bg-white cursor-default group">
                              <span className="text-[10px] font-black text-slate-700 uppercase">{v}</span>
                              <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Vetted</span>
                           </div>
                        ))}
                     </div>
                  </Card>
               </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-8 animate-in text-left">
              <div className="flex flex-col md:flex-row items-center justify-between border-b-2 border-slate-200 pb-6 gap-6">
                 <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Fiscal Reporting</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Generate Documentation in {sysCurrency.code}</p>
                 </div>
                 <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3 sm:border-r border-slate-100 flex-1 sm:flex-none">
                       <Calendar size={14} className="text-slate-400" />
                       <input type="date" className="text-[10px] font-black uppercase outline-none bg-transparent" value={reportDates.start} onChange={e => setReportDates({...reportDates, start: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-2 px-3 flex-1 sm:flex-none">
                       <span className="text-[9px] font-bold text-slate-300">TO</span>
                       <input type="date" className="text-[10px] font-black uppercase outline-none bg-transparent" value={reportDates.end} onChange={e => setReportDates({...reportDates, end: e.target.value})} />
                    </div>
                    <button onClick={handleGenerateReport} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                      <Download size={14} /> Generate CSV
                    </button>
                 </div>
              </div>
              <Card title="Report Data Visualization" icon={Activity}>
                 <div className="h-60 flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-3xl">
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Select cycle dates to refresh projections...</p>
                 </div>
              </Card>
            </div>
          )}

          {activeTab === 'audits' && (
            <div className="space-y-6 animate-in text-left">
               <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter text-left border-b-2 border-slate-200 pb-6">System Security Audit</h2>
               <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden text-left">
                  <div className="divide-y divide-slate-100">
                     {auditLog.map(log => (
                       <div key={log.id} className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:bg-slate-50">
                          <div className="flex items-center gap-4 text-left leading-none">
                             <div className="w-2 h-2 bg-blue-900 rounded-full shadow-[0_0_8px_rgba(30,58,138,0.3)]"></div>
                             <div className="leading-none text-left">
                                <span className="font-black text-slate-900 uppercase tracking-tight text-xs md:text-sm leading-none">{log.action}</span>
                                {log.target && <span className="text-slate-400 block sm:inline sm:ml-4 uppercase text-[8px] md:text-[10px] bg-slate-100 px-2 py-0.5 rounded mt-1 sm:mt-0">TGT: {log.target}</span>}
                             </div>
                          </div>
                          <div className="text-right leading-none w-full sm:w-auto border-t sm:border-none pt-3 sm:pt-0 mt-2 sm:mt-0">
                             <p className="font-black text-slate-700 uppercase leading-none">{log.user}</p>
                             <p className="text-[8px] md:text-[10px] text-slate-400 font-black mt-2 leading-none uppercase tabular-nums">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Global Loading Overlay */}
        {!isSystemReady && (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-6">
             <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-6"></div>
             <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse text-center leading-relaxed">
                SYNCHRONIZING CONSOLIDATED<br/>ITAM REGISTRY CLUSTER...
             </p>
          </div>
        )}
        
        {/* Detail Slide-Over (Responsive) */}
        {selectedAsset && (
          <div className="absolute inset-0 z-[120] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedAsset(null)}></div>
            <div className="relative w-full max-w-full md:max-w-md bg-white h-full shadow-2xl flex flex-col animate-in border-l-0 md:border-l-8 border-blue-900 text-left">
               <div className="p-6 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50 text-left">
                  <div className="leading-none text-left">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Security Dossier</h2>
                    <p className="text-[9px] text-blue-900 font-bold mt-2 uppercase tracking-widest font-mono">ID: {selectedAsset.id}</p>
                  </div>
                  <button onClick={() => setSelectedAsset(null)} className="p-2 border border-slate-300 rounded-lg bg-white text-slate-500 shadow-sm"><X size={20} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left leading-none uppercase">
                  <div className="p-6 bg-white border border-slate-300 rounded-2xl shadow-inner flex flex-col items-center text-center">
                     <Landmark size={20} className="text-slate-400 mb-6" />
                     <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight text-center">{selectedAsset.name}</h3>
                     <p className="text-[10px] font-bold text-slate-500 mt-2 bg-slate-100 px-3 py-1 rounded italic font-mono uppercase tracking-widest">S/N: {selectedAsset.serial}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-slate-300 border border-slate-300 rounded-xl overflow-hidden shadow-md">
                     <div className="p-4 bg-white text-left leading-none">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Registry Basis</p>
                        <p className="text-base font-black text-slate-900 tabular-nums">
                           {CURRENCIES.find(c => c.code === (selectedAsset.currency || 'INR'))?.symbol}{selectedAsset.cost?.toLocaleString()}
                        </p>
                     </div>
                     <div className="p-4 bg-slate-50 text-left leading-none">
                        <p className="text-[8px] font-black text-blue-400 uppercase mb-2">Current Value</p>
                        <p className="text-base font-black text-blue-900 tabular-nums">
                           {CURRENCIES.find(c => c.code === (selectedAsset.currency || 'INR'))?.symbol}{Math.round(calculateDepreciation(selectedAsset)).toLocaleString()}
                        </p>
                     </div>
                  </div>
                  <div className="border border-slate-300 rounded-xl overflow-hidden divide-y divide-slate-100 font-black">
                     {[
                       { l: 'Lead User', v: selectedAsset.user },
                       { l: 'Cert. Date', v: selectedAsset.purchaseDate },
                       { l: 'Currency', v: selectedAsset.currency || 'INR' },
                       { l: 'Service Period', v: `${selectedAsset.usefulLife} Years` },
                     ].map((row, i) => (
                       <div key={i} className="flex justify-between p-3.5 text-[10px] bg-white transition-colors">
                          <span className="text-slate-400 uppercase tracking-widest leading-none">{row.l}</span>
                          <span className="text-slate-800 uppercase text-right leading-none font-black">{row.v}</span>
                       </div>
                     ))}
                  </div>
               </div>
               <div className="p-6 border-t-2 border-slate-200 grid grid-cols-2 gap-2 bg-slate-50 shrink-0">
                  <button onClick={() => handleVerifyAsset(selectedAsset)} className="flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-lg text-[10px] font-black hover:bg-emerald-700 transition-all uppercase tracking-widest shadow-lg active:scale-95 leading-none">
                    <CheckCircle2 size={16} /> Verify Audit
                  </button>
                  <button onClick={() => deleteAsset(selectedAsset.id)} className="flex items-center justify-center gap-3 py-4 bg-white border border-slate-300 rounded-lg text-[10px] font-black text-rose-700 hover:bg-rose-50 transition-all uppercase tracking-widest active:scale-95 leading-none">
                    <Trash2 size={14} /> Purge
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Responsive Modals */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-xl border-t-8 border-blue-900 w-full max-w-xl shadow-2xl overflow-hidden animate-in text-left flex flex-col max-h-[90vh]">
               <div className="p-6 md:p-8 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                  <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Registry Certification</h2>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
               </div>
               <form onSubmit={handleAddAsset} className="p-6 md:p-8 space-y-6 overflow-y-auto text-left leading-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 uppercase text-left">
                     <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest">Nomenclature</label>
                        <input name="name" required className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-xs font-black outline-none focus:bg-white transition-all uppercase" placeholder="e.g. INFRA_NODE_X" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest">Identifier (S/N)</label>
                        <input name="serial" required className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-xs font-black outline-none transition-all" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest">Category</label>
                        <select name="type" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-xs font-black outline-none uppercase transition-all">
                           <option>Standard Workstation</option>
                           <option>Infrastructure Server</option>
                           <option>Network Node</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest">Purchase Cost</label>
                        <input name="cost" type="number" required className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-xs font-black outline-none transition-all" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest">Currency</label>
                        <select name="currency" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-xs font-black outline-none uppercase transition-all">
                           {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest">Service Life (Y)</label>
                        <input name="life" type="number" defaultValue="4" className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-xs font-black outline-none transition-all" />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest">Acquisition Date</label>
                        <input name="date" type="date" required className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-xs font-black outline-none transition-all" />
                     </div>
                  </div>
                  <div className="flex gap-4 pt-6 shrink-0">
                     <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-500 bg-slate-100 rounded-lg border border-slate-200 uppercase tracking-widest">Abort</button>
                     <button type="submit" className="flex-1 py-4 bg-blue-900 text-white rounded-lg text-[10px] font-black hover:bg-blue-800 uppercase tracking-widest shadow-xl transition-all">Execute registration</button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {isPOModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl">
            <div className="bg-white rounded-3xl border-t-[12px] border-blue-900 w-full max-w-2xl shadow-2xl overflow-hidden animate-in text-left flex flex-col max-h-[95vh]">
               <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
                  <div>
                     <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">Purchase Requisition</h2>
                     <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 leading-none">Fiscal Form 14-C • Official Commitments</p>
                  </div>
                  <button onClick={() => setIsPOModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={24} /></button>
               </div>
               <form onSubmit={handleCreatePO} className="p-8 space-y-6 overflow-y-auto text-left leading-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 uppercase text-left leading-none">
                     <div className="md:col-span-2 text-left leading-none">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-3 tracking-widest uppercase">Hardware Specifications</label>
                        <input name="item" required className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none focus:bg-white focus:border-blue-900 transition-all uppercase placeholder:italic leading-none" placeholder="e.g. HIGH-PERFORMANCE CLUSTER NODE" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-3 tracking-widest text-left uppercase">Authorized Vendor</label>
                        <select name="vendor" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none uppercase transition-all focus:bg-white">
                           <option>Dell Gov India</option><option>Apple Corporate</option><option>Reliance Pro IT</option><option>Insight Global</option>
                        </select>
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-3 tracking-widest text-left uppercase">Operating Currency</label>
                        <select name="currency" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none uppercase transition-all focus:bg-white">
                           {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-3 tracking-widest text-left uppercase">Qty</label>
                        <input name="qty" type="number" required defaultValue="1" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none focus:bg-white focus:border-blue-900 transition-all font-mono" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] md:text-[11px] font-black text-slate-500 mb-3 tracking-widest text-left uppercase">Unit Cost</label>
                        <input name="price" type="number" required placeholder="0.00" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none focus:bg-white focus:border-blue-900 transition-all font-mono" />
                     </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 pt-8 shrink-0">
                     <button type="button" onClick={() => setIsPOModalOpen(false)} className="flex-1 py-5 text-[11px] font-black text-slate-500 bg-slate-100 rounded-xl border border-slate-200 uppercase tracking-widest">Abort</button>
                     <button type="submit" className="flex-1 py-5 bg-blue-900 text-white rounded-xl text-[11px] font-black hover:bg-blue-800 uppercase tracking-widest shadow-2xl transition-all active:scale-95">Generate Requisition</button>
                  </div>
               </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const ランドマーク = Landmark;