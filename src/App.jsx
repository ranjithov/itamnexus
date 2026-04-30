import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  LayoutDashboard, Package, CreditCard, Users, Settings, Plus, Search, 
  ChevronRight, AlertCircle, User, DollarSign, Laptop, 
  ShieldCheck, Tag, Building2, Printer, Trash2, X, Shield, FileText, Landmark, Lock, Bell, LogOut, Filter, BarChart3, Database, History
} from 'lucide-react';

// --- DATABASE INITIALIZATION ---
let db, auth;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-itam-government';

try {
  const configStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
  if (configStr) {
    const firebaseConfig = JSON.parse(configStr);
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn("Cloud synchronization unavailable. Running in Local Ledger mode.");
}

// --- UTILITIES ---
const calculateDepreciation = (asset) => {
  if (!asset.purchaseDate || !asset.cost || !asset.usefulLife) return 0;
  const purchaseDate = new Date(asset.purchaseDate);
  const today = new Date();
  const ageInMonths = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth());
  const usefulLifeMonths = asset.usefulLife * 12;
  if (ageInMonths >= usefulLifeMonths) return 0;
  const monthlyDepreciation = asset.cost / usefulLifeMonths;
  return Math.max(0, asset.cost - (monthlyDepreciation * ageInMonths));
};

// --- STYLED COMPONENTS ---
const Badge = ({ children }) => {
  const styles = {
    deployed: 'bg-blue-50 text-blue-800 border-blue-200',
    'in stock': 'bg-emerald-50 text-emerald-800 border-emerald-200',
    maintenance: 'bg-amber-50 text-amber-800 border-amber-200',
    retired: 'bg-slate-100 text-slate-700 border-slate-300',
    default: 'bg-slate-50 text-slate-700 border-slate-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tight ${styles[children?.toLowerCase()] || styles.default}`}>
      {children}
    </span>
  );
};

