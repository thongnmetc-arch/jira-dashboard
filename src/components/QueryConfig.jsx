import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';
import StepIndicator from './StepIndicator';

export default function QueryConfig({ jiraConfig, selectedProject, onStart, onBack }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [jql, setJql] = useState('');

  return (
    <motion.div
      key="query-config"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-md mx-auto bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-0.5 shadow-xl"
    >
      <div className="bg-[var(--bg-primary)] rounded-2xl p-6 space-y-5">
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('query.back')}
          </button>
        )}

        {/* Step title */}
        <div className="text-center mb-1">
          <StepIndicator currentStep="query" />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {t('query.title')}
          </h2>
        </div>

        {/* Summary card */}
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">{t('filter.sprint')}</span>
            <span className="text-[var(--text-primary)] font-semibold">
              {selectedProject}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-secondary)]">{t('connect.url')}</span>
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
                <span className="text-[var(--text-tertiary)]">{t('query.notEntered')}</span>
              )}
            </span>
          </div>
        </div>

        {/* Email input */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
            {t('query.assigneeLabel')}{' '}
            <span className="text-[var(--text-tertiary)] font-normal">
              ({t('connect.optional')})
            </span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@company.com"
            className="w-full px-3.5 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl font-mono text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] transition-all"
          />
        </div>

        {/* JQL textarea */}
        <div>
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
            {t('query.jqlLabel')}{' '}
            <span className="text-[var(--text-tertiary)] font-normal">
              ({t('connect.optional')})
            </span>
          </label>
          <textarea
            value={jql}
            onChange={(e) => setJql(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onStart({ email: email.trim(), jql: jql.trim() }); } }}
            placeholder='project = "BXDBE" ORDER BY created DESC'
            rows={3}
            className="w-full px-3.5 py-2.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] resize-none font-mono text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] transition-all"
          />
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
            {t('query.emptyJql')}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-2.5 border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-xl font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('query.back')}
          </button>
          <button
            onClick={() =>
              onStart({ email: email.trim(), jql: jql.trim() })
            }
            className="flex-1 py-2.5 bg-[var(--accent)] hover:opacity-90 text-white rounded-xl font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent)]/20"
          >
            <ArrowRight className="w-4 h-4" />
            {t('query.start')}
          </button>
        </div>

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={() => onStart({ email: '', jql: '' })}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline transition-colors cursor-pointer"
          >
            {t('query.skipAll')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
