import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './components/views/DashboardView';
import { ApiKeysView } from './components/views/ApiKeysView';
import { PromptsView } from './components/views/PromptsView';
import { McpView } from './components/views/McpView';
import { SkillsView } from './components/views/SkillsView';
import { BookmarksView } from './components/views/BookmarksView';
import { VaultView } from './components/views/VaultView';
import { NotesView } from './components/views/NotesView';
import { TodosView } from './components/views/TodosView';
import { SnippetsView } from './components/views/SnippetsView';
import { DevToolsView } from './components/views/DevToolsView';
import { ClipboardView } from './components/views/ClipboardView';
import { FavoritesView } from './components/views/FavoritesView';
import { ActivityView } from './components/views/ActivityView';
import { SettingsView } from './components/views/SettingsView';

const MainViewRenderer: React.FC = () => {
  const { currentView } = useApp();

  switch (currentView) {
    case 'dashboard':
      return <DashboardView />;
    case 'api-keys':
      return <ApiKeysView />;
    case 'prompts':
      return <PromptsView />;
    case 'mcp':
      return <McpView />;
    case 'skills':
      return <SkillsView />;
    case 'bookmarks':
      return <BookmarksView />;
    case 'passwords':
      return <VaultView />;
    case 'notes':
      return <NotesView />;
    case 'todos':
      return <TodosView />;
    case 'snippets':
      return <SnippetsView />;
    case 'dev-tools':
      return <DevToolsView />;
    case 'clipboard':
      return <ClipboardView />;
    case 'favorites':
      return <FavoritesView />;
    case 'activity':
      return <ActivityView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
};

export default function App() {
  return (
    <AppProvider>
      <AppShell>
        <MainViewRenderer />
      </AppShell>
    </AppProvider>
  );
}
