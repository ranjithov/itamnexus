import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Users, Settings, Plus, Search, 
  ChevronRight, AlertCircle, User, DollarSign, Laptop, 
  ShieldCheck, Tag, Building2, Printer, Trash2, X, Shield, FileText, Landmark, Lock, Bell, LogOut, Filter, History, Database, BarChart3, CheckCircle2, AlertTriangle, HardDrive, CreditCard, TrendingUp, PieChart, Activity, Download, Calendar, ShoppingCart, Briefcase, Coins, Globe
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
  } catch (e) {
    return 0;
  }
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
    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight ${styles[String(children).toLowerCase()] || styles.default}`}>
      {children}
    </span>
  );
};

const Card = ({ children, title, icon: Icon, subtitle, action }) => {
  const IconComp = Icon || Shield;
  return (
    <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden transition-all hover:shadow-md text-left">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-md border border-slate-200 text-blue-900">
            <IconComp size={16} />
          </div>
          <div className="text-left leading-none">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">{title}</h3>
            {subtitle && <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5 flex-1">{children}</div>
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
  
  // Global Currency State
  const [sysCurrency, setSysCurrency] = useState(CURRENCIES[0]); // Default INR
  
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [systemError, setSystemError] = useState(null);
  const [fbRefs, setFbRefs] = useState({ auth: null, db: null });

  // Report Dates State
  const [reportDates, setReportDates] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  /**
   * 1. SYSTEM INITIALIZATION
   */
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      #root { 
        max-width: 100% !important; 
        margin: 0 !important; 
        padding: 0 !important; 
        width: 100vw !important; 
        height: 100vh !important; 
        text-align: left !important;
        display: block !important;
        font-family: system-ui, -apple-system, sans-serif !important;
      }
      body { margin: 0; padding: 0; overflow: hidden; background: #f8fafc; }
      * { box-sizing: border-box; }
      .gov-sidebar { background: #020617; }
      .gov-active { background: #1e3a8a !important; color: white !important; border-left: 4px solid #60a5fa !important; }
      .animate-in { animation: fadeIn 0.2s ease-out; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      .tabular-nums { font-variant-numeric: tabular-nums; }
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
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${url}`));
            document.head.appendChild(script);
          });
        }

        if (!window.firebase) throw new Error("Cloud SDK failed to initialize.");

        const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
        if (!configStr) {
          setIsLocalMode(true);
          setAssets(INITIAL_ASSETS);
          setIsSystemReady(true);
          return;
        }

        const config = JSON.parse(configStr);
        const app = window.firebase.initializeApp(config);
        const auth = app.auth();
        const db = app.firestore();
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-pro-v2';

        setFbRefs({ auth, db });

        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await auth.signInWithCustomToken(__initial_auth_token);
        } else {
          await auth.signInAnonymously();
        }

        db.collection(`/artifacts/${appId}/public/data/assets`).onSnapshot((snap) => {
          const docs = [];
          snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
          setAssets(docs.length ? docs : INITIAL_ASSETS);
        });

        db.collection(`/artifacts/${appId}/public/data/purchase_orders`).onSnapshot((snap) => {
          const docs = [];
          snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
          setPurchaseOrders(docs);
          setIsSystemReady(true);
        }, (err) => {
          setIsLocalMode(true);
          setAssets(INITIAL_ASSETS);
          setIsSystemReady(true);
        });

      } catch (err) {
        setIsLocalMode(true);
        setAssets(INITIAL_ASSETS);
        setIsSystemReady(true);
      }
    };

    loadCore();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const authorized = AUTHORIZED_USERS.find(
      u => u.username.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword
    );

    if (authorized) {
      setIsLoggedIn(true);
      setCurrentUser(authorized);
      setLoginError('');
      setAuditLog(prev => [{
        action: 'System Access Granted',
        user: authorized.displayName,
        timestamp: new Date().toISOString(),
        id: Date.now()
      }, ...prev]);
    } else {
      setLoginError('Invalid Identification: Access Restricted.');
    }
  };

  /**
   * PURCHASE ORDER ENGINE
   */
  const handleCreatePO = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const currencyCode = fd.get('currency');
    const currency = CURRENCIES.find(c => c.code === currencyCode);
    
    const poData = {
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      item: fd.get('item'),
      quantity: parseInt(fd.get('qty')),
      unitPrice: parseFloat(fd.get('price')),
      vendor: fd.get('vendor'),
      currency: currencyCode,
      symbol: currency.symbol,
      status: 'Pending Approval',
      requestor: currentUser?.displayName,
      date: new Date().toISOString().split('T')[0],
      total: parseInt(fd.get('qty')) * parseFloat(fd.get('price'))
    };

    if (!isLocalMode && fbRefs.db) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-pro-v2';
      try {
        await fbRefs.db.collection(`/artifacts/${appId}/public/data/purchase_orders`).add(poData);
      } catch (err) {
        setPurchaseOrders(prev => [poData, ...prev]);
      }
    } else {
      setPurchaseOrders(prev => [poData, ...prev]);
    }

    setAuditLog(prev => [{
      action: 'PO Requisition Created',
      user: currentUser?.displayName,
      target: poData.poNumber,
      timestamp: new Date().toISOString(),
      id: Date.now()
    }, ...prev]);

    setIsPOModalOpen(false);
  };

  const handleDownloadPOPDF = (po) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const margin = 20;

    doc.setFillColor(2, 6, 23); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVERNMENT OF NEXUS', margin, 25);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('CENTRAL IT ASSET MANAGEMENT BUREAU', margin, 32);

    doc.setTextColor(2, 6, 23);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE REQUISITION', margin, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`PO NUMBER:`, 140, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(po.poNumber, 170, 55);
    
    doc.setFont('helvetica', 'bold');
    doc.text(`DATE:`, 140, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(po.date, 170, 62);

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 75, 190, 75);

    doc.setFont('helvetica', 'bold');
    doc.text('VENDOR INFORMATION', margin, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(po.vendor, margin, 92);

    doc.setFont('helvetica', 'bold');
    doc.text('REQUESTOR', 120, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(po.requestor, 120, 92);

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, 110, 170, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', margin + 5, 117);
    doc.text('QTY', 110, 117);
    doc.text('UNIT COST', 140, 117);
    doc.text('TOTAL', 170, 117);

    doc.setFont('helvetica', 'normal');
    doc.text(po.item, margin + 5, 130);
    doc.text(po.quantity.toString(), 110, 130);
    doc.text(`${po.symbol}${po.unitPrice.toLocaleString()}`, 140, 130);
    doc.text(`${po.symbol}${po.total.toLocaleString()}`, 170, 130);

    doc.line(margin, 140, 190, 140);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('GRAND TOTAL:', 120, 155);
    doc.text(`${po.symbol}${po.total.toLocaleString()} ${po.currency}`, 160, 155);

    doc.save(`${po.poNumber}_REQUISITION.pdf`);
  };

  const handleGenerateReport = () => {
    const start = new Date(reportDates.start);
    const end = new Date(reportDates.end);
    const targetAssets = assets.filter(a => {
      const pDate = new Date(a.purchaseDate);
      return pDate >= start && pDate <= end;
    });

    if (targetAssets.length === 0) return;

    const headers = ["Node ID", "Nomenclature", "Serial", "Classification", "Purchase Date", "Currency", "Original Basis", "Book Value"];
    const rows = targetAssets.map(a => [
      a.id, `"${a.name}"`, a.serial, a.type, a.purchaseDate, a.currency || 'INR', a.cost, Math.round(calculateDepreciation(a))
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `ITAM_FISCAL_REPORT_${reportDates.start}_TO_${reportDates.end}.csv`);
    link.click();
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
      name: fd.get('name'),
      serial: fd.get('serial'),
      type: fd.get('type'),
      status: 'In Stock',
      user: 'Unassigned',
      currency: fd.get('currency'),
      purchaseDate: fd.get('date'),
      cost: parseFloat(fd.get('cost')) || 0,
      usefulLife: parseInt(fd.get('life')) || 4,
      createdAt: new Date().toISOString(),
      officer: currentUser?.displayName,
      lastVerified: new Date().toISOString().split('T')[0]
    };

    if (!isLocalMode && fbRefs.db) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-pro-v2';
      try {
        await fbRefs.db.collection(`/artifacts/${appId}/public/data/assets`).add(assetData);
        setIsAddModalOpen(false);
      } catch (err) {
        setAssets(prev => [{ id: 'L-' + Date.now(), ...assetData }, ...prev]);
        setIsAddModalOpen(false);
      }
    } else {
      setAssets(prev => [{ id: 'L-' + Date.now(), ...assetData }, ...prev]);
      setIsAddModalOpen(false);
    }
  };

  const deleteAsset = async (id) => {
    if (!isLocalMode && fbRefs.db) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-pro-v2';
      try {
        await fbRefs.db.doc(`/artifacts/${appId}/public/data/assets/${id}`).delete();
      } catch (err) {
        setAssets(prev => prev.filter(a => a.id !== id));
      }
    } else {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
    setSelectedAsset(null);
  };

  const stats = useMemo(() => {
    // Total Value always displayed in Global Selected Currency
    const totalVal = assets.reduce((acc, a) => {
      const depValue = calculateDepreciation(a);
      // Basic normalization logic for dashboard aggregation
      const assetCurrency = CURRENCIES.find(c => c.code === (a.currency || 'INR'));
      const valueInINR = depValue / (assetCurrency?.rate || 1);
      return acc + (valueInINR * sysCurrency.rate);
    }, 0);

    const count = assets.length;
    const expired = assets.filter(a => a.warrantyExp && new Date(a.warrantyExp) < new Date()).length;
    const critical = assets.filter(a => a.cost > 0 && (calculateDepreciation(a) / a.cost) < 0.2).length;
    return { totalVal, count, expired, critical };
  }, [assets, sysCurrency]);

  const filteredAssets = assets.filter(a => 
    String(a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    String(a.serial || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER: LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#020617]">
        <div className="w-full max-w-sm p-10 bg-white rounded-xl shadow-2xl z-10 text-left animate-in border-b-[12px] border-blue-900">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 text-blue-400 rounded-2xl mb-6 shadow-xl border border-slate-700">
              <ShieldCheck size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Nexus ITAM</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-3">Government Asset Command</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Official ID</label>
              <input type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-900" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-500 uppercase mb-2 ml-1">Secure Key</label>
              <input type="password" required className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3.5 text-sm font-bold outline-none focus:border-blue-900" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            </div>
            {loginError && <div className="p-3 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg uppercase flex items-center gap-2 animate-pulse"><AlertCircle size={14}/> {loginError}</div>}
            <button type="submit" className="w-full bg-blue-900 text-white py-4 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg active:scale-95 shadow-blue-900/30">Authorize Access</button>
          </form>
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN ---
  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-900">
      <aside className="w-72 gov-sidebar flex flex-col shrink-0 text-slate-300">
        <div className="p-8 flex items-center gap-4 bg-[#010413]">
          <Landmark size={28} className="text-blue-500" />
          <div className="leading-tight">
            <span className="text-lg font-black block tracking-tighter text-white">NEXUS PRO</span>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Asset Bureau</span>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-8 text-left">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-4">Core Modules</p>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Central Command' },
            { id: 'inventory', icon: Package, label: 'Master Registry' },
            { id: 'audits', icon: History, label: 'System Audit' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-bold text-xs uppercase tracking-tight ${activeTab === item.id ? 'gov-active shadow-xl' : 'hover:bg-slate-800/50 hover:text-white text-slate-500'}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-4 mb-4 mt-10">Administrative</p>
          {[
            { id: 'procurement', icon: CreditCard, label: 'Procurement' },
            { id: 'reports', icon: BarChart3, label: 'Fiscal Reports' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-bold text-xs uppercase tracking-tight ${activeTab === item.id ? 'gov-active' : 'hover:bg-slate-800/50 hover:text-white text-slate-500'}`}>
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-6 bg-[#010413] border-t border-slate-800 text-left">
           <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-blue-900 flex items-center justify-center font-black text-sm text-blue-100 uppercase">{currentUser?.initials || 'U'}</div>
              <div className="flex-1 min-w-0 text-left">
                 <p className="text-xs font-black text-white truncate">{currentUser?.displayName}</p>
                 <p className="text-[9px] text-blue-500 font-bold uppercase tracking-tighter">{currentUser?.role}</p>
              </div>
              <button onClick={() => setIsLoggedIn(false)} className="text-slate-500 hover:text-rose-500 transition-colors"><LogOut size={16}/></button>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className={`px-8 py-2 flex items-center justify-between border-b text-[10px] font-black uppercase tracking-widest ${isLocalMode ? 'bg-amber-500 text-white' : 'bg-blue-900 text-white'}`}>
           <div className="flex items-center gap-3">
              <Shield size={14} />
              <span>Verified Session Active • Global Currency: {sysCurrency.code}</span>
           </div>
           <div className="flex items-center gap-4 font-mono">
              <Database size={12}/> DB_PRO_NODE_SECURE
           </div>
        </div>

        <header className="h-24 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="relative group text-left">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Query Master DB..." className="w-[400px] bg-slate-100 border-none rounded-xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-900/5 focus:bg-white transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            
            {/* Global Currency Switcher */}
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 rounded-xl">
               <Globe size={14} className="text-slate-400 ml-2" />
               <select 
                className="bg-transparent border-none text-[10px] font-black uppercase outline-none focus:ring-0 cursor-pointer pr-4"
                value={sysCurrency.code}
                onChange={(e) => setSysCurrency(CURRENCIES.find(c => c.code === e.target.value))}
               >
                 {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
               </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3.5 rounded-xl text-xs font-black flex items-center gap-3 shadow-xl active:scale-95 transition-all uppercase tracking-widest leading-none"><Plus size={18}/> Certify Asset</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 animate-in">
          {activeTab === 'dashboard' && (
            <div className="space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                  {[
                    { label: `Registry Value (${sysCurrency.code})`, v: `${sysCurrency.symbol}${Math.round(stats.totalVal || 0).toLocaleString()}`, icon: Coins, color: 'text-blue-600', bg: 'bg-blue-500/10' },
                    { label: 'Hardware Nodes', v: stats.count || 0, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
                    { label: 'Security Alerts', v: stats.expired || 0, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-500/10' },
                    { label: 'Lifecycle Critical', v: stats.critical || 0, icon: HardDrive, color: 'text-amber-600', bg: 'bg-amber-500/10' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white p-7 border border-slate-200 rounded-2xl flex flex-col justify-between shadow-sm group hover:border-blue-300 transition-all text-left">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 leading-none border-b border-slate-50 pb-4">{s.label}</p>
                       <div className="flex items-center justify-between">
                          <h4 className="text-2xl font-black text-slate-900 tabular-nums leading-none">{s.v}</h4>
                          <div className={`${s.bg} ${s.color} p-3 rounded-xl`}><s.icon size={24} /></div>
                       </div>
                    </div>
                  ))}
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
                  <div className="lg:col-span-2">
                    <Card title="Database Amortization" subtitle={`Live Fiscal Projections in ${sysCurrency.code}`} icon={BarChart3}>
                       <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                          {assets.map(a => {
                            const curVal = calculateDepreciation(a);
                            const assetCurrency = CURRENCIES.find(c => c.code === (a.currency || 'INR'));
                            const displayVal = (curVal / (assetCurrency?.rate || 1)) * sysCurrency.rate;
                            const percent = Math.min(100, Math.max(0, a.cost > 0 ? (curVal / a.cost) * 100 : 0));
                            return (
                              <div key={a.id} className="flex items-center gap-4 p-4 border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer group text-left shadow-sm rounded-md" onClick={() => setSelectedAsset(a)}>
                                 <div className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-400 group-hover:text-blue-900 transition-colors"><Laptop size={16} /></div>
                                 <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-center mb-2 leading-none text-left">
                                     <p className="text-xs font-black text-slate-800 uppercase truncate">{a.name}</p>
                                     <p className="text-xs font-black text-slate-900 tabular-nums font-mono tracking-tighter">{sysCurrency.symbol}{Math.round(displayVal).toLocaleString()}</p>
                                   </div>
                                   <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                     <div className={`h-full transition-all duration-1000 ${percent < 25 ? 'bg-rose-600' : 'bg-blue-600'}`} style={{ width: `${percent}%` }}></div>
                                   </div>
                                 </div>
                               </div>
                             );
                           })}
                       </div>
                    </Card>
                  </div>
                  <div className="space-y-6">
                     <Card title="Security Status" subtitle="Cluster sync integrity">
                        <div className="flex flex-col gap-6 text-left leading-none">
                           <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase leading-none">
                              <span>Registry Status</span>
                              <span className={`font-black uppercase leading-none ${isLocalMode ? 'text-amber-600' : 'text-emerald-700'}`}>{isLocalMode ? 'LOCAL_ONLY' : 'Certified'}</span>
                           </div>
                           <div className="p-5 bg-[#020617] rounded-lg shadow-inner text-left leading-none">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 leading-none">System Load</p>
                              <div className="flex items-center gap-3">
                                 <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: '92%' }}></div>
                                 </div>
                                 <span className="text-[9px] font-black text-blue-400 uppercase leading-none">Optimal</span>
                              </div>
                           </div>
                        </div>
                     </Card>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-in text-left">
               <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter border-b-2 border-slate-300 pb-3 flex justify-between items-center text-left leading-none">
                  Registry Master Ledger
                  <span className="text-[10px] font-black text-slate-400 tabular-nums uppercase leading-none tracking-widest">{assets.length} Entries Recorded</span>
               </h2>
               <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden text-left leading-none">
                  <table className="w-full text-left text-xs border-collapse leading-none">
                    <thead className="bg-slate-50 border-b border-slate-300 text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none text-left">
                       <tr>
                         <th className="px-6 py-5 border-r border-slate-200">Ref ID</th>
                         <th className="px-6 py-5 border-r border-slate-200 text-left">Specs & Serial</th>
                         <th className="px-6 py-5 border-r border-slate-200 text-left">Custodian</th>
                         <th className="px-6 py-5 border-r border-slate-200 text-left">Registry Status</th>
                         <th className="px-6 py-5 border-r border-slate-200 text-left">Current Value</th>
                         <th className="px-6 py-5 text-right">Access</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold text-slate-700 leading-none text-left">
                       {filteredAssets.map(a => {
                          const curVal = calculateDepreciation(a);
                          const assetCurrency = CURRENCIES.find(c => c.code === (a.currency || 'INR'));
                          const displayVal = (curVal / (assetCurrency?.rate || 1)) * sysCurrency.rate;
                          return (
                            <tr key={a.id} className="hover:bg-blue-50 transition-colors cursor-pointer text-left group leading-none" onClick={() => setSelectedAsset(a)}>
                              <td className="px-6 py-4 border-r border-slate-100 leading-none text-left">
                                 <span className="font-mono text-[10px] text-blue-900 italic leading-none font-bold">#{a.id.substring(0, 8)}</span>
                              </td>
                              <td className="px-6 py-4 border-r border-slate-100 uppercase font-black leading-none text-left">
                                 <p className="group-hover:text-blue-900 transition-colors leading-none">{a.name}</p>
                                 <div className="text-[9px] text-slate-400 font-mono normal-case italic mt-1 font-normal leading-none">S/N: {a.serial}</div>
                              </td>
                              <td className="px-6 py-4 border-r border-slate-100 uppercase text-[10px] text-slate-500 text-left leading-none">{a.user}</td>
                              <td className="px-6 py-4 border-r border-slate-100 leading-none text-left"><Badge>{a.status}</Badge></td>
                              <td className="px-6 py-4 border-r border-slate-100 tabular-nums font-black text-slate-900 text-sm leading-none text-left">
                                {sysCurrency.symbol}{Math.round(displayVal).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right leading-none text-left font-black text-blue-900 uppercase text-[9px] hover:underline tracking-widest">Open Dossier</td>
                            </tr>
                          );
                       })}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'procurement' && (
            <div className="space-y-10 animate-in text-left">
               <div className="flex items-center justify-between border-b-2 border-slate-200 pb-6">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Purchase & Requisition</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Generate Certified Documents in INR/Global Currencies</p>
                  </div>
                  <button 
                    onClick={() => setIsPOModalOpen(true)}
                    className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3.5 rounded-xl text-xs font-black flex items-center gap-3 shadow-xl active:scale-95 transition-all uppercase tracking-widest leading-none"
                  >
                    <Plus size={18}/> Generate Requisition
                  </button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <Card title="Acquisition Ledger" icon={Briefcase} subtitle="Official Multi-Currency Commitments">
                       {purchaseOrders.length === 0 ? (
                         <div className="p-20 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl uppercase font-black tracking-widest text-[10px] leading-none">No active PO nodes in database</div>
                       ) : (
                         <div className="space-y-4">
                           {purchaseOrders.map(po => (
                             <div key={po.id} className="p-5 border border-slate-200 rounded-xl bg-white hover:border-blue-300 transition-all flex items-center justify-between group">
                                <div className="flex items-center gap-5">
                                   <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors"><FileText size={20} className="text-slate-400 group-hover:text-blue-900" /></div>
                                   <div>
                                      <p className="text-sm font-black text-slate-900 uppercase">{po.poNumber}</p>
                                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{po.vendor} • {po.item}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-6">
                                   <div className="text-right">
                                      <p className="text-sm font-black text-slate-900 tabular-nums">{po.symbol}{po.total.toLocaleString()} <span className="text-[9px] text-slate-400">{po.currency}</span></p>
                                      <Badge>{po.status}</Badge>
                                   </div>
                                   <button 
                                      onClick={() => handleDownloadPOPDF(po)}
                                      className="flex items-center gap-2 p-2 px-3 text-[10px] font-black bg-slate-900 text-white rounded-lg transition-all active:scale-95 uppercase tracking-widest"
                                   >
                                      <Download size={14} /> PDF
                                   </button>
                                </div>
                             </div>
                           ))}
                         </div>
                       )}
                    </Card>
                  </div>
                  <div className="space-y-8 text-left">
                    <Card title="Authorized Vendors" icon={Landmark} subtitle="Vetted Supply Chain Entities">
                       <div className="space-y-3">
                          {['Dell Gov India', 'Apple Corporate', 'Reliance Pro IT', 'Insight Global'].map(v => (
                             <div key={v} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center transition-all hover:bg-white hover:border-blue-900 cursor-default group">
                                <span className="text-[11px] font-black text-slate-700 uppercase group-hover:text-blue-900 transition-colors">{v}</span>
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase">Vetted</span>
                             </div>
                          ))}
                       </div>
                    </Card>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-10 animate-in text-left">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-6">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Fiscal Reporting Engine</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Generate Documentation in {sysCurrency.code}</p>
                 </div>
                 <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 px-3 border-r border-slate-100">
                       <Calendar size={14} className="text-slate-400" />
                       <input 
                        type="date" 
                        className="text-[10px] font-black uppercase outline-none" 
                        value={reportDates.start} 
                        onChange={e => setReportDates({...reportDates, start: e.target.value})}
                       />
                    </div>
                    <div className="flex items-center gap-2 px-3">
                       <span className="text-[10px] font-bold text-slate-300">TO</span>
                       <input 
                        type="date" 
                        className="text-[10px] font-black uppercase outline-none" 
                        value={reportDates.end} 
                        onChange={e => setReportDates({...reportDates, end: e.target.value})}
                       />
                    </div>
                    <button 
                      onClick={handleGenerateReport}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <Download size={14} /> Generate & Download
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                 <div className="md:col-span-2 space-y-6">
                    <Card title="Report Preview" icon={FileText} subtitle="Format compliant with Fiscal Form 12-B">
                       <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 font-mono text-[10px] leading-relaxed text-slate-600 overflow-x-auto whitespace-pre">
{`NEXUS ITAM CERTIFIED REPORT
PERIOD: ${reportDates.start} TO ${reportDates.end}
DISPLAY CURRENCY: ${sysCurrency.code} (${sysCurrency.symbol})
---------------------------------------------------------
ID       | NOMENCLATURE       | BOOK VALUE | PURCHASE DATE
---------------------------------------------------------
${assets.slice(0, 5).map(a => {
  const curVal = calculateDepreciation(a);
  const assetCurrency = CURRENCIES.find(c => c.code === (a.currency || 'INR'));
  const displayVal = (curVal / (assetCurrency?.rate || 1)) * sysCurrency.rate;
  return `${(a.id || '').padEnd(8)} | ${(a.name || '').padEnd(18)} | ${sysCurrency.symbol}${Math.round(displayVal).toString().padEnd(9)} | ${a.purchaseDate}`;
}).join("\n")}
... [CONTINUED IN DOWNLOAD]`}
                       </div>
                    </Card>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'audits' && (
            <div className="space-y-6 animate-in text-left">
               <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter text-left border-b-2 border-slate-200 pb-6">System Security Audit</h2>
               <div className="bg-white border border-slate-300 rounded-2xl shadow-sm overflow-hidden text-left">
                  <div className="divide-y divide-slate-100">
                     {auditLog.map(log => (
                       <div key={log.id} className="p-6 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors text-left leading-none">
                          <div className="flex items-center gap-6 leading-none text-left">
                             <div className="w-2.5 h-2.5 bg-blue-900 rounded-full shadow-[0_0_10px_rgba(30,58,138,0.5)]"></div>
                             <div className="leading-none text-left">
                                <span className="font-black text-slate-900 uppercase tracking-tight text-sm leading-none">{log.action}</span>
                                {log.target && <span className="text-slate-400 ml-4 uppercase text-[10px] bg-slate-100 px-2 py-1 rounded leading-none">Target: {log.target}</span>}
                             </div>
                          </div>
                          <div className="text-right leading-none">
                             <p className="font-black text-slate-700 uppercase leading-none">{log.user}</p>
                             <p className="text-[10px] text-slate-400 font-black mt-2 leading-none uppercase">{new Date(log.timestamp).toLocaleString()}</p>
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
          <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center">
             <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-6"></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse text-center leading-relaxed">
                SYNCHRONIZING CONSOLIDATED<br/>ITAM REGISTRY CLUSTER...
             </p>
          </div>
        )}
        
        {/* Detail Panel */}
        {selectedAsset && (
          <div className="absolute inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedAsset(null)}></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in border-l-8 border-blue-900 text-left">
               <div className="p-6 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50 text-left leading-none">
                  <div className="leading-none text-left">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter leading-none">Security Dossier</h2>
                    <p className="text-[10px] text-blue-900 font-bold mt-2 uppercase tracking-tighter leading-none font-mono">REG_REF: {selectedAsset.id}</p>
                  </div>
                  <button onClick={() => setSelectedAsset(null)} className="p-2 border border-slate-300 rounded bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-all leading-none"><X size={16} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 space-y-8 uppercase text-left leading-none">
                  <div className="p-8 bg-white border border-slate-300 rounded-3xl shadow-inner flex flex-col items-center text-center leading-none">
                     <div className="w-full flex justify-between items-center mb-8 border-b border-slate-200 pb-3 leading-none text-left">
                        <Landmark size={14} className="text-slate-400 leading-none" />
                        <span className="text-[9px] font-black text-slate-400 tracking-[0.3em] leading-none uppercase">Official Registry</span>
                     </div>
                     <h3 className="text-md font-black text-slate-900 tracking-tighter text-center leading-tight">{selectedAsset.name}</h3>
                     <p className="text-[10px] font-bold text-slate-500 mt-2 bg-slate-100 px-2 py-1 rounded italic leading-none font-mono text-center">SERIAL: {selectedAsset.serial}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-300 border border-slate-300 rounded overflow-hidden shadow-md text-center text-left leading-none">
                     <div className="p-5 bg-white text-left leading-none">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-2 leading-none">Original Cost</p>
                        <p className="text-xl font-black text-slate-900 tabular-nums leading-none font-mono">
                           {CURRENCIES.find(c => c.code === (selectedAsset.currency || 'INR'))?.symbol}{selectedAsset.cost?.toLocaleString()}
                        </p>
                     </div>
                     <div className="p-5 bg-slate-50 text-left leading-none">
                        <p className="text-[8px] font-black text-blue-400 uppercase mb-2 leading-none">Current Value</p>
                        <p className="text-xl font-black text-blue-900 tabular-nums leading-none font-mono">
                           {CURRENCIES.find(c => c.code === (selectedAsset.currency || 'INR'))?.symbol}{Math.round(calculateDepreciation(selectedAsset)).toLocaleString()}
                        </p>
                     </div>
                  </div>

                  <div className="border border-slate-300 rounded-2xl overflow-hidden divide-y divide-slate-100 font-black text-left leading-none">
                     {[
                       { l: 'Assigned User', v: selectedAsset.user },
                       { l: 'Authorized Vendor', v: selectedAsset.vendor || 'Approved Entity' },
                       { l: 'Certification Date', v: selectedAsset.purchaseDate },
                       { l: 'Purchase Currency', v: selectedAsset.currency || 'INR' },
                       { l: 'Fiscal Life Period', v: `${selectedAsset.usefulLife} Years` },
                     ].map((row, i) => (
                       <div key={i} className="flex justify-between p-3.5 text-[10px] bg-white transition-colors leading-none uppercase text-left">
                          <span className="text-slate-400 uppercase tracking-widest leading-none">{row.l}</span>
                          <span className="text-slate-800 uppercase text-right text-left leading-none font-black">{row.v}</span>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="p-8 border-t-2 border-slate-200 grid grid-cols-2 gap-2 bg-slate-50 shrink-0 leading-none">
                  <button onClick={() => handleVerifyAsset(selectedAsset)} className="flex items-center justify-center gap-3 py-4 bg-emerald-600 text-white rounded-md text-[10px] font-black hover:bg-emerald-700 transition-all uppercase tracking-widest shadow-sm active:scale-95 leading-none">
                    <CheckCircle2 size={16} /> Execute Audit
                  </button>
                  <button onClick={() => deleteAsset(selectedAsset.id)} className="flex items-center justify-center gap-3 py-4 bg-white border border-slate-300 rounded-md text-[10px] font-black text-rose-700 hover:bg-rose-50 transition-all uppercase tracking-widest active:scale-95 leading-none shadow-sm">
                    <Trash2 size={14} /> Purge record
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Modal: Registry Certification (Asset Add) */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm text-left">
            <div className="bg-white rounded border-t-8 border-blue-900 w-full max-w-xl shadow-2xl overflow-hidden animate-in text-left">
               <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-slate-50 text-left leading-none">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Registry Certification</h2>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors leading-none"><X size={20} /></button>
               </div>
               
               <form onSubmit={handleAddAsset} className="p-8 space-y-6 text-left leading-none">
                  <div className="grid grid-cols-2 gap-6 uppercase text-left leading-none">
                     <div className="col-span-2 text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none">Hardware Nomenclature</label>
                        <input name="name" required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none focus:bg-white transition-all uppercase placeholder:italic leading-none" placeholder="e.g. INFRA_NODE_01" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none">Identifier (S/N)</label>
                        <input name="serial" required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none transition-all leading-none" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none text-left">Category</label>
                        <select name="type" className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none uppercase transition-all">
                           <option>Standard Workstation</option>
                           <option>Infrastructure Server</option>
                           <option>Networking Equipment</option>
                        </select>
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none text-left">Purchase Cost</label>
                        <input name="cost" type="number" required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none transition-all" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none text-left">Purchase Currency</label>
                        <select name="currency" className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none uppercase transition-all">
                           {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none text-left">Service Life (Y)</label>
                        <input name="life" type="number" defaultValue="4" className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none transition-all" />
                     </div>
                     <div className="col-span-2 text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none text-left">Certification Date</label>
                        <input name="date" type="date" required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none transition-all" />
                     </div>
                  </div>

                  <div className="flex gap-4 pt-8 border-t border-slate-100 leading-none">
                     <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-500 bg-slate-100 rounded border border-slate-300 uppercase tracking-[0.2em] transition-all hover:bg-slate-200 leading-none">Abort Certification</button>
                     <button type="submit" className="flex-1 py-4 bg-blue-900 text-white rounded text-[10px] font-black hover:bg-blue-800 uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 transition-all active:scale-95 leading-none">Execute registration</button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {/* Modal: Purchase Requisition Generation (Multi-Currency Support) */}
        {isPOModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-8 bg-slate-900/90 backdrop-blur-xl text-left">
            <div className="bg-white rounded-3xl border-t-[12px] border-blue-900 w-full max-w-2xl shadow-2xl overflow-hidden animate-in text-left">
               <div className="p-10 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 text-left leading-none">
                  <div>
                     <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Purchase Requisition</h2>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-3">Fiscal Acquisition Form 14-C • INR Standard Default</p>
                  </div>
                  <button onClick={() => setIsPOModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors leading-none"><X size={24} /></button>
               </div>
               
               <form onSubmit={handleCreatePO} className="p-10 space-y-8 text-left leading-none">
                  <div className="grid grid-cols-2 gap-8 uppercase text-left leading-none">
                     <div className="col-span-2 text-left leading-none">
                        <label className="block text-[11px] font-black text-slate-500 mb-3 tracking-widest leading-none">Hardware Nomenclature / Specification</label>
                        <input name="item" required className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none focus:bg-white focus:border-blue-900 transition-all uppercase placeholder:italic leading-none" placeholder="e.g. HIGH-PERFORMANCE CLUSTER NODE X" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[11px] font-black text-slate-500 mb-3 tracking-widest leading-none text-left">Authorized Vendor</label>
                        <select name="vendor" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none uppercase transition-all focus:bg-white leading-none">
                           <option>Dell Gov India</option>
                           <option>Apple Public Sector</option>
                           <option>Reliance Pro IT</option>
                           <option>Insight Global</option>
                        </select>
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[11px] font-black text-slate-500 mb-3 tracking-widest leading-none text-left">Operating Currency</label>
                        <div className="relative">
                          <Coins className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <select name="currency" className="w-full bg-slate-100 border border-slate-200 rounded-xl py-4 pl-12 pr-4 text-sm font-black outline-none uppercase transition-all focus:bg-white leading-none">
                             {CURRENCIES.map(c => (
                               <option key={c.code} value={c.code}>{c.label}</option>
                             ))}
                          </select>
                        </div>
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[11px] font-black text-slate-500 mb-3 tracking-widest leading-none text-left">Unit Count (Qty)</label>
                        <input name="qty" type="number" required defaultValue="1" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none focus:bg-white focus:border-blue-900 transition-all leading-none font-mono" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[11px] font-black text-slate-500 mb-3 tracking-widest leading-none text-left">Unit Cost Basis</label>
                        <input name="price" type="number" required placeholder="0.00" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm font-black outline-none focus:bg-white focus:border-blue-900 transition-all leading-none font-mono" />
                     </div>
                  </div>

                  <div className="flex gap-6 pt-10 border-t border-slate-100 leading-none">
                     <button type="button" onClick={() => setIsPOModalOpen(false)} className="flex-1 py-5 text-[11px] font-black text-slate-500 bg-slate-100 rounded-xl border border-slate-200 uppercase tracking-[0.3em] transition-all hover:bg-slate-200 leading-none active:scale-95">Abort Requisition</button>
                     <button type="submit" className="flex-1 py-5 bg-blue-900 text-white rounded-xl text-[11px] font-black hover:bg-blue-800 uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/40 transition-all active:scale-95 leading-none">Generate Requisition</button>
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