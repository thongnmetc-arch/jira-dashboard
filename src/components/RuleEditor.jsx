import { useState } from 'react';
import { Check, X, Trash2 } from 'lucide-react';

const FIELD_OPTIONS = [
  { value: 'comps', label: 'Phân hệ' },
  { value: 'assignee', label: 'Người thực hiện' },
  { value: 'issueType', label: 'Loại issue' },
  { value: 'primarySprint', label: 'Sprint' },
  { value: 'status', label: 'Trạng thái' },
  { value: 'priority', label: 'Mức ưu tiên' },
];

const OPERATOR_OPTIONS = [
  { value: 'contains', label: 'Chứa' },
  { value: 'equals', label: 'Bằng' },
];

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
      <select
        value={field}
        onChange={(e) => setField(e.target.value)}
        className="input-like text-xs py-1 px-2 min-w-[90px]"
      >
        {FIELD_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Operator select */}
      <select
        value={operator}
        onChange={(e) => setOperator(e.target.value)}
        className="input-like text-xs py-1 px-2 w-[70px]"
      >
        {OPERATOR_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Match value */}
      <input
        type="text"
        value={match}
        onChange={(e) => setMatch(e.target.value)}
        placeholder="Giá trị..."
        className="input-like text-xs py-1 px-2 min-w-[100px] flex-1"
      />

      {/* Target label select */}
      <select
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="input-like text-xs py-1 px-2 min-w-[90px]"
      >
        <option value="">— Nhãn —</option>
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
          title="Lưu"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        {isEditing && onDelete && (
          <button
            onClick={() => onDelete(rule.id)}
            className="p-1 rounded text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
            title="Xóa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onCancel}
          className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
          title="Hủy"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
