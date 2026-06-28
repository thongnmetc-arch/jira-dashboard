import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle2, ExternalLink, Plus } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import LabelBadge from './LabelBadge';
import LabelDropdown from './LabelDropdown';

const FIELD_LABELS = {
  key: 'Issue Key',
  summary: 'Tóm tắt',
  status: 'Trạng thái',
  issueType: 'Loại',
  priority: 'Mức độ ưu tiên',
  assignee: 'Người thực hiện',
  comps: 'Phân hệ',
  primarySprint: 'Sprint',
  timeSpentHr: 'Thời gian đã log',
  estimateHr: 'Giờ ước tính',
  created: 'Ngày tạo',
  resolved: 'Ngày kết thúc',
  dueDate: 'Hạn chót',
  labels: 'Nhãn',
};

function formatDate(d) {
  if (!d) return '—';
  try {
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

export default function TaskDetail({ task, onClose }) {
  if (!task) return null;
  const [copied, setCopied] = useState(false);
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const { state } = useApp();

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(task.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const fields = [
    { label: FIELD_LABELS.key, value: task.key },
    { label: FIELD_LABELS.summary, value: task.summary },
    { label: FIELD_LABELS.status, value: task.status || '—' },
    { label: FIELD_LABELS.issueType, value: task.issueType || '—' },
    { label: FIELD_LABELS.priority, value: task.priority || '—' },
    { label: FIELD_LABELS.assignee, value: task.assignee || '—' },
    { label: FIELD_LABELS.comps, value: task.comps && task.comps.length > 0 ? task.comps.join(', ') : '—' },
    { label: FIELD_LABELS.primarySprint, value: task.primarySprint || '—' },
    { label: FIELD_LABELS.timeSpentHr, value: task.timeSpentHr != null ? task.timeSpentHr.toFixed(1) + 'h' : '—' },
    { label: FIELD_LABELS.estimateHr, value: task.estimateHr != null ? task.estimateHr.toFixed(1) + 'h' : '—' },
    { label: FIELD_LABELS.created, value: formatDate(task.created) },
    { label: FIELD_LABELS.resolved, value: formatDate(task.resolved) },
  ];

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{task.key?.[0] || 'J'}</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {task.key}
                    </h2>
                    <p className="text-[11px] text-[var(--text-tertiary)] truncate">{task.summary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Copy key button */}
                  <button
                    onClick={handleCopyKey}
                    className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                    title="Sao chép Issue Key"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="max-h-[70vh] overflow-y-auto p-5 space-y-0">
                {fields.map((f, i) => (
                  <div
                    key={f.label}
                    className={`flex items-start gap-3 py-2.5 ${
                      i < fields.length - 1 ? 'border-b border-[var(--border-primary)]/50' : ''
                    }`}
                  >
                    <span className="w-32 flex-shrink-0 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider pt-0.5">
                      {f.label}
                    </span>
                    <span className="text-[13px] text-[var(--text-primary)] break-words flex-1">
                      {f.value}
                    </span>
                  </div>
                ))}
                {/* Labels field */}
                <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border-primary)]/50">
                  <span className="w-32 flex-shrink-0 text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider pt-0.5">
                    {FIELD_LABELS.labels}
                  </span>
                  <div className="flex-1 relative">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(task.labels || []).length > 0 ? (
                        (task.labels || []).map(lid => (
                          <LabelBadge key={lid} labelId={lid} labelDefs={state.labelDefs} />
                        ))
                      ) : (
                        <span className="text-[13px] text-[var(--text-tertiary)]">—</span>
                      )}
                      <button
                        onClick={() => setLabelDropdownOpen(v => !v)}
                        className="p-0.5 rounded text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
                        title="Gán nhãn"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {labelDropdownOpen && (
                      <div className="absolute left-0 top-full mt-1 z-50">
                        <LabelDropdown
                          taskKeys={task.key}
                          onClose={() => setLabelDropdownOpen(false)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-[var(--border-primary)] flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
