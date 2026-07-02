import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FolderKanban,
  RefreshCw,
  Check,
} from 'lucide-react';
import { fetchProjects } from '../utils/jiraApi';
import { useI18n } from '../i18n';

// ── Color palette for project avatars ──
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#2563eb', '#7c3aed', '#9333ea',
];

function getColor(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

/** Skeleton card shown during loading */
function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-3 bg-[var(--bg-tertiary)] rounded w-16" />
          <div className="h-2.5 bg-[var(--bg-tertiary)] rounded w-24" />
        </div>
      </div>
    </div>
  );
}

export default function ProjectSelector({ jiraConfig, onSelect, onBack, reselect }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    setError('');
    setSelected('');
    try {
      const list = await fetchProjects(
        jiraConfig.url,
        jiraConfig.email || jiraConfig.assignee || '',
        jiraConfig.token
      );
      // Sort alphabetically by key
      list.sort((a, b) => a.key.localeCompare(b.key));
      setProjects(list);
    } catch (err) {
      setError(err.message || t('projects.error'));
    } finally {
      setLoading(false);
    }
  }

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.key.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q)
    );
  }, [search, projects]);

  function handleSelect(key) {
    setSelected((prev) => (prev === key ? '' : key));
  }

  function handleContinue() {
    if (selected && onSelect) {
      onSelect(selected);
    }
  }

  return (
    <motion.div
      key="project-selector"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full max-w-5xl mx-auto flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6"
      style={{ height: 'calc(100vh - 6rem)' }}
    >
      {/* HEADER — fixed */}
      <div className="flex-shrink-0 space-y-4 pb-3 px-2">
        {/* Back button */}
        {onBack && !reselect && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('projects.back')}
          </button>
        )}

        {/* Step title */}
        <div className="text-center mb-1">
          <h2 className={`font-bold text-[var(--text-primary)] ${
            reselect ? 'text-lg' : 'text-xl'
          }`}>
            {reselect ? t('projects.switchProject') : t('projects.title')}
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{reselect ? '' : t('projects.step3')}</p>
        </div>

        {/* JIRA connection info */}
        {jiraConfig && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {t('projects.connected')}{jiraConfig.url}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 text-sm flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-[var(--danger)] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[var(--danger)] whitespace-pre-line">
                {error}
              </span>
            </div>
            <button
              onClick={loadProjects}
              className="flex-shrink-0 p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              title={t('common.retry')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search bar */}
        {loading ? (
          <div className="h-10 bg-[var(--bg-secondary)] rounded-xl animate-pulse" />
        ) : !error && projects.length > 0 ? (
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('projects.searchPlaceholder')}
              style={{ paddingLeft: '2.75rem' }}
              className="w-full pr-4 py-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
            />
          </div>
        ) : null}
      </div>

      {/* SCROLL — takes remaining space */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pr-4 pb-6">
        {/* Loading state: skeleton cards */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state — no projects at all */}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-12">
            <FolderKanban className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">
              {t('projects.noProjects')}
            </p>
          </div>
        )}

        {/* Project list */}
        {!loading && !error && projects.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {/* Count label */}
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-[var(--text-tertiary)]">
                {filteredProjects.length} {t('projects.project')}
              </p>
              {search && filteredProjects.length === 0 && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  {t('projects.noMatch')}
                </p>
              )}
            </div>

            {/* Project card grid — 2 columns on desktop */}
            {filteredProjects.length === 0 && !search ? (
              <div className="text-center py-8 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl">
                <p className="text-sm text-[var(--text-secondary)]">
                  {t('projects.noMatch')}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-1">
                {filteredProjects.map((project) => {
                  const isSelected = selected === project.key;
                  const avatarColor = getColor(project.key);
                  return (
                    <motion.button
                      key={project.key}
                      variants={cardVariants}
                      onClick={() => handleSelect(project.key)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                       className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-500/10 dark:to-indigo-500/5 ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-900/10 dark:hover:to-indigo-900/5 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/5'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Colored avatar circle with first 2 letters of key */}
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {project.key.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Name (bold) */}
                          <div className="font-semibold text-sm text-[var(--text-primary)] truncate leading-snug">
                            {project.name || '—'}
                          </div>

                          {/* Key (muted) */}
                          <div className="text-[11px] text-[var(--text-tertiary)] truncate mt-0.5 leading-tight font-mono">
                            {project.key}
                          </div>

                          {/* Type indicator */}
                          {project.projectTypeKey && (
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-tertiary)] border border-[var(--border-primary)]">
                              {project.projectTypeKey === 'software' ? 'Software' : project.projectTypeKey}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30"
                        >
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* FOOTER — fixed at bottom */}
      <div className="flex-shrink-0 pt-3 pb-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-end gap-3 px-2">
          {!reselect && (
            <button
              onClick={onBack}
              className="px-8 py-2.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-sm transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('projects.back')}
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <ArrowRight className="w-4 h-4" />
            {t('projects.next')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
