import { DatabaseState } from '../types/database';

export const initialDatabaseState: DatabaseState = {
  version: 1,
  id: 'ws_default_nexus',
  title: 'Workspace Nexus',
  tables: [
    {
      id: 't_projects',
      name: 'Projects',
      fields: [
        { id: 'f_title', name: 'Project Name', type: 'text' },
        {
          id: 'f_status',
          name: 'Status',
          type: 'select',
          options: ['Planning', 'In Progress', 'Review', 'Completed'],
        },
        { id: 'f_budget', name: 'Budget ($k)', type: 'number' },
        { id: 'f_priority', name: 'High Priority', type: 'checkbox' },
      ],
      rows: [
        {
          id: 'r_p1',
          f_title: 'Hyperlink Engine v2',
          f_status: 'In Progress',
          f_budget: 45,
          f_priority: true,
        },
        {
          id: 'r_p2',
          f_title: 'Zero-Backend Syncer',
          f_status: 'Review',
          f_budget: 28,
          f_priority: true,
        },
        {
          id: 'r_p3',
          f_title: 'Mobile PWA Manifest',
          f_status: 'Planning',
          f_budget: 15,
          f_priority: false,
        },
        {
          id: 'r_p4',
          f_title: 'Relational Graph Visualizer',
          f_status: 'Completed',
          f_budget: 60,
          f_priority: false,
        },
      ],
    },
    {
      id: 't_tasks',
      name: 'Tasks',
      fields: [
        { id: 'f_task_title', name: 'Task Summary', type: 'text' },
        {
          id: 'f_rel_project',
          name: 'Project',
          type: 'relation',
          relationTableId: 't_projects',
          relationDisplayFieldId: 'f_title',
        },
        {
          id: 'f_task_stage',
          name: 'Stage',
          type: 'select',
          options: ['Todo', 'In Progress', 'Done'],
        },
        { id: 'f_est_hours', name: 'Est. Hours', type: 'number' },
        { id: 'f_done', name: 'Resolved', type: 'checkbox' },
      ],
      rows: [
        {
          id: 'r_t1',
          f_task_title: 'Implement Deflate-Raw WebStream compression',
          f_rel_project: 'r_p2',
          f_task_stage: 'Done',
          f_est_hours: 8,
          f_done: true,
        },
        {
          id: 'r_t2',
          f_task_title: 'Design Neo-Brutalist monochromatic palette',
          f_rel_project: 'r_p1',
          f_task_stage: 'In Progress',
          f_est_hours: 12,
          f_done: false,
        },
        {
          id: 'r_t3',
          f_task_title: 'Foreign Key relational lookup popover',
          f_rel_project: 'r_p2',
          f_task_stage: 'In Progress',
          f_est_hours: 14,
          f_done: false,
        },
        {
          id: 'r_t4',
          f_task_title: 'Kanban view drag and drop cards',
          f_rel_project: 'r_p1',
          f_task_stage: 'Todo',
          f_est_hours: 6,
          f_done: false,
        },
        {
          id: 'r_t5',
          f_task_title: 'IndexedDB transaction wrapper',
          f_rel_project: 'r_p2',
          f_task_stage: 'Done',
          f_est_hours: 4,
          f_done: true,
        },
      ],
    },
    {
      id: 't_members',
      name: 'Team Members',
      fields: [
        { id: 'f_name', name: 'Full Name', type: 'text' },
        {
          id: 'f_role',
          name: 'Role',
          type: 'select',
          options: ['Architect', 'Frontend Lead', 'Systems Engineer', 'Security Auditor'],
        },
        {
          id: 'f_lead_project',
          name: 'Lead Project',
          type: 'relation',
          relationTableId: 't_projects',
          relationDisplayFieldId: 'f_title',
        },
        { id: 'f_verified', name: 'Verified Key', type: 'checkbox' },
      ],
      rows: [
        {
          id: 'r_m1',
          f_name: 'Elena Rostova',
          f_role: 'Architect',
          f_lead_project: 'r_p2',
          f_verified: true,
        },
        {
          id: 'r_m2',
          f_name: 'Marcus Vance',
          f_role: 'Frontend Lead',
          f_lead_project: 'r_p1',
          f_verified: true,
        },
        {
          id: 'r_m3',
          f_name: 'Sora Tanaka',
          f_role: 'Systems Engineer',
          f_lead_project: 'r_p4',
          f_verified: false,
        },
      ],
    },
  ],
  views: [
    {
      id: 'v_projects_table',
      tableId: 't_projects',
      name: 'Projects Grid',
      type: 'table',
    },
    {
      id: 'v_projects_kanban',
      tableId: 't_projects',
      name: 'Status Board',
      type: 'kanban',
      groupByFieldId: 'f_status',
    },
    {
      id: 'v_tasks_table',
      tableId: 't_tasks',
      name: 'Tasks Grid',
      type: 'table',
    },
    {
      id: 'v_tasks_kanban',
      tableId: 't_tasks',
      name: 'Tasks Kanban',
      type: 'kanban',
      groupByFieldId: 'f_task_stage',
    },
    {
      id: 'v_tasks_cards',
      tableId: 't_tasks',
      name: 'Task Cards',
      type: 'card',
      groupByFieldId: 'f_task_stage',
    },
    {
      id: 'v_tasks_list',
      tableId: 't_tasks',
      name: 'Sprint List',
      type: 'list',
    },
    {
      id: 'v_members_table',
      tableId: 't_members',
      name: 'Team Roster',
      type: 'table',
    },
  ],
  activeViewId: 'v_projects_table',
};

