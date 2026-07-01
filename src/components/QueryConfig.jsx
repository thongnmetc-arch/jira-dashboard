import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function QueryConfig({ jiraConfig, selectedProject, onStart, onBack }) {
  const [email, setEmail] = useState('');
  const [jql, setJql] = useState('');

  return (
    <motion.div
      key="query-config"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto"
    >
      <div className="space-y-5">
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
        )}

        {/* Step title */}
        <div className="text-center mb-1">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Cấu hình truy vấn
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Bước 4/4</p>
        </div>

        {/* Summary card */}
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Dự án</span>
            <span className="text-[var(--text-primary)] font-semibold">
              {selectedProject}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Server</span>
            <span className="text-[var(--text-primary)] text-xs truncate max-w-[200px] text-right">
              {jiraConfig?.url}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">Email</span>
            <span className="text-[var(--text-primary)] text-xs truncate max-w-[200px] text-right">
              {email ? (
                email
              ) : (
                <span className="text-[var(--text-tertiary)]">Chưa nhập</span>
              )}
            </span>
          </div>
        </div>

        {/* Email input */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
            Email{' '}
            <span className="text-[var(--text-tertiary)] font-normal">
              (tùy chọn)
            </span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@company.com"
            className="input-like w-full font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* JQL textarea */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
            JQL{' '}
            <span className="text-[var(--text-tertiary)] font-normal">
              (tùy chọn)
            </span>
          </label>
          <textarea
            value={jql}
            onChange={(e) => setJql(e.target.value)}
            placeholder='project = "BXDBE" ORDER BY created DESC'
            rows={3}
            className="w-full px-3 py-2 text-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] resize-none font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
            Để trống JQL để lấy tất cả issues trong project.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-2.5 border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
          <button
            onClick={() =>
              onStart({ email: email.trim(), jql: jql.trim() })
            }
            className="flex-1 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Bắt đầu
          </button>
        </div>

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={() => onStart({ email: '', jql: '' })}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline transition-colors cursor-pointer"
          >
            Bỏ qua, xem tất cả issues
          </button>
        </div>
      </div>
    </motion.div>
  );
}
