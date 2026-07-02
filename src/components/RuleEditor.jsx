import { useState, useRef, useEffect } from 'react';
import { Check, X, Trash2, ChevronDown } from 'lucide-react';
import { useI18n } from '../i18n';

const FIELD_OPTIONS = [
  { value: 'comps', labelKey: 'filter.component' },
  { value: 'assignee', labelKey: 'filter.assignee' },
  { value: 'issueType', labelKey: 'table.key' },
  { value: 'primarySprint', labelKey: 'filter.sprint' },
  { value: 'status', labelKey: 'table.status' },
  { value: 'priority', labelKey: 'table.key' },
];

const OPERATOR_OPTIONS = [
  { value: 'contains', labelKey: 'common.save' },
  { value: 'equals', labelKey: 'common.confirm' },
];

// ── Custom dropdown ─────────────────────────────────────────────────────────

function Dropdown({ value, onChange, options, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasValue = value !== '' && value !== undefined && value !== null;
  const selected = options.find(o => o.value === value);
  const displayLabel = selected ? selected.label : (placeholder || '');

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
          hasValue
            ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]'
            : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
        } ${className || ''}`}
      >
        <span className="max-w-[100px] truncate">{displayLabel}</span>
        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 max-h-60 overflow-y-auto bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-xl shadow-xl py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--bg-secondary)] cursor-pointer ${
                value === opt.value
                  ? 'text-[var(--accent)] font-medium bg-[var(--accent-light)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Inline rule editor for auto-label rules.
 * Props:
 *   rule      – existing rule object, or null for new rule
 *   labelDefs – all defined label definitions
 *   onSave    – (ruleData) => void
 *   onDelete  – (ruleId) => void  (null for new rules)
 *   onCancel  – () => void
 */
export default function RuleEditor({ rule, labelDefs, onSave, onDelete, onCancel }) {
  const { t } = useI18n();
  const [field, setField] = useState(rule?.field || 'comps');
  const [operator, setOperator] = useState(rule?.operator || 'contains');
  const [match, setMatch] = useState(rule?.match || '');
  const [label, setLabel] = useState(rule?.label || '');

  const isEditing = !!rule;

  const handleSave = () => {
    if (!match.trim() || !label) return;
    onSave({
      ...(rule?.id ? { id: rule.id } : {}),
      field,
      operator,
      match: match.trim(),
      label,
    });
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex-wrap">
      {/* Field select */}
      <Dropdown
        value={field}
        onChange={setField}
        options={FIELD_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }))}
      />

      {/* Operator select */}
      <Dropdown
        value={operator}
        onChange={setOperator}
        options={OPERATOR_OPTIONS.map(opt => ({ value: opt.value, label: t(opt.labelKey) }))}
      />

      {/* Match value */}
      <input
        type="text"
        value={match}
        onChange={(e) => setMatch(e.target.value)}
        placeholder={t('common.search')}
        className="input-like text-xs py-1 px-2 min-w-[100px] flex-1"
      />

      {/* Target label select */}
      <select
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="input-like text-xs py-1 px-2 min-w-[90px]"
      >
        <option value="">— {t('labels.name')} —</option>
        {Object.entries(labelDefs || {}).map(([id, def]) => (
          <option key={id} value={id}>{def.name}</option>
        ))}
      </select>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleSave}
          disabled={!match.trim() || !label}
          className="p-1 rounded text-[var(--success)] hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-30 cursor-pointer"
          title={t('common.save')}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        {isEditing && onDelete && (
          <button
            onClick={() => onDelete(rule.id)}
            className="p-1 rounded text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            title={t('common.delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onCancel}
          className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          title={t('common.cancel')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
