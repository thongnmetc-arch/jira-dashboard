import { motion } from 'framer-motion';
import { LayoutDashboard, Table, BarChart3, CalendarRange, PieChart, Clock, Tag, History } from 'lucide-react';
import { useI18n } from '../i18n';

const tabs = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'charts', icon: PieChart },
  { id: 'data', icon: Table },
  { id: 'gantt', icon: CalendarRange },
  { id: 'compare', icon: BarChart3 },
  { id: 'ot', icon: Clock },
  { id: 'labels', icon: Tag },
  { id: 'history', icon: History },
];

export default function DashboardTabs({ activeTab, onTabChange }) {
  const { t } = useI18n();
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
            <span>{t('tabs.' + tab.id)}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
