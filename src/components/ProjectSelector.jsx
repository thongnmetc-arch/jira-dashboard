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
} from 'lucide-react';
import { fetchProjects } from '../utils/jiraApi';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1 },
};

export default function ProjectSelector({ jiraConfig, onSelect, onBack, reselect }) {
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
      setError(err.message || 'Không thể tải danh sách dự án.');
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
      className="w-full max-w-2xl mx-auto"
    >
      <div className="space-y-5">
        {/* Back button */}
        {onBack && !reselect && (
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
          <h2 className={`font-bold text-[var(--text-primary)] ${
            reselect ? 'text-lg' : 'text-xl'
          }`}>
            {reselect ? 'Đổi dự án' : 'Chọn dự án'}
          </h2>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">{reselect ? '' : 'Bước 3/4'}</p>
        </div>

        {/* JIRA connection info */}
        {jiraConfig && (
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-tertiary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            Đã kết nối: {jiraConfig.url}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[var(--danger)] mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[var(--danger)] whitespace-pre-line">
                {error}
              </span>
            </div>
            <button
              onClick={loadProjects}
              className="flex-shrink-0 p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              title="Thử lại"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-9 h-9 border-4 border-[var(--border-secondary)] border-t-[var(--accent)] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">
              Đang tải danh sách dự án...
            </p>
          </div>
        )}

        {/* Empty state — no projects at all */}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-12">
            <FolderKanban className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-secondary)]">
              Không có dự án nào.
            </p>
          </div>
        )}

        {/* Project list */}
        {!loading && !error && projects.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {/* Search bar — standalone */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm dự án theo tên hoặc mã..."
                style={{ paddingLeft: '2.75rem' }}
                className="w-full pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-all"
              />
            </div>

            {/* Count label */}
            <p className="text-xs text-[var(--text-tertiary)] px-1">
              {filteredProjects.length} dự án
            </p>

            {/* Project card grid */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-8 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl">
                <p className="text-sm text-[var(--text-secondary)]">
                  Không tìm thấy dự án phù hợp.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {filteredProjects.map((project) => {
                  const isSelected = selected === project.key;
                  return (
                    <motion.button
                      key={project.key}
                      variants={cardVariants}
                      onClick={() => handleSelect(project.key)}
                      className={`relative p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]/30'
                          : 'border-[var(--border-primary)] bg-[var(--bg-primary)] hover:border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-sm font-bold mb-2 ${
                        isSelected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                      }`}>
                        {project.key.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Key */}
                      <div className="font-semibold text-sm text-[var(--text-primary)] truncate">
                        {project.key}
                      </div>

                      {/* Name */}
                      <div className="text-[10px] text-[var(--text-tertiary)] truncate mt-0.5 leading-tight">
                        {project.name || '—'}
                      </div>

                      {/* Selection check */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center"
                        >
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-1">
          {!reselect && (
            <button
              onClick={onBack}
              className="flex-1 py-2 border border-[var(--border-primary)] hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] rounded-lg font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="flex-1 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Tiếp tục
          </button>
        </div>

        {/* Keyboard hint */}
        <p className="text-center text-[10px] text-[var(--text-tertiary)]">
          Nhấn Enter để chọn
        </p>
      </div>
    </motion.div>
  );
}
