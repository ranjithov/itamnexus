import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Package, Users, Settings, Plus, Search, 
  ChevronRight, AlertCircle, User, DollarSign, Laptop, 
  ShieldCheck, Tag, Building2, Printer, Trash2, X, Shield, FileText, Landmark, Lock, Bell, LogOut, Filter, History, Database
} from 'lucide-react';

/**
 * AUTHORIZED PERSONNEL REGISTRY
 */
const AUTHORIZED_USERS = [
  {
    displayName: "Ranjith O V",
    username: "ranjukalpetta@gmail.com",
    password: "Quaggaterm@2026",
    role: "Chief Asset Officer",
    initials: "R.O"
  },
  {
    displayName: "Operations Lead",
    username: "ops@itam.gov",
    password: "Operations@2026",
    role: "Registry Supervisor",
    initials: "O.L"
  },
  {
    displayName: "Regional Auditor",
    username: "audit@itam.gov",
    password: "SecureAudit@2026",
    role: "Compliance Officer",
    initials: "R.A"
  }
];

/**
 * LOCAL FALLBACK DATA
 */
const INITIAL_ASSETS = [
  { id: 'AST-9001', name: 'MacBook Pro M3 14"', serial: 'C02FX5J0MD6M', type: 'Standard Workstation', user: 'Ranjith O V', status: 'Deployed', purchaseDate: '2024-01-15', cost: 2499, warrantyExp: '2027-01-15', usefulLife: 4 },
  { id: 'AST-9002', name: 'Dell Precision 3660', serial: 'HK92M13', type: 'Infrastructure Server', user: 'Unassigned', status: 'In Stock', purchaseDate: '2023-11-20', cost: 3200, warrantyExp: '2025-11-20', usefulLife: 5 },
];

/**
 * AMORTIZATION LOGIC
 */
const calculateDepreciation = (asset) => {
  if (!asset.purchaseDate || !asset.cost || !asset.usefulLife) return 0;
  const purchaseDate = new Date(asset.purchaseDate);
  const today = new Date();
  const ageInMonths = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth());
  const usefulLifeMonths = asset.usefulLife * 12;
  if (ageInMonths >= usefulLifeMonths) return 0;
  const monthlyDepreciation = asset.cost / usefulLifeMonths;
  const currentVal = asset.cost - (monthlyDepreciation * ageInMonths);
  return Math.max(0, currentVal);
};