const Card = ({ children, title, subtitle, action }) => (
  <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col h-full">
    {(title || action) && (
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
        <div>
          {title && <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">{title}</h3>}
          {subtitle && <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-5 flex-1">{children}</div>
  </div>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assets, setAssets] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Aggressive Style Reset and Tailwind Injection
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
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
      }
      body { margin: 0; padding: 0; overflow: hidden; background: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      * { box-sizing: border-box; }
      .gov-sidebar { background: #1e293b; }
      .gov-active { background: #1e3a8a !important; color: white !important; }
      input:focus, select:focus { border-color: #1e3a8a !important; box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1) !important; }
    `;
    document.head.appendChild(style);
  }, []);

  // Auth & Database Synchronization
  useEffect(() => {
    if (!auth) {
      setLoading(false); // Fallback to local
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error(err); }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, u => setCurrentUser(u));

    // Listen for Assets
    const assetsCol = collection(db, 'artifacts', appId, 'public', 'data', 'assets');
    const unsubscribeAssets = onSnapshot(assetsCol, snap => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeAssets();
    };
  }, []);

  // Access Control
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === 'ranjukalpetta@gmail.com' && loginPassword === 'Quaggaterm@2026') {
      setIsLoggedIn(true);
      setLoginError('');
      // Log successful access
      setAuditLog(prev => [{
        action: 'System Access',
        user: 'Ranjith O V',
        timestamp: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      }, ...prev]);
    } else {
      setLoginError('Authentication Failure: Invalid Credentials provided.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginEmail('');
    setLoginPassword('');
  };

  // Asset Management Logic
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
      cost: parseFloat(fd.get('cost')),
      usefulLife: parseInt(fd.get('life')),
      warrantyExp: fd.get('warranty'),
      vendor: fd.get('vendor') || 'Government Approved Supplier',
      createdAt: new Date().toISOString()
    };

    if (db) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'assets'), assetData);
    } else {
      // Local Fallback
      setAssets(prev => [{ id: 'L-AST-'+Date.now(), ...assetData }, ...prev]);
    }
    
    setAuditLog(prev => [{
      action: 'Asset Registered',
      user: 'Ranjith O V',
      target: assetData.name,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    }, ...prev]);

    setIsAddModalOpen(false);
  };

  const deleteAsset = async (id) => {
    const assetToDelete = assets.find(a => a.id === id);
    if (db) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'assets', id));
    } else {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
    
    setAuditLog(prev => [{
      action: 'Asset De-registered',
      user: 'Ranjith O V',
      target: assetToDelete?.name,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    }, ...prev]);
    
    setSelectedAsset(null);
  };

  const stats = useMemo(() => {
    const bookVal = assets.reduce((acc, a) => acc + calculateDepreciation(a), 0);
    return {
      totalBookValue: bookVal,
      count: assets.length,
      alerts: assets.filter(a => a.warrantyExp && new Date(a.warrantyExp) < new Date()).length,
      utilization: assets.length > 0 ? (assets.filter(a => a.status === 'Deployed').length / assets.length * 100).toFixed(1) : 0
    };
  }, [assets]);

  const filteredAssets = assets.filter(a => 
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.serial?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDERING ---

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0f172a] relative">
        <div className="w-full max-w-sm p-10 bg-white rounded border-t-8 border-blue-900 shadow-2xl z-10">
           <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-900 rounded-full mb-4 border border-blue-100">
                 <Landmark size={32} />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Nexus ITAM Portal</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Certified Government Management System</p>
           </div>

           <form onSubmit={handleLogin} className="space-y-5">
              <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Government ID / Email</label>
                 <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="email" 
                      required 
                      className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 pl-10 text-xs font-bold outline-none"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ranjukalpetta@gmail.com"
                    />
                 </div>
              </div>

              <div>
                 <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Secure Access Key</label>
                 <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      type="password" 
                      required 
                      className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 pl-10 text-xs font-bold outline-none"
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

              <button type="submit" className="w-full bg-blue-900 text-white py-3.5 rounded font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all shadow-lg active:scale-95">
                Authenticate Session
              </button>
           </form>

           <div className="mt-10 pt-6 border-t border-slate-100 flex justify-center">
              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                 <Shield size={12} />
                 <span>Secure Server Connection: AES-256</span>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden text-slate-900 border-t-4 border-blue-900">
      {/* Sidebar Navigation */}
      <aside className="w-64 gov-sidebar flex flex-col shrink-0 text-slate-200">
        <div className="p-6 bg-[#0f172a] border-b border-slate-700 flex items-center gap-3">
          <Landmark size={24} className="text-blue-400" />
          <div className="leading-tight">
            <span className="text-sm font-black block tracking-widest">NEXUS ITAM</span>
            <span className="text-[9px] font-bold text-blue-400 uppercase">Division of Assets</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-6">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-3 mb-4">Operations</p>
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Central Dashboard' },
            { id: 'inventory', icon: Package, label: 'Master Registry' },
            { id: 'audits', icon: History, label: 'System Logs' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded transition-all ${activeTab === item.id ? 'gov-active shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
              <item.icon size={16} />
              <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
          
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-3 mb-4 mt-8">Administration</p>
          {[
            { id: 'users', icon: Users, label: 'Authorized Users' },
            { id: 'settings', icon: Settings, label: 'Registry Settings' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded transition-all ${activeTab === item.id ? 'gov-active' : 'text-slate-400 hover:bg-slate-800'}`}>
              <item.icon size={16} />
              <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 bg-[#0f172a] border-t border-slate-700">
           <div className="flex items-center gap-3 bg-blue-900/20 p-2 rounded border border-blue-900/30">
              <div className="w-8 h-8 rounded bg-blue-900 border border-blue-700 flex items-center justify-center font-black text-xs text-blue-100 uppercase">R.O</div>
              <div className="flex-1 overflow-hidden">
                 <p className="text-[10px] font-black text-white truncate uppercase">Ranjith O V</p>
                 <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Chief Asset Officer</p>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-white transition-colors">
                 <LogOut size={14} />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[#f1f5f9]">
        <div className="bg-amber-50 border-b border-amber-200 px-8 py-1.5 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2 text-[9px] font-black text-amber-800 uppercase tracking-tighter">
              <Shield size={12} />
              <span>Restricted System: Access Logged • User Certification: Ranjith O V</span>
           </div>
           <div className="text-[9px] font-bold text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1"><Database size={10} /> {db ? 'Cloud Link: ONLINE' : 'Local Mode Active'}</span>
              <span>Session: ITAM-2026-XQ</span>
           </div>
        </div>

        <header className="h-20 bg-white border-b border-slate-300 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-[450px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Query Registry ID, Hardware Model, or Serial Identifier..." 
                className="w-full bg-slate-50 border border-slate-300 rounded-md py-2.5 pl-12 pr-4 text-xs font-bold outline-none" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-300 rounded text-[10px] font-black text-slate-700 hover:bg-slate-100 transition-all uppercase tracking-widest">
                <FileText size={14} /> Generate Report
             </button>
             <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2.5 rounded text-[10px] font-black flex items-center gap-2 shadow-xl shadow-blue-900/20 transition-all uppercase tracking-[0.2em]"
             >
              <Plus size={14} /> Certify Asset
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in">
               {/* KPI GRID */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 {[
                   { label: 'Current Net Book Value', val: `$${Math.round(stats.totalBookValue).toLocaleString()}`, icon: DollarSign, color: 'text-blue-900', bg: 'bg-blue-50' },
                   { label: 'Total Registry Entries', val: stats.count, icon: Package, color: 'text-slate-700', bg: 'bg-slate-100' },
                   { label: 'Compliance Index', val: '98.4%', icon: ShieldCheck, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                   { label: 'Registry Alerts', val: stats.alerts, icon: AlertCircle, color: 'text-rose-700', bg: 'bg-rose-50' },
                 ].map((s, i) => (
                   <div key={i} className="bg-white p-5 border border-slate-300 rounded flex flex-col justify-between shadow-sm">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-50 pb-2">{s.label}</p>
                     <div className="flex items-center justify-between">
                        <h4 className="text-2xl font-black text-slate-900 tabular-nums">{s.val}</h4>
                        <div className={`${s.bg} ${s.color} p-2 rounded`}>
                          <s.icon size={18} />
                        </div>
                     </div>
                   </div>
                 ))}
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                  <div className="lg:col-span-2">
                    <Card title="Amortization Projections" subtitle="Real-time registry valuations">
                       <div className="space-y-2 overflow-y-auto max-h-full pr-2">
                         {assets.length === 0 ? (
                           <div className="text-center py-20 bg-slate-50 rounded border border-dashed border-slate-300">
                              <Database size={32} className="mx-auto text-slate-300 mb-4" />
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Database Entry</p>
                           </div>
                         ) : (
                           assets.map(a => {
                             const curVal = calculateDepreciation(a);
                             const percent = a.cost ? (curVal / a.cost) * 100 : 0;
                             return (
                               <div key={a.id} className="flex items-center gap-4 p-4 border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => setSelectedAsset(a)}>
                                 <div className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-400 group-hover:text-blue-900 group-hover:bg-blue-50 transition-colors"><Laptop size={16} /></div>
                                 <div className="flex-1 min-w-0">
                                   <div className="flex justify-between items-center mb-2">
                                     <p className="text-xs font-black text-slate-800 uppercase truncate">{a.name}</p>
                                     <p className="text-xs font-black text-slate-900 tabular-nums">${Math.round(curVal).toLocaleString()}</p>
                                   </div>
                                   <div className="h-2 w-full bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
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
                  <div className="space-y-6 flex flex-col">
                     <Card title="System Integrity" subtitle="Audit Compliance Overview">
                        <div className="flex flex-col gap-6">
                           <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase">
                              <span>Registry Integrity</span>
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">CERTIFIED</span>
                           </div>
                           <div className="p-4 bg-slate-900 rounded shadow-inner">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Resource Allocation</p>
                              <div className="space-y-3">
                                 <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                       <div className="h-full bg-blue-500" style={{ width: `${stats.utilization}%` }}></div>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-300 w-8">{stats.utilization}%</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </Card>
                     
                     <Card title="Rapid Tagging">
                        <div className="grid grid-cols-2 gap-2">
                           <button className="flex flex-col items-center justify-center py-4 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded transition-colors group">
                              <Printer size={16} className="mb-2 text-slate-400 group-hover:text-blue-900" />
                              <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-slate-800 tracking-tight">Thermal Print</span>
                           </button>
                           <button className="flex flex-col items-center justify-center py-4 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded transition-colors group">
                              <Tag size={16} className="mb-2 text-slate-400 group-hover:text-blue-900" />
                              <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-slate-800 tracking-tight">Bulk Update</span>
                           </button>
                        </div>
                     </Card>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4 animate-in">
               <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                     <ランドマーク size={20} className="text-blue-900" />
                     Master Hardware Registry
                  </h2>
                  <div className="flex gap-2">
                     <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded text-[9px] font-black text-slate-600 uppercase hover:bg-slate-50">
                        <Filter size={12} /> Registry Filter
                     </button>
                  </div>
               </div>

               <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 border-b-2 border-slate-300 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                       <tr>
                         <th className="px-5 py-5 border-r border-slate-200">System Entry ID</th>
                         <th className="px-5 py-5 border-r border-slate-200">Equipment Specifications</th>
                         <th className="px-5 py-5 border-r border-slate-200">Personnel Assigned</th>
                         <th className="px-5 py-5 border-r border-slate-200">Status</th>
                         <th className="px-5 py-5 border-r border-slate-200">Valuation</th>
                         <th className="px-5 py-5 text-right">Reference</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold text-slate-700">
                       {filteredAssets.length === 0 ? (
                         <tr><td colSpan="6" className="px-5 py-20 text-center text-slate-400 uppercase tracking-widest text-[10px]">No records detected in central cluster</td></tr>
                       ) : (
                         filteredAssets.map(a => (
                           <tr key={a.id} className="hover:bg-blue-50/50 transition-colors cursor-pointer" onClick={() => setSelectedAsset(a)}>
                             <td className="px-5 py-4 border-r border-slate-100">
                                <span className="font-mono text-[10px] text-blue-900">{a.id}</span>
                             </td>
                             <td className="px-5 py-4 border-r border-slate-100 uppercase tracking-tight">
                                {a.name}
                                <div className="text-[9px] text-slate-400 font-mono normal-case italic mt-1">S/N: {a.serial}</div>
                             </td>
                             <td className="px-5 py-4 border-r border-slate-100 uppercase tracking-tighter text-slate-500 text-[10px]">
                                {a.user}
                             </td>
                             <td className="px-5 py-4 border-r border-slate-100">
                                <Badge>{a.status}</Badge>
                             </td>
                             <td className="px-5 py-4 border-r border-slate-100 tabular-nums">
                                ${Math.round(calculateDepreciation(a)).toLocaleString()}
                             </td>
                             <td className="px-5 py-4 text-right">
                                <button className="text-blue-900 font-black hover:underline uppercase text-[9px] tracking-widest">Dossier</button>
                             </td>
                           </tr>
                         ))
                       )}
                    </tbody>
                  </table>
               </div>
            </div>
          )}

          {activeTab === 'audits' && (
            <div className="space-y-4 animate-in">
               <h2 className="text-xl font-black text-slate-900 uppercase border-b-2 border-slate-300 pb-3">Master Audit Log</h2>
               <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
                  <div className="divide-y divide-slate-200">
                     {auditLog.length === 0 ? (
                        <div className="p-20 text-center text-slate-400 uppercase font-black text-[10px] tracking-widest">Logs purged or unavailable</div>
                     ) : (
                        auditLog.map(log => (
                          <div key={log.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50">
                             <div className="flex items-center gap-4">
                                <div className="w-2 h-2 bg-blue-900 rounded-full"></div>
                                <div>
                                   <span className="font-black text-slate-900 uppercase tracking-tight">{log.action}</span>
                                   {log.target && <span className="text-slate-400 ml-2 uppercase text-[10px]">({log.target})</span>}
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="font-bold text-slate-700">{log.user}</p>
                                <p className="text-[9px] text-slate-400 tabular-nums">{new Date(log.timestamp).toLocaleString()}</p>
                             </div>
                          </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Global Slide-Over Panel */}
        {selectedAsset && (
          <div className="absolute inset-0 z-[100] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedAsset(null)}></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in border-l-8 border-blue-900">
               <div className="p-6 border-b-2 border-slate-200 flex items-center justify-between bg-slate-50">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] leading-none">Security Verification</h2>
                    <p className="text-[10px] text-blue-900 font-bold mt-2">OBJECT_REF: {selectedAsset.id}</p>
                  </div>
                  <button onClick={() => setSelectedAsset(null)} className="p-2 border border-slate-300 rounded bg-white text-slate-500 hover:text-slate-900 transition-colors shadow-sm">
                     <X size={16} />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {/* Registry Tag Preview */}
                  <div className="p-8 bg-white border border-slate-300 rounded shadow-inner flex flex-col items-center">
                     <div className="w-full flex justify-between items-center mb-8 border-b border-slate-200 pb-3">
                        <Landmark size={14} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Property of Government Division</span>
                     </div>
                     <div className="p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg mb-6 flex flex-col items-center">
                        <div className="flex gap-1 h-14 w-56 items-end">
                           {[3,5,2,4,3,6,3,5,2,4,3,6,5,3,3].map((h, i) => (
                             <div key={i} className="bg-slate-900" style={{ height: `${h * 16}%`, width: h % 2 === 0 ? '5px' : '2px' }}></div>
                           ))}
                        </div>
                        <p className="text-[10px] font-black text-slate-900 mt-4 tracking-[0.4em]">{selectedAsset.id}</p>
                     </div>
                     <h3 className="text-md font-black text-slate-900 uppercase tracking-tighter text-center">{selectedAsset.name}</h3>
                     <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase bg-slate-100 px-2 py-0.5 rounded">MOD_ID: {selectedAsset.serial}</p>
                  </div>

                  {/* Financial Ledger Section */}
                  <div className="grid grid-cols-2 gap-px bg-slate-300 border border-slate-300 rounded overflow-hidden shadow-sm">
                     <div className="p-5 bg-white text-center">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-2">Registry Basis (Cost)</p>
                        <p className="text-xl font-black text-slate-900">${selectedAsset.cost?.toLocaleString()}</p>
                     </div>
                     <div className="p-5 bg-slate-50 text-center">
                        <p className="text-[8px] font-black text-blue-400 uppercase mb-2">Fair Market Projection</p>
                        <p className="text-xl font-black text-blue-900">${Math.round(calculateDepreciation(selectedAsset)).toLocaleString()}</p>
                     </div>
                  </div>

                  {/* Administrative Metadata */}
                  <div className="border border-slate-300 rounded overflow-hidden divide-y divide-slate-200">
                     <div className="bg-slate-100 px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Master Metadata</div>
                     {[
                       { l: 'Assigned Custodian', v: selectedAsset.user },
                       { l: 'Authorized Supplier', v: selectedAsset.vendor },
                       { l: 'Certification Date', v: selectedAsset.purchaseDate },
                       { l: 'Amortization Term', v: `${selectedAsset.usefulLife} Fiscal Years` },
                     ].map((row, i) => (
                       <div key={i} className="flex justify-between p-3.5 text-[10px] bg-white uppercase font-black">
                          <span className="text-slate-400">{row.l}</span>
                          <span className="text-slate-800">{row.v}</span>
                       </div>
                     ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded text-[10px] font-bold text-blue-800 flex items-start gap-3 italic leading-relaxed">
                     <Shield size={16} className="shrink-0 text-blue-900" />
                     <span>Record Certification: This asset dossier is verified for current fiscal period. Modifications require Chief Asset Officer authorization.</span>
                  </div>
               </div>

               <div className="p-8 border-t-2 border-slate-200 grid grid-cols-2 gap-2 bg-slate-50 shrink-0">
                  <button className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded text-[10px] font-black text-slate-700 hover:bg-slate-100 uppercase tracking-widest transition-all">
                    <Printer size={14} /> Formal Print
                  </button>
                  <button onClick={() => deleteAsset(selectedAsset.id)} className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded text-[10px] font-black text-rose-700 hover:bg-rose-50 transition-all uppercase tracking-widest">
                    <Trash2 size={14} /> Purge Record
                  </button>
                  <button onClick={() => setSelectedAsset(null)} className="col-span-2 py-4 bg-blue-900 text-white rounded text-xs font-black hover:bg-blue-800 transition-all uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20">
                    Exit Dossier
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* Global Modal System */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white rounded border-t-8 border-blue-900 w-full max-w-xl shadow-2xl overflow-hidden animate-in">
               <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Asset Certification</h2>
                    <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-wider">Division Form 12-A • Registration Sub-System</p>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900"><X size={20} /></button>
               </div>
               
               <form onSubmit={handleAddAsset} className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Hardware Nomenclature</label>
                        <input name="name" required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black focus:bg-white outline-none" placeholder="e.g. SERVER_NODE_01" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Unique Identifier (S/N)</label>
                        <input name="serial" required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black focus:bg-white outline-none" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Classification</label>
                        <select name="type" className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none uppercase">
                           <option>Standard Workstation</option>
                           <option>Portable Computing Device</option>
                           <option>Server Cluster Node</option>
                           <option>Networking Equipment</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Gross Acquisition Cost ($)</label>
                        <input name="cost" type="number" required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Fiscal Life (Years)</label>
                        <input name="life" type="number" defaultValue="4" className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none" />
                     </div>
                     <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Vendor / Authorized Provider</label>
                        <input name="vendor" className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none uppercase" placeholder="e.g. DELL GOVERNMENT SALES" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Acquisition Date</label>
                        <input name="date" type="date" required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none" />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Warranty Threshold</label>
                        <input name="warranty" type="date" required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-xs font-black outline-none" />
                     </div>
                  </div>

                  <div className="flex gap-4 pt-8 border-t border-slate-100">
                     <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-500 bg-slate-100 rounded border border-slate-300 uppercase tracking-widest hover:bg-slate-200 transition-colors">Abort Entry</button>
                     <button type="submit" className="flex-1 py-4 bg-blue-900 text-white rounded text-[10px] font-black hover:bg-blue-800 uppercase tracking-widest shadow-xl shadow-blue-900/20 active:scale-95 transition-all">Commit to Master Registry</button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {loading && isLoggedIn && (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center">
             <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-6"></div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] animate-pulse">Synchronizing Cloud Cluster...</p>
          </div>
        )}
      </main>
    </div>
  );
}

const ランドマーク = Landmark; // Unicode bypass for gov icon