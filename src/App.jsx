import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  CreditCard, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  User,
  MoreVertical,
  BarChart3,
  LogOut,
  Bell,
  Laptop,
  Cpu,
  ShieldCheck,
  Globe,
  Tag,
  Building2,
  Calendar,
  DollarSign,
  History,
  FileText,
  QrCode,
  TrendingDown,
  Printer,
  Trash2,
  ExternalLink
} from 'lucide-react';

// --- Mock Data ---
const INITIAL_ASSETS = [
  { id: 'AST-5001', name: 'MacBook Pro 14"', serial: 'C02FX5J0MD6M', type: 'Laptop', user: 'Sarah Chen', status: 'Deployed', purchaseDate: '2023-01-15', cost: 2499, warrantyExp: '2026-01-15', usefulLife: 4 },
  { id: 'AST-5002', name: 'Dell XPS 15', serial: '8J2K3L1', type: 'Laptop', user: 'John Doe', status: 'Deployed', purchaseDate: '2022-11-20', cost: 1899, warrantyExp: '2024-11-20', usefulLife: 3 },
  { id: 'AST-5003', name: 'LG UltraFine 5K', serial: '904NTYJ802', type: 'Monitor', user: 'Unassigned', status: 'In Stock', purchaseDate: '2023-03-10', cost: 1299, warrantyExp: '2025-03-10', usefulLife: 5 },
  { id: 'AST-5004', name: 'iPhone 15 Pro', serial: 'G6TWV0PQ6H', type: 'Mobile', user: 'Mike Ross', status: 'Deployed', purchaseDate: '2023-10-05', cost: 1099, warrantyExp: '2024-10-05', usefulLife: 2 },
  { id: 'AST-5005', name: 'Precision 3660', serial: 'HK92M13', type: 'Workstation', user: 'Engineering Lab', status: 'Maintenance', purchaseDate: '2021-06-12', cost: 3200, warrantyExp: '2024-06-12', usefulLife: 5 },
];

const LICENSES = [
  { id: 'LIC-01', name: 'Adobe Creative Cloud', type: 'SaaS', seats: '50/50', expires: '2024-12-01', vendor: 'Adobe' },
  { id: 'LIC-02', name: 'Microsoft 365 Business', type: 'SaaS', seats: '142/200', expires: '2025-06-15', vendor: 'Microsoft' },
  { id: 'LIC-03', name: 'JetBrains All Products', type: 'Subscription', seats: '12/15', expires: '2024-08-20', vendor: 'JetBrains' },
];

// --- Utilities ---

// Simple SVG Barcode Generator
const Barcode = ({ value }) => {
  const seed = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bars = [];
  let currentPos = 10;
  
  for (let i = 0; i < 40; i++) {
    const width = ((seed + i) % 3 === 0) ? 4 : 2;
    bars.push(<rect key={i} x={currentPos} y="10" width={width} height="40" fill="currentColor" />);
    currentPos += width + 2;
  }

  return (
    <svg viewBox={`0 0 ${currentPos + 10} 70`} className="w-full h-16 text-slate-900">
      {bars}
      <text x="50%" y="65" textAnchor="middle" fontSize="10" className="font-mono">{value}</text>
    </svg>
  );
};

// Straight-Line Depreciation Calculation
const calculateDepreciation = (asset) => {
  const purchaseDate = new Date(asset.purchaseDate);
  const today = new Date();
  const ageInMonths = (today.getFullYear() - purchaseDate.getFullYear()) * 12 + (today.getMonth() - purchaseDate.getMonth());
  const usefulLifeMonths = asset.usefulLife * 12;
  
  if (ageInMonths >= usefulLifeMonths) return 0;
  
  const monthlyDepreciation = asset.cost / usefulLifeMonths;
  const currentVal = asset.cost - (monthlyDepreciation * ageInMonths);
  return Math.max(0, currentVal);
};

// --- UI Components ---

const Badge = ({ children, variant = 'default' }) => {
  const styles = {
    default: 'bg-slate-100 text-slate-700',
    deployed: 'bg-blue-100 text-blue-700',
    'in stock': 'bg-emerald-100 text-emerald-700',
    maintenance: 'bg-orange-100 text-orange-700',
    retired: 'bg-slate-200 text-slate-500',
    saas: 'bg-indigo-100 text-indigo-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[children.toLowerCase()] || styles.default}`}>
      {children}
    </span>
  );
};

