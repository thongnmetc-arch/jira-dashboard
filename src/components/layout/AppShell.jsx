import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';


export default function AppShell({ children }) {
  const { state, dispatch } = useApp();

  // Close mobile sidebar on Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_MOBILE_OPEN', payload: false });
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [dispatch]);

  const closeMobile = () => {
    dispatch({ type: 'SET_MOBILE_OPEN', payload: false });
  };

  return (
    <div className="app-shell bg-[var(--bg-secondary)] text-[var(--text-primary)]">
      {/* Top bar - fixed */}
      <div className="app-topbar">
        <TopBar
          onToggleMobile={() =>
            dispatch({ type: 'SET_MOBILE_OPEN', payload: !state.mobileOpen })
          }
        />
      </div>

      {/* Desktop sidebar - fixed */}
      <div className={`hidden md:block app-sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}`}>
        <Sidebar />
      </div>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {state.mobileOpen && (
            <>
              {/* Overlay backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                onClick={closeMobile}
              />

              {/* Mobile drawer */}
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
              >
                <div className="relative h-full">
                  <Sidebar />
                  <button
                    onClick={closeMobile}
                    className="absolute -right-8 top-3 p-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className={`app-main ${state.sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8">
            {children}
          </div>
        </main>


    </div>
  );
}