export function createBlankDatabase(title = 'New Database'): DatabaseState {
  const tableId = `t_${Date.now()}`;
  const viewId = `v_${Date.now()}`;
  const wsId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  return {
    version: 1,
    id: wsId,
    title,
    tables: [
      {
        id: tableId,
        name: 'Table 1',
        fields: [
          { id: `f_name_${Date.now()}`, name: 'Name', type: 'text' },
          { id: `f_notes_${Date.now()}`, name: 'Notes', type: 'text' },
        ],
        rows: [
          { id: `r_1_${Date.now()}` },
        ],
      },
    ],
    views: [
      {
        id: viewId,
        tableId: tableId,
        name: 'Grid View',
        type: 'table',
      },
    ],
    activeViewId: viewId,
    updatedAt: Date.now(),
  };
}

export function createHelpDatabase(): DatabaseState {
  return {
    version: 1,
    id: 'ws_urlbase_guide',
    title: 'UrlBase Tutorial & Guide',
    tables: [
      {
        id: 't_guide',
        name: 'Features & Guide',
        fields: [
          { id: 'f_topic', name: 'Feature / Topic', type: 'text' },
          {
            id: 'f_category',
            name: 'Category',
            type: 'select',
            options: ['Core Architecture', 'Data Types', 'Portability', 'Table Links', 'Productivity'],
          },
          {
            id: 'f_tags',
            name: 'Capabilities',
            type: 'multi_select',
            options: ['Zero-Backend', 'Offline-First', 'Compression', 'Keyboard', 'CSV', 'Formulas'],
          },
          { id: 'f_doc_url', name: 'Reference Link', type: 'url' },
          { id: 'f_completed', name: 'Learned', type: 'checkbox' },
        ],
        rows: [
          {
            id: 'r_g1',
            f_topic: 'Zero-Backend URL Compression',
            f_category: 'Core Architecture',
            f_tags: ['Zero-Backend', 'Compression'],
            f_doc_url: 'https://github.com',
            f_completed: true,
          },
          {
            id: 'r_g2',
            f_topic: 'Rich Data Types (Date, Tags, URL)',
            f_category: 'Data Types',
            f_tags: ['Zero-Backend', 'Offline-First'],
            f_doc_url: 'https://developer.mozilla.org',
            f_completed: true,
          },
          {
            id: 'r_g3',
            f_topic: 'Link Records Across Tables',
            f_category: 'Table Links',
            f_tags: ['Offline-First'],
            f_doc_url: '',
            f_completed: false,
          },
          {
            id: 'r_g4',
            f_topic: 'CSV & TSV Import / Export with Live Preview',
            f_category: 'Portability',
            f_tags: ['CSV', 'Import/Export'],
            f_doc_url: '',
            f_completed: false,
          },
          {
            id: 'r_g5',
            f_topic: 'Google Sheets-Style Range Selection & Footer Aggregations',
            f_category: 'Productivity',
            f_tags: ['Keyboard', 'Formulas'],
            f_doc_url: '',
            f_completed: false,
          },
        ],
      },
    ],
    views: [
      {
        id: 'v_guide_table',
        tableId: 't_guide',
        name: 'Guide Grid',
        type: 'table',
      },
      {
        id: 'v_guide_kanban',
        tableId: 't_guide',
        name: 'Roadmap Board',
        type: 'kanban',
        groupByFieldId: 'f_category',
      },
      {
        id: 'v_guide_cards',
        tableId: 't_guide',
        name: 'Topic Cards',
        type: 'card',
      },
      {
        id: 'v_guide_checklist',
        tableId: 't_guide',
        name: 'Mastery Checklist',
        type: 'list',
      },
    ],
    activeViewId: 'v_guide_table',
    updatedAt: Date.now(),
  };
}
