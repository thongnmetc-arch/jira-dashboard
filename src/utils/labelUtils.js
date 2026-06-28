/**
 * Label Manager utilities
 * Supports label management: ID generation, auto-rules, color presets, task syncing
 */

/**
 * Vietnamese diacritic removal map for slug generation
 */
const DIACRITIC_MAP = {
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'đ': 'd', 'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
};

function removeDiacritics(str) {
  return str
    .split('')
    .map(ch => DIACRITIC_MAP[ch] || ch)
    .join('');
}

/**
 * Generate a kebab-case label ID from a Vietnamese name
 * @param {string} name
 * @returns {string}
 */
export function generateLabelId(name) {
  if (!name) return '';
  return removeDiacritics(name.toLowerCase())
    .replace(/[^a-z0-9\s-]/g, '')   // remove non-alphanumeric except spaces and hyphens
    .trim()
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-');            // collapse multiple hyphens
}

/**
 * 12 preset hex colors for labels
 */
export const PRESET_COLORS = [
  '#ef4444', '#f59e0b', '#22c55e', '#06b6d4',
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#14b8a6', '#a855f7', '#84cc16', '#e11d48',
];

/**
 * Evaluate a single auto-rule against a task
 * @param {object} rule   { field, operator, match }
 * @param {object} task   A dashboard task object
 * @returns {boolean}
 */
export function evaluateRule(rule, task) {
  if (!rule || !task) return false;
  const { field, operator, match } = rule;
  if (!field || !match) return false;

  let value;
  switch (field) {
    case 'comps':
      value = (task.comps || []).join(', ');
      break;
    case 'assignee':
      value = task.assignee || '';
      break;
    case 'issueType':
      value = task.issueType || '';
      break;
    case 'primarySprint':
      value = task.primarySprint || '';
      break;
    case 'status':
      value = task.status || '';
      break;
    case 'priority':
      value = task.priority || '';
      break;
    default:
      return false;
  }

  const target = String(match).toLowerCase().trim();
  const source = String(value).toLowerCase().trim();

  if (operator === 'equals') {
    return source === target;
  }
  // contains (default)
  return source.includes(target);
}

/**
 * Run all auto-rules across all tasks
 * Returns a Map of taskKey → [labelIds] from matching rules
 * @param {Array} rules   Array of { id, field, operator, match, label }
 * @param {Array} tasks   Array of task objects
 * @returns {Map<string, string[]>}
 */
export function runAutoRules(rules, tasks) {
  const assignmentMap = new Map();

  if (!rules || rules.length === 0 || !tasks || tasks.length === 0) {
    return assignmentMap;
  }

  for (const rule of rules) {
    if (!rule.label) continue; // rule has no target label
    for (const task of tasks) {
      if (evaluateRule(rule, task)) {
        const key = task.key;
        if (!assignmentMap.has(key)) {
          assignmentMap.set(key, []);
        }
        const ids = assignmentMap.get(key);
        if (!ids.includes(rule.label)) {
          ids.push(rule.label);
        }
      }
    }
  }

  return assignmentMap;
}

/**
 * Ensure each task has a `labels` array based on labelAssignments
 * Mutates tasks in-place
 * @param {Array} tasks
 * @param {object} labelAssignments   { taskKey: [labelId, ...] }
 */
export function syncTaskLabels(tasks, labelAssignments) {
  if (!tasks || !labelAssignments) return;
  for (const task of tasks) {
    task.labels = labelAssignments[task.key] || [];
  }
}
