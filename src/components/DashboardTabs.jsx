import { motion } from 'framer-motion';
import { LayoutDashboard, Table, BarChart3, CalendarRange } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
  { id: 'data', label: 'Dữ liệu', icon: Table },
  { id: 'gantt', label: 'Gantt', icon: CalendarRange },
  { id: 'compare', label: 'So sánh', icon: BarChart3 },
];

export default function DashboardTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex items-center gap-1 mb-6 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-primary)] w-fit">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-[var(--accent)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
