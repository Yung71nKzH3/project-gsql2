'use client';

import React, { useState, useMemo } from 'react';
import { DatabaseProvider, useDatabase } from '../context/DatabaseContext';
import { ThemeProvider } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { TableViewBar } from '../components/TableViewBar';
import { ControlBar } from '../components/ControlBar';
import { TableView } from '../components/TableView';
import { CardView } from '../components/CardView';
import { KanbanView } from '../components/KanbanView';
import { ListView } from '../components/ListView';
import { ImportCollisionModal } from '../components/ImportCollisionModal';

function MainApp() {
  const { activeTable, activeView } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterFieldId, setSelectedFilterFieldId] = useState('all');
  const [sortFieldId, setSortFieldId] = useState('');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter and sort active table rows
  const filteredRows = useMemo(() => {
    let result = [...activeTable.rows];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        if (selectedFilterFieldId === 'all') {
          return Object.values(row).some((val) =>
            val !== null && val !== undefined && String(val).toLowerCase().includes(q)
          );
        } else {
          const val = row[selectedFilterFieldId];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        }
      });
    }

    // Sort order
    if (sortFieldId) {
      result.sort((a, b) => {
        const valA = a[sortFieldId];
        const valB = b[sortFieldId];

        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }

        const cmp = String(valA).localeCompare(String(valB));
        return sortAsc ? cmp : -cmp;
      });
    }

    return result;
  }, [activeTable.rows, searchQuery, selectedFilterFieldId, sortFieldId, sortAsc]);

  // Render view depending on activeView.type
  const renderActiveView = () => {
    switch (activeView.type) {
      case 'table':
        return <TableView filteredRows={filteredRows} />;
      case 'card':
        return <CardView filteredRows={filteredRows} />;
      case 'kanban':
        return <KanbanView filteredRows={filteredRows} />;
      case 'list':
        return <ListView filteredRows={filteredRows} />;
      default:
        return <TableView filteredRows={filteredRows} />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-black text-black dark:text-white font-sans antialiased">
      <Header />
      <TableViewBar />
      <ControlBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedFilterFieldId={selectedFilterFieldId}
        onFilterFieldChange={setSelectedFilterFieldId}
        sortFieldId={sortFieldId}
        onSortFieldChange={setSortFieldId}
        sortAsc={sortAsc}
        onToggleSortOrder={() => setSortAsc((prev) => !prev)}
      />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {renderActiveView()}
      </main>
      <ImportCollisionModal />
    </div>
  );
}

export default function Page() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <MainApp />
      </DatabaseProvider>
    </ThemeProvider>
  );
}