const Card = ({ children, title, subtitle, action, className = "" }) => (
  <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm ${className}`}>
    {(title || action) && (
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
      active 
        ? 'bg-emerald-50 text-emerald-600 font-medium' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    }`}
  >
    <Icon size={18} />
    <span className="text-sm">{label}</span>
  </button>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assets, setAssets] = useState(INITIAL_ASSETS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const stats = useMemo(() => ({
    totalValue: assets.reduce((acc, curr) => acc + curr.cost, 0),
    bookValue: assets.reduce((acc, curr) => acc + calculateDepreciation(curr), 0),
    count: assets.length,
    inStock: assets.filter(a => a.status === 'In Stock').length,
    expiringWarranty: assets.filter(a => new Date(a.warrantyExp) < new Date('2024-12-31')).length,
  }), [assets]);

  const handleAddAsset = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newAsset = {
      id: `AST-${5000 + assets.length + 1}`,
      name: formData.get('name'),
      serial: formData.get('serial'),
      type: formData.get('type'),
      user: 'Unassigned',
      status: 'In Stock',
      purchaseDate: new Date().toISOString().split('T')[0],
      cost: parseFloat(formData.get('cost')),
      usefulLife: parseInt(formData.get('usefulLife')) || 3,
      warrantyExp: formData.get('warrantyExp'),
    };
    setAssets([newAsset, ...assets]);
    setIsAddAssetModalOpen(false);
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.serial.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-2 mb-4">
          <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
            <Package size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">Nexus<span className="text-emerald-600">ITAM</span></span>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto">
          <p className="text-[10px] font-bold uppercase text-slate-400 px-4 mb-2 tracking-widest">Global</p>
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Package} label="Hardware Inventory" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
          <SidebarItem icon={ShieldCheck} label="Software Licenses" active={activeTab === 'licenses'} onClick={() => setActiveTab('licenses')} />
          
          <p className="text-[10px] font-bold uppercase text-slate-400 px-4 mb-2 mt-6 tracking-widest">Procurement</p>
          <SidebarItem icon={Building2} label="Vendors" active={activeTab === 'vendors'} onClick={() => setActiveTab('vendors')} />
          <SidebarItem icon={CreditCard} label="Purchase Orders" active={activeTab === 'po'} onClick={() => setActiveTab('po')} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">AM</div>
            <div className="flex-1 overflow-hidden text-xs">
              <p className="font-semibold text-slate-800 truncate">Asset Manager</p>
              <p className="text-slate-500 truncate">Global Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Assets..." 
                className="w-full bg-slate-100 border-transparent rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-emerald-100"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <button 
            onClick={() => setIsAddAssetModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus size={18} /> Add Asset
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Asset Book Value', value: `$${stats.bookValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Total Assets', value: stats.count, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Available', value: stats.inStock, icon: Tag, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Warranty Alerts', value: stats.expiringWarranty, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <h4 className="text-2xl font-bold text-slate-800 mt-2">{stat.value}</h4>
                    </div>
                    <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}><stat.icon size={20} /></div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <Card title="Financial Lifecycle" subtitle="Asset Depreciation Tracking">
                    <div className="space-y-4">
                      {assets.slice(0, 5).map((asset) => {
                        const bookValue = calculateDepreciation(asset);
                        const depPercent = (bookValue / asset.cost) * 100;
                        return (
                          <div key={asset.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 bg-slate-50/30 group">
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-white border border-slate-100 rounded-lg text-slate-400 group-hover:text-emerald-600"><Laptop size={20} /></div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{asset.name}</p>
                                <p className="text-xs text-slate-500">{asset.id} • ${asset.cost}</p>
                              </div>
                            </div>
                            <div className="w-40">
                              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                                <span>REMAINING</span>
                                <span>{Math.round(depPercent)}%</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${depPercent}%` }}></div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xs font-bold text-slate-700">${Math.round(bookValue)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
                <div className="space-y-6">
                  <Card title="Useful Life Rules">
                    <div className="space-y-3">
                      {[{ t: 'Laptops', l: '4Y' }, { t: 'Phones', l: '2Y' }, { t: 'Servers', l: '5Y' }].map((r, i) => (
                        <div key={i} className="flex justify-between text-xs p-2 bg-slate-50 rounded border border-slate-100">
                          <span className="text-slate-500">{r.t}</span>
                          <span className="font-bold">{r.l}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <Card className="!p-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-bold text-slate-500">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Model</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Cost</th>
                      <th className="px-6 py-4">Book Value</th>
                      <th className="px-6 py-4 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAssets.map((asset) => (
                      <tr key={asset.id} onClick={() => setSelectedAsset(asset)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-emerald-600 font-bold">{asset.id}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{asset.name}</td>
                        <td className="px-6 py-4"><Badge>{asset.status}</Badge></td>
                        <td className="px-6 py-4 text-slate-400">${asset.cost}</td>
                        <td className="px-6 py-4 font-bold">${Math.round(calculateDepreciation(asset))}</td>
                        <td className="px-6 py-4 text-right text-slate-400"><ChevronRight size={16} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </div>

        {/* Asset Detail Slider */}
        {selectedAsset && (
          <div className="absolute inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedAsset(null)}></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-8 animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold">Asset Label</h2>
                <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-slate-600"><ChevronRight size={24} /></button>
              </div>
              <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center mb-8">
                <p className="text-[10px] font-bold text-slate-400 tracking-[0.3em] mb-4 uppercase">Property of Nexus IT</p>
                <Barcode value={selectedAsset.id} />
                <div className="mt-4 text-center">
                  <p className="text-sm font-bold">{selectedAsset.name}</p>
                  <p className="text-xs text-slate-400">SN: {selectedAsset.serial}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Initial Cost</p>
                  <p className="text-lg font-bold">${selectedAsset.cost}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Book Value</p>
                  <p className="text-lg font-bold text-emerald-700">${Math.round(calculateDepreciation(selectedAsset))}</p>
                </div>
              </div>
              <div className="mt-auto flex gap-3">
                <button className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                  <Printer size={18} /> Print Label
                </button>
                <button className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100">
                  Maintenance
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Modal */}
      {isAddAssetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 animate-in zoom-in-95">
            <h2 className="text-xl font-bold mb-6">Register New Asset</h2>
            <form onSubmit={handleAddAsset} className="space-y-4">
              <input name="name" required placeholder="Asset Model Name" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input name="serial" required placeholder="Serial Number" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none" />
                <select name="type" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <option>Laptop</option><option>Monitor</option><option>Mobile</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="cost" type="number" required placeholder="Cost ($)" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none" />
                <input name="usefulLife" type="number" required placeholder="Life (Years)" className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none" />
              </div>
              <input name="warrantyExp" type="date" required className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none" />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddAssetModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}