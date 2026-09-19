import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../common/ToastContainer';
import { CommandPalette } from '../common/CommandPalette';
import { GlobalSearchModal } from '../common/GlobalSearchModal';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          id="main-content-scroll"
          className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-neutral-100/60 dark:bg-neutral-950/60"
        >
          <div className="max-w-6xl mx-auto w-full">{children}</div>
        </main>
      </div>

      <ToastContainer />
      <CommandPalette />
      <GlobalSearchModal />
    </div>
  );
};
