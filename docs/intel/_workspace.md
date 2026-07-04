# SDLC Workspace

**Project:** JIRA Dashboard  
**Created:** 2026-06-28  
**Last Updated:** 2026-07-04  
**Version:** v1.2.0  
**Status:** Released  
**Framework:** React 19 + Vite 6 + Tailwind CSS 4 + react-router-dom  
**Type:** mini  

## Description

A real-time JIRA dashboard SPA built with React 19, Vite 6, Tailwind CSS 4, and react-router-dom. Features include password-protected login, wizard setup flow (Connect → Project → Query → Dashboard), 7-tab dashboard (Overview / Charts / Data / Gantt / Compare / OT / History), Weekly Planner with worklog, Create Task view, Chart.js visualizations, Label Manager (inline), History snapshots, OT/Leave management, and Electron desktop app with SSO.

## Directory Structure

```
docs/
├── intel/               # Intelligence artifacts (documents, research)
│   ├── _workspace.md    # This file — workspace metadata
│   ├── _documents/      # In-app documents (TKCS, SRS, reports)
│   └── _slides/         # Presentation decks
├── modules/             # Module definitions
│   ├── _modules.md      # Module catalog
│   └── M-001/           # Module 1
└── features/            # Feature definitions
    └── _features.md     # Feature catalog
```

## Routes

| Route               | Component       | Description             |
|---------------------|-----------------|-------------------------|
| `/login`            | LoginScreen     | Password-protected auth |
| `/connect`          | JiraConnect     | JIRA API connection     |
| `/projects`         | ProjectSelector | Grid card project picker|
| `/query`            | QueryConfig     | JQL/Assignee config     |
| `/dashboard`        | Dashboard       | Main dashboard          |
| `/dashboard/:tab`   | Dashboard       | Tab-paneled dashboard   |
| `/work-plan/weekly` | WeeklyPlanner   | Weekly task planner     |
| `/work-plan/create` | CreateTaskView  | Create JIRA task        |

## Conventions

- Module IDs: `M-XXX` (e.g., `M-001`)
- Feature IDs: `F-XXX` (e.g., `F-001`)
- Document IDs: kebab-case (e.g., `tkcs-jira-dashboard`)
- Test IDs: `TC-XXX` (e.g., `TC-001`)