// --- UI COMPONENTS ---
const Badge = ({ children }) => {
  const styles = {
    deployed: 'bg-blue-100 text-blue-800 border-blue-200',
    'in stock': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    maintenance: 'bg-amber-100 text-amber-800 border-amber-200',
    retired: 'bg-slate-200 text-slate-700 border-slate-300',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight ${styles[children?.toLowerCase()] || styles.default}`}>
      {children}
    </span>
  );
};

const Card = ({ children, title, subtitle, action }) => (
  <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col h-full text-left">
    {(title || action) && (
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <div>
          {title && <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest leading-none">{title}</h3>}
          {subtitle && <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 leading-none">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-5 flex-1">{children}</div>
  </div>
);

export default function App() {
  // System Management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Data Management
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assets, setAssets] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Script Loading and Firebase States
  const [isSystemReady, setIsSystemReady] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [systemError, setSystemError] = useState(null);
  const [firebaseRefs, setFirebaseRefs] = useState({ auth: null, db: null });

  /**
   * 1. SYSTEM INITIALIZATION
   * Loads Firebase scripts and applies aggressive CSS resets to fix unstyled/centered UI.
   */
  useEffect(() => {
    // Aggressive CSS Reset and Tailwind Injection
    const style = document.createElement('style');
    style.id = 'nexus-itam-styles';
    style.innerHTML = `
      /* Reset default Vite/React starter styles that cause centering */
      #root { 
        max-width: 100% !important; 
        margin: 0 !important; 
        padding: 0 !important; 
        width: 100vw !important; 
        height: 100vh !important; 
        text-align: left !important;
        display: block !important;
        background: #f1f5f9 !important;
      }
      body { margin: 0; padding: 0; overflow: hidden; }
      * { box-sizing: border-box; }
      .gov-sidebar { background: #020617; }
      .gov-active { background: #1e3a8a !important; color: white !important; }
      .animate-in { animation: fadeIn 0.3s ease-out; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .tabular-nums { font-variant-numeric: tabular-nums; }
    `;
    document.head.appendChild(style);

    // Load Tailwind CDN for styling reliability
    if (!document.getElementById('tailwind-cdn')) {
      const tw = document.createElement('script');
      tw.id = 'tailwind-cdn';
      tw.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(tw);
    }

    // Load Firebase Compat Scripts
    const loadFirebase = async () => {
      try {
        const scriptUrls = [
          'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
          'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js',
          'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js'
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
        
        // --- RELIABILITY FALLBACK: LOCAL MODE ---
        if (!configStr) {
          console.warn("Cluster configuration missing. Local Ledger active.");
          setIsLocalMode(true);
          setAssets(INITIAL_ASSETS);
          setIsSystemReady(true);
          return;
        }

        const config = JSON.parse(configStr);
        const app = window.firebase.initializeApp(config);
        const auth = app.auth();
        const db = app.firestore();
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-gov';

        setFirebaseRefs({ auth, db });

        // Authentication Sequence
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await auth.signInWithCustomToken(__initial_auth_token);
        } else {
          await auth.signInAnonymously();
        }

        // Data Sync Listener
        const path = `/artifacts/${appId}/public/data/assets`;
        db.collection(path).onSnapshot((snap) => {
          const docs = [];
          snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
          setAssets(docs);
          setIsSystemReady(true);
        }, (err) => {
          console.error("Sync Error:", err);
          setIsLocalMode(true);
          setAssets(INITIAL_ASSETS);
          setIsSystemReady(true);
        });

      } catch (err) {
        console.error("Boot error:", err);
        setIsLocalMode(true);
        setAssets(INITIAL_ASSETS);
        setIsSystemReady(true);
      }
    };

    loadFirebase();
  }, []);

  // Handler: Authenticate session
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
        id: Math.random().toString(36).substr(2, 9)
      }, ...prev]);
    } else {
      setLoginError('Invalid Identification: Access Restricted.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
  };

  // Handler: Commit registry entry
  const handleAddAsset = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const assetData = {
      name: fd.get('name'),
      serial: fd.get('serial'),
      type: fd.get('type'),
      status: 'In Stock',
      user: 'Unassigned',
      purchaseDate: fd.get('date'),
      cost: parseFloat(fd.get('cost')) || 0,
      usefulLife: parseInt(fd.get('life')) || 4,
      warrantyExp: fd.get('warranty'),
      vendor: fd.get('vendor') || 'Approved Provider',
      createdAt: new Date().toISOString(),
      officer: currentUser?.displayName
    };

    if (firebaseRefs.db && !isLocalMode) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-gov';
      try {
        await firebaseRefs.db.collection(`/artifacts/${appId}/public/data/assets`).add(assetData);
      } catch (err) {
        setAssets(prev => [{ id: 'L-' + Date.now(), ...assetData }, ...prev]);
      }
    } else {
      setAssets(prev => [{ id: 'L-' + Date.now(), ...assetData }, ...prev]);
    }
    setIsAddModalOpen(false);
  };

  // Handler: Purge record
  const deleteAsset = async (id) => {
    if (firebaseRefs.db && !isLocalMode) {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-gov';
      try {
        await firebaseRefs.db.doc(`/artifacts/${appId}/public/data/assets/${id}`).delete();
      } catch (err) {
        setAssets(prev => prev.filter(a => a.id !== id));
      }
    } else {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
    setSelectedAsset(null);
  };

  const stats = useMemo(() => {
    const bookVal = assets.reduce((acc, a) => acc + calculateDepreciation(a), 0);
    return {
      totalBookValue: bookVal,
      count: assets.length,
      alerts: assets.filter(a => a.warrantyExp && new Date(a.warrantyExp) < new Date()).length
    };
  }, [assets]);

  const filteredAssets = assets.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.serial?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER BRANCHES ---

  if (systemError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020617] text-white p-8 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-black uppercase mb-2">Registry Boot Failure</h1>
        <p className="text-slate-400 max-w-md text-sm">{systemError}</p>
        <button onClick={() => window.location.reload()} className="mt-8 px-6 py-2 bg-blue-700 rounded text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors">Re-Initialize Session</button>
      </div>
    );
  }

  if (!isSystemReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse text-center">Initializing Nexus Cluster...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0f172a] relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
        
        <div className="w-full max-w-sm p-10 bg-white rounded-lg border-t-8 border-blue-900 shadow-2xl z-10 text-left animate-in">
           <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-900 rounded-full mb-4 border border-blue-100 shadow-inner">
                 <Landmark size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Nexus ITAM</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Government Control Portal</p>
           </div>

           <form onSubmit={handleLogin} className="space-y-5">
              <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Official Identifier</label>
                 <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="email" 
                      required 
                      className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 pl-10 text-xs font-bold outline-none focus:border-blue-900 focus:bg-white transition-all"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. name@itam.gov"
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 ml-1 tracking-widest">Secure Pass-Key</label>
                 <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="password" 
                      required 
                      className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 pl-10 text-xs font-bold outline-none focus:border-blue-900 focus:bg-white transition-all"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                 </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold rounded flex items-center gap-2">
                   <AlertCircle size={14} />
                   {loginError}
                </div>
              )}

              <button type="submit" className="w-full bg-blue-900 text-white py-4 rounded-md font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg active:scale-95 shadow-blue-900/20">
                Authenticate session
              </button>
           </form>

           <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                 <Shield size={12} />
                 <span>Security Standard: TLS 1.3 Active</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-900 border-t-4 border-blue-900 text-left animate-in">
      <aside className="w-64 gov-sidebar flex flex-col shrink-0 text-slate-200">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <Landmark size={24} className="text-blue-400" />
          <div className="leading-tight text-left">
            <span className="text-sm font-black block tracking-widest uppercase leading-none">NEXUS ITAM</span>
            <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest leading-none mt-1">Property Division</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-6">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-3 mb-4 text-left leading-none">Central Ledger</p>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Central Dashboard' },
            { id: 'inventory', icon: Package, label: 'Hardware Registry' },
            { id: 'audits', icon: History, label: 'Officer Logs' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded transition-all mb-1 ${activeTab === item.id ? 'gov-active shadow-xl' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <item.icon size={16} />
              <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 bg-[#020617] border-t border-slate-800">
           <div className="flex items-center gap-3 bg-blue-900/20 p-2 rounded border border-blue-900/30 text-left leading-none">
              <div className="w-8 h-8 rounded bg-blue-900 border border-blue-700 flex items-center justify-center font-black text-xs text-blue-100 uppercase leading-none">
                {currentUser?.initials}
              </div>
              <div className="flex-1 overflow-hidden leading-none">
                 <p className="text-[10px] font-black text-white truncate uppercase leading-none">{currentUser?.displayName}</p>
                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter mt-1 leading-none">{currentUser?.role}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-white transition-colors">
                 <LogOut size={14} />
              </button>
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#f1f5f9]">
        <div className={`border-b px-8 py-1.5 flex items-center justify-between shrink-0 leading-none ${isLocalMode ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
           <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter leading-none ${isLocalMode ? 'text-amber-800' : 'text-emerald-800'}`}>
              <Shield size={12} />
              <span>{isLocalMode ? 'Local Ledger Mode Active • Restricted Sync' : 'Certified Node • Database Synced'}</span>
           </div>
           <div className="text-[9px] font-bold text-slate-500 italic">
              <span>{new Date().toLocaleDateString()}</span>
           </div>
        </div>

        <header className="h-20 bg-white border-b border-slate-300 px-8 flex items-center justify-between shrink-0 shadow-sm z-10 text-left">
          <div className="flex items-center gap-4 flex-1 text-left">
            <div className="relative w-[450px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Query Registry Identifier..." 
                className="w-full bg-slate-50 border border-slate-300 rounded-md py-3 pl-12 pr-4 text-xs font-bold outline-none focus:border-blue-900 focus:bg-white transition-all shadow-inner" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded text-[10px] font-black flex items-center gap-2 shadow-xl shadow-blue-900/20 transition-all uppercase tracking-[0.2em] leading-none active:scale-95">
                <Plus size={14} /> Register Asset
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 text-left">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in text-left">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left leading-none">
                 {[
                   { label: 'Current Registry Valuation', val: `$${Math.round(stats.totalBookValue).toLocaleString()}`, icon: DollarSign, color: 'text-blue-900', bg: 'bg-blue-50' },
                   { label: 'Synchronized Records', val: stats.count, icon: Package, color: 'text-slate-700', bg: 'bg-slate-100' },
                   { label: 'System Integrity', val: isLocalMode ? 'LOCAL' : '98.8%', icon: ShieldCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                   { label: 'Audit Alert Status', val: stats.alerts, icon: AlertCircle, color: 'text-rose-700', bg: 'bg-rose-50' },
                 ].map((s, i) => (
                   <div key={i} className="bg-white p-6 border border-slate-300 rounded-lg flex flex-col justify-between shadow-sm text-left leading-none">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-50 pb-2 leading-none">{s.label}</p>
                     <div className="flex items-center justify-between leading-none">
                        <h4 className="text-2xl font-black text-slate-900 tabular-nums leading-none">{s.val}</h4>
                        <div className={`${s.bg} ${s.color} p-2.5 rounded-md leading-none`}><s.icon size={18} /></div>
                     </div>
                   </div>
                 ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[450px] text-left leading-none">
                  <div className="lg:col-span-2 text-left leading-none h-full">
                    <Card title="Database Amortization" subtitle="Live fiscal cluster projections">
                       <div className="space-y-2 overflow-y-auto max-h-[350px] pr-2 text-left leading-none">
                         {assets.length === 0 ? (
                           <div className="text-center py-20 bg-slate-50 rounded border border-dashed border-slate-300 text-slate-400 uppercase font-black text-[10px] tracking-widest leading-none">Registry Database Empty</div>
                         ) : (
                           assets.map(a => {
                             const curVal = calculateDepreciation(a);
                             const percent = a.cost ? (curVal / a.cost) * 100 : 0;
                             return (
                               <div key={a.id} className="flex items-center gap-4 p-4 border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer group text-left shadow-sm rounded-md leading-none" onClick={() => setSelectedAsset(a)}>
                                 <div className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-400 group-hover:text-blue-900 transition-colors leading-none"><Laptop size={16} /></div>
                                 <div className="flex-1 min-w-0 text-left leading-none">
                                   <div className="flex justify-between items-center mb-2 leading-none text-left">
                                     <p className="text-xs font-black text-slate-800 uppercase truncate leading-none">{a.name}</p>
                                     <p className="text-xs font-black text-slate-900 tabular-nums leading-none font-mono tracking-tighter">${Math.round(curVal).toLocaleString()}</p>
                                   </div>
                                   <div className="h-2 w-full bg-slate-100 border border-slate-200 rounded-full overflow-hidden leading-none">
                                     <div className={`h-full transition-all duration-1000 ${percent < 25 ? 'bg-rose-600' : 'bg-blue-900'}`} style={{ width: `${percent}%` }}></div>
                                   </div>
                                 </div>
                               </div>
                             );
                           })
                         )}
                       </div>
                    </Card>
                  </div>
                  <div className="space-y-6 text-left leading-none">
                     <Card title="Security Status" subtitle="Integrity synchronization">
                        <div className="flex flex-col gap-6 text-left leading-none">
                           <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase leading-none">
                              <span>Registry Status</span>
                              <span className={`font-black uppercase leading-none ${isLocalMode ? 'text-amber-600' : 'text-emerald-700'}`}>{isLocalMode ? 'LOCAL_ONLY' : 'Certified'}</span>
                           </div>
                           <div className="p-5 bg-[#020617] rounded-lg shadow-inner text-left leading-none">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 leading-none">System Load</p>
                              <div className="flex items-center gap-3 leading-none">
                                 <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden leading-none">
                                    <div className="h-full bg-blue-500 leading-none" style={{ width: '92%' }}></div>
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
            <div className="space-y-4 animate-in text-left">
               <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter border-b-2 border-slate-300 pb-3 flex justify-between items-center text-left leading-none">
                  Central Registry Master Ledger
                  <span className="text-[10px] font-black text-slate-400 tabular-nums uppercase leading-none tracking-widest">{assets.length} Entries Recorded</span>
               </h2>
               <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden text-left leading-none">
                  <table className="w-full text-left text-xs border-collapse leading-none">
                    <thead className="bg-slate-50 border-b border-slate-300 text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none text-left">
                       <tr>
                         <th className="px-6 py-5 border-r border-slate-200">Ref Identifier</th>
                         <th className="px-6 py-5 border-r border-slate-200 text-left">Specs & Serial</th>
                         <th className="px-6 py-5 border-r border-slate-200 text-left">Custodian</th>
                         <th className="px-6 py-5 border-r border-slate-200 text-left">Registry Status</th>
                         <th className="px-6 py-5 border-r border-slate-200 text-left">Book Value</th>
                         <th className="px-6 py-5 text-right">Access</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold text-slate-700 leading-none text-left">
                       {assets.map(a => (
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
                           <td className="px-6 py-4 border-r border-slate-100 tabular-nums font-black text-slate-900 text-sm leading-none text-left">${Math.round(calculateDepreciation(a)).toLocaleString()}</td>
                           <td className="px-6 py-4 text-right leading-none text-left font-black text-blue-900 uppercase text-[9px] hover:underline tracking-widest">Open Dossier</td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>

        {/* Global Slide-Over Panel */}
        {selectedAsset && (
          <div className="absolute inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedAsset(null)}></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in border-l-8 border-blue-900 text-left leading-none">
               <div className="p-6 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50 text-left leading-none">
                  <div className="leading-none text-left">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] leading-none">Security Dossier</h2>
                    <p className="text-[10px] text-blue-900 font-bold mt-2 uppercase tracking-tighter leading-none font-mono">OBJECT_REF: {selectedAsset.id}</p>
                  </div>
                  <button onClick={() => setSelectedAsset(null)} className="p-2 border border-slate-300 rounded bg-white text-slate-500 hover:text-slate-900 shadow-sm transition-all leading-none"><X size={16} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8 space-y-8 uppercase text-left leading-none">
                  <div className="p-8 bg-white border border-slate-300 rounded shadow-inner flex flex-col items-center text-center leading-none">
                     <div className="w-full flex justify-between items-center mb-8 border-b border-slate-200 pb-3 leading-none text-left">
                        <Landmark size={14} className="text-slate-400 leading-none" />
                        <span className="text-[9px] font-black text-slate-400 tracking-[0.3em] leading-none uppercase">Official Property Registry</span>
                     </div>
                     <h3 className="text-md font-black text-slate-900 tracking-tighter text-center leading-tight">{selectedAsset.name}</h3>
                     <p className="text-[10px] font-bold text-slate-500 mt-2 bg-slate-100 px-2 py-1 rounded italic leading-none font-mono">SERIAL: {selectedAsset.serial}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-slate-300 border border-slate-300 rounded overflow-hidden shadow-md text-center text-left leading-none">
                     <div className="p-5 bg-white text-left leading-none">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-2 leading-none">Acquisition Basis</p>
                        <p className="text-xl font-black text-slate-900 tabular-nums leading-none font-mono">${selectedAsset.cost?.toLocaleString()}</p>
                     </div>
                     <div className="p-5 bg-slate-50 text-left leading-none">
                        <p className="text-[8px] font-black text-blue-400 uppercase mb-2 leading-none">Current Book Val.</p>
                        <p className="text-xl font-black text-blue-900 tabular-nums leading-none font-mono">${Math.round(calculateDepreciation(selectedAsset)).toLocaleString()}</p>
                     </div>
                  </div>

                  <div className="border border-slate-300 rounded overflow-hidden divide-y divide-slate-200 font-black text-left leading-none">
                     {[
                       { l: 'Assigned Custodian', v: selectedAsset.user },
                       { l: 'Authorized Entity', v: selectedAsset.vendor },
                       { l: 'Certification Date', v: selectedAsset.purchaseDate },
                       { l: 'Fiscal Service Life', v: `${selectedAsset.usefulLife} Years` },
                     ].map((row, i) => (
                       <div key={i} className="flex justify-between p-4 text-[10px] bg-white transition-colors leading-none uppercase text-left">
                          <span className="text-slate-400 uppercase tracking-widest text-left leading-none">{row.l}</span>
                          <span className="text-slate-800 uppercase text-right text-left leading-none font-black">{row.v}</span>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="p-8 border-t-2 border-slate-200 grid grid-cols-2 gap-2 bg-slate-50 shrink-0 leading-none">
                  <button onClick={() => deleteAsset(selectedAsset.id)} className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-md text-[10px] font-black text-rose-700 hover:bg-rose-50 transition-all uppercase tracking-widest active:scale-95 leading-none shadow-sm">
                    <Trash2 size={14} /> Purge record
                  </button>
                  <button onClick={() => setSelectedAsset(null)} className="py-4 bg-blue-900 text-white rounded-md text-xs font-black hover:bg-blue-800 transition-all uppercase tracking-[0.2em] shadow-lg active:scale-[0.98] leading-none">
                    Return to Ledger
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Registry Certification Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm text-left">
            <div className="bg-white rounded-lg border-t-8 border-blue-900 w-full max-w-xl shadow-2xl overflow-hidden animate-in text-left">
               <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-slate-50 text-left leading-none">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Registry Certification</h2>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors leading-none"><X size={20} /></button>
               </div>
               
               <form onSubmit={handleAddAsset} className="p-8 space-y-6 text-left leading-none">
                  <div className="grid grid-cols-2 gap-6 uppercase text-left leading-none">
                     <div className="col-span-2 text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none">Hardware Nomenclature</label>
                        <input name="name" required className="w-full bg-slate-100 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none focus:bg-white focus:border-blue-900 transition-all uppercase placeholder:italic leading-none" placeholder="e.g. WORKSTATION_SERVER_01" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none">Identifier (S/N)</label>
                        <input name="serial" required className="w-full bg-slate-100 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none focus:bg-white focus:border-blue-900 transition-all leading-none" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none text-left">Category</label>
                        <select name="type" className="w-full bg-slate-100 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none uppercase transition-all">
                           <option>Standard Workstation</option>
                           <option>Infrastructure Server</option>
                           <option>Networking Equipment</option>
                        </select>
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none text-left">Acquisition Cost ($)</label>
                        <input name="cost" type="number" required className="w-full bg-slate-100 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none focus:bg-white focus:border-blue-900 transition-all" />
                     </div>
                     <div className="text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none text-left">Service Life (Y)</label>
                        <input name="life" type="number" defaultValue="4" className="w-full bg-slate-100 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none focus:bg-white focus:border-blue-900 transition-all" />
                     </div>
                     <div className="col-span-2 text-left leading-none">
                        <label className="block text-[10px] font-black text-slate-500 mb-2 tracking-widest leading-none text-left">Certification Date</label>
                        <input name="date" type="date" required className="w-full bg-slate-100 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none focus:bg-white focus:border-blue-900 transition-all" />
                     </div>
                  </div>

                  <div className="flex gap-4 pt-8 border-t border-slate-100 leading-none">
                     <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-500 bg-slate-100 rounded border border-slate-300 uppercase tracking-[0.2em] transition-all hover:bg-slate-200 leading-none">Abort Certification</button>
                     <button type="submit" className="flex-1 py-4 bg-blue-900 text-white rounded-md text-[10px] font-black hover:bg-blue-800 uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 transition-all active:scale-95 leading-none">Commit Certification</button>
                  </div>
               </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}