import { parseJiraDate } from './dateUtils';

/**
 * Parse JIRA HTML export (Excel HTML format)
 * Extracts issues from the full 59-column HTML table structure
 * exported by JIRA's "Export → Excel (HTML)" feature.
 *
 * Column mapping (from the HTML header row):
 *   .project               → project
 *   .issuekey              → key (from data-issuekey + <a> text)
 *   .summary               → summary (via <p> wrapper textContent)
 *   .issuetype             → type (Task / Sub-task / etc.)
 *   .status                → status (from <span> lozenge text)
 *   .priority              → priority
 *   .resolution            → resolution (Done / Unresolved)
 *   .assignee              → assignee
 *   .reporter              → reporter
 *   .creator               → creator
 *   .created               → created (via parseJiraDate)
 *   .updated               → updated (via parseJiraDate)
 *   .resolutiondate        → resolved (via parseJiraDate)
 *   .components            → comps (whitespace/comma-separated list)
 *   .duedate               → dueDate (via parseJiraDate)
 *   .timeoriginalestimate  → originalEstimateSec (seconds)
 *   .timeestimate          → estimateSec (remaining estimate, seconds)
 *   .timespent             → timeSpentSec (seconds)
 *   .customfield_10206     → sprints (comma-separated names)
 *   .customfield_10302     → dueDateTime (from <time datetime>)
 *   .customfield_10300     → startDateTime (from <time datetime>)
 *   .customfield_10205     → rank
 */
export function parseJiraHtml(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');

  const rows = doc.querySelectorAll('tr.issuerow');
  const tasks = [];

  // Helper: get clean text from a td by CSS class
  const getCellText = (row, className) => {
    const cell = row.querySelector(`td.${className}`);
    if (!cell) return '';
    return (cell.textContent || '').replace(/\s+/g, ' ').trim();
  };

  // Helper: parse seconds from a td (numeric textContent)
  const getCellSeconds = (row, className) => {
    const text = getCellText(row, className);
    if (!text) return 0;
    const n = parseInt(text, 10);
    return isNaN(n) ? 0 : n;
  };

  // Helper: get <time datetime> from a td
  const getTimeDatetime = (row, className) => {
    const cell = row.querySelector(`td.${className}`);
    if (!cell) return null;
    const timeEl = cell.querySelector('time');
    if (!timeEl) return null;
    const dt = timeEl.getAttribute('datetime');
    if (!dt) return null;
    const d = new Date(dt);
    return isNaN(d.getTime()) ? null : d;
  };

  rows.forEach(row => {
    try {
      const key = row.getAttribute('data-issuekey')?.trim();
      if (!key) return;

      // --- Basic fields ---
      const project = getCellText(row, 'project');
      const summary = getCellText(row, 'summary');
      const type = getCellText(row, 'issuetype');
      const status = getCellText(row, 'status');
      const priority = getCellText(row, 'priority');
      const resolution = getCellText(row, 'resolution');
      const assignee = getCellText(row, 'assignee');
      const reporter = getCellText(row, 'reporter');
      const creator = getCellText(row, 'creator');

      // --- Dates ---
      const createdText = getCellText(row, 'created');
      const updatedText = getCellText(row, 'updated');
      const resolutionDateText = getCellText(row, 'resolutiondate');

      // --- Components ---
      const compText = getCellText(row, 'components');
      const comps = compText
        ? compText
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : [];

      // --- Due Date (plain) ---
      const dueDateText = getCellText(row, 'duedate');

      // --- Time tracking ---
      const originalEstimateSec = getCellSeconds(row, 'timeoriginalestimate');
      const estimateSec = getCellSeconds(row, 'timeestimate');
      const timeSpentSec = getCellSeconds(row, 'timespent');

      // --- Sprint ---
      const sprintText = getCellText(row, 'customfield_10206');
      const sprints = sprintText
        ? sprintText.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      // --- Start Date (Time) from customfield_10300 ---
      const startDate = getTimeDatetime(row, 'customfield_10300');

      // --- Due Date (Time) from customfield_10302 ---
      const dueDateTime = getTimeDatetime(row, 'customfield_10302');

      // --- Rank from customfield_10205 ---
      const rank = getCellText(row, 'customfield_10205');

      tasks.push({
        key,
        project,
        summary,
        type: type || 'Task',
        status,
        priority,
        resolution,
        assignee,
        reporter,
        creator,
        comps,
        sprints,
        primarySprint: sprints.length > 0 ? sprints[sprints.length - 1] : '',
        originalEstimateSec,
        originalEstimateHr: originalEstimateSec / 3600,
        estimateSec,
        estimateHr: estimateSec / 3600,
        timeSpentSec,
        timeSpentHr: timeSpentSec / 3600,
        created: parseJiraDate(createdText),
        updated: parseJiraDate(updatedText),
        resolved: resolveDate(resolutionDateText),
        dueDate: parseJiraDate(dueDateText),
        dueDateTime,
        startDate: startDate || dueDateTime || parseJiraDate(createdText),
        rank,
        labels: [],
      });
    } catch (e) {
      console.warn('Lỗi parse dòng HTML:', row.getAttribute('data-issuekey'), e);
    }
  });

  return tasks;
}

// Resolution date is in the same format as other JIRA dates,
// or empty/&nbsp; for unresolved issues
function resolveDate(str) {
  if (!str || str.trim() === '' || str === '&nbsp;' || str.includes('Unresolved')) return null;
  return parseJiraDate(str.trim());
}
