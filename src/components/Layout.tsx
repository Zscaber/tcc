import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../store';
import { LayoutDashboard, FolderKanban, Users, Wrench, AlertTriangle, BrainCircuit, BarChart3, ClipboardList, Settings, Bell, LogOut, Menu, X, Search, FileText, History, Map, MapPin } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projetos', icon: FolderKanban },
  { path: '/people', label: 'Pessoas', icon: Users },
  { path: '/equipment', label: 'Equipamentos', icon: Wrench },
  { path: '/problems', label: 'Problemas', icon: AlertTriangle },
  { path: '/gut', label: 'Matriz GUT', icon: BarChart3 },
  { path: '/action-plans', label: 'Planos 5W2H', icon: ClipboardList },
  { path: '/maintenance', label: 'Manutenção', icon: Settings },
  { path: '/production', label: 'Produção', icon: FileText },
  { path: '/quality', label: 'Qualidade', icon: BarChart3 },
  { path: '/layout', label: 'Layout/Planta', icon: Map },
  { path: '/area-maps', label: 'Mapa de Áreas', icon: MapPin },
  { path: '/ai-assistant', label: 'Assistente IA', icon: BrainCircuit },
  { path: '/notifications', label: 'Notificações', icon: Bell },
  { path: '/history', label: 'Histórico', icon: History },
  { path: '/reports', label: 'Relatórios', icon: FileText },
  { path: '/users', label: 'Usuários', icon: Users },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const notifications = db.getNotifications(user?.id);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Wrench size={18} className="text-white" />
              </div>
              <span className="font-bold text-gray-800 text-sm">Manutenção Flexível</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded hover:bg-gray-100">
              <X size={20} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.path === '/notifications' && unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button onClick={logout} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Sair">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-3 ml-auto">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden sm:block">
              <div className="relative">
                <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-64 pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              </div>
            </form>
            <button onClick={() => setSearchOpen(!searchOpen)} className="sm:hidden p-2 rounded-lg hover:bg-gray-100">
              <Search size={20} />
            </button>

            {/* Notifications */}
            <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell size={20} className="text-gray-600" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{unreadCount}</span>}
            </Link>
          </div>
        </header>

        {/* Mobile search */}
        {searchOpen && (
          <div className="sm:hidden p-3 bg-white border-b border-gray-200">
            <form onSubmit={handleSearch}>
              <input type="text" placeholder="Pesquisar..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </form>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
