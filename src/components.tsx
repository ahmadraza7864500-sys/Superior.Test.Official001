import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from './context';
import { GraduationCap, LogOut, Sun, Moon, Menu, X, Bell } from 'lucide-react';

// Theme Toggle Button
export function ThemeToggle() {
  const { theme, toggleTheme } = useApp();
  return (
    <button onClick={toggleTheme} className="p-2 rounded-lg bg-theme-tertiary hover:bg-theme-card border border-theme transition-colors" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
      {theme === 'light' ? <Moon className="w-4 h-4 text-gray-700" /> : <Sun className="w-4 h-4 text-yellow-400" />}
    </button>
  );
}

// Logo
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' };
  const iconSizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };
  return (
    <div className="flex items-center gap-2">
      <div className={`${sizes[size]} bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-sm`}>
        <GraduationCap className={`${iconSizes[size]} text-white`} />
      </div>
      <div>
        <h1 className={`font-bold text-theme-primary ${size === 'lg' ? 'text-xl' : 'text-base'}`}>Superior Test</h1>
        {size === 'lg' && <p className="text-xs text-theme-muted -mt-0.5">Excellence in Assessment</p>}
      </div>
    </div>
  );
}

// Dashboard Layout
export function DashboardLayout({ children, role, tabs, activeTab, onTabChange }: {
  children: React.ReactNode; role: string; tabs: { id: string; label: string; icon: any; badge?: number }[];
  activeTab: string; onTabChange: (tab: string) => void;
}) {
  const { user, logout, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => { await logout(); navigate('/'); };

  return (
    <div className="min-h-screen bg-theme-secondary">
      {/* Header */}
      <header className="bg-theme-card border-b border-theme sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-theme-tertiary">
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Logo size="sm" />
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                role === 'principal' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                role === 'teacher' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
              }`}>{role}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <span className="text-sm text-theme-secondary hidden sm:block">{user?.full_name}</span>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-theme-secondary hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-theme-card border-b border-theme">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Desktop tabs */}
          <div className="hidden lg:flex overflow-x-auto gap-1 py-2 scrollbar-hide">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-theme-secondary hover:bg-theme-tertiary'
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
          {/* Mobile tabs */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-2 space-y-1 animate-fadeIn">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => { onTabChange(tab.id); setMobileMenuOpen(false); }}
                  className={`flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-theme-secondary hover:bg-theme-tertiary'
                  }`}>
                  <tab.icon className="w-4 h-4" /> {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700">{tab.badge}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}

// Empty State Component
export function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="text-center py-12 bg-theme-card rounded-xl border border-theme-card">
      <Icon className="w-12 h-12 text-theme-muted mx-auto mb-3" />
      <p className="text-theme-secondary font-medium">{title}</p>
      <p className="text-sm text-theme-muted mt-1">{description}</p>
    </div>
  );
}

// Modal Component
export function Modal({ isOpen, onClose, title, children, maxWidth = 'md' }: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; maxWidth?: 'sm' | 'md' | 'lg';
}) {
  if (!isOpen) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };
  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-theme-card rounded-2xl shadow-xl p-6 w-full ${widths[maxWidth]} animate-fadeIn border border-theme`} onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-theme-primary mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

// Loading Spinner
export function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-primary">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-theme-secondary">Loading...</p>
      </div>
    </div>
  );
}

// Card Component
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-theme-card border border-theme-card rounded-xl shadow-sm ${className}`}>{children}</div>;
}

// Stat Card
export function StatCard({ label, value, color = 'indigo' }: { label: string; value: string | number; color?: string }) {
  const colors: any = {
    indigo: 'text-indigo-600 dark:text-indigo-400',
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  };
  return (
    <Card className="p-4">
      <div className="text-xs text-theme-muted font-medium uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colors[color] || colors.indigo}`}>{value}</div>
    </Card>
  );
}

// Pagination Component
export function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 text-sm rounded-lg border border-theme disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-tertiary transition-colors"
        aria-label="Previous page"
      >
        Previous
      </button>
      
      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="px-3 py-1.5 text-sm rounded-lg border border-theme hover:bg-theme-tertiary transition-colors">1</button>
          {start > 2 && <span className="text-theme-muted">...</span>}
        </>
      )}
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            page === currentPage
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'border-theme hover:bg-theme-tertiary'
          }`}
          aria-label={`Page ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}
      
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-theme-muted">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="px-3 py-1.5 text-sm rounded-lg border border-theme hover:bg-theme-tertiary transition-colors">{totalPages}</button>
        </>
      )}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 text-sm rounded-lg border border-theme disabled:opacity-50 disabled:cursor-not-allowed hover:bg-theme-tertiary transition-colors"
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}

// Error Boundary Component
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-theme-secondary p-4">
          <Card className="p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-theme-primary mb-2">Something went wrong</h2>
            <p className="text-theme-secondary mb-4">An unexpected error occurred. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Refresh Page
            </button>
          </Card>
        </div>
      );
    }
    
    return this.props.children;
  }
}
