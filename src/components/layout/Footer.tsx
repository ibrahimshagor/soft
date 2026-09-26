import React from 'react';
import { useApp } from '../../context/AppContext';

export const Footer: React.FC = () => {
  const { businessProfile, language } = useApp();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="no-print mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 text-xs text-slate-500 dark:text-slate-400 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-1.5 text-center sm:flex-row sm:justify-between sm:text-left">
        
        {/* Mobile: 1st line RM AutoManage, 2nd line @currentYear RM Automobiles */}
        <div className="flex flex-col items-center sm:items-start sm:flex-row sm:gap-2">
          <span className="font-bold text-sm sm:text-xs text-slate-800 dark:text-slate-200">
            {language === 'bn' ? 'আরএম অটো ম্যানেজ' : businessProfile.appName}
          </span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span className="text-slate-600 dark:text-slate-400 font-medium">
            © {currentYear} {businessProfile.businessName || 'RM Automobiles'}. {language === 'bn' ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}
          </span>
        </div>

        {/* 3rd line / Right side: Developed by ... Powered by ... */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-2 gap-y-0.5 text-[11px] sm:text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {language === 'bn' ? 'ডেভেলপমেন্টে:' : 'Developed by'}{' '}
            <span className="font-bold text-slate-900 dark:text-white">Md. Ibrahim Hossain</span>
          </span>
          <span className="text-slate-400">•</span>
          <span>
            {language === 'bn' ? 'পাওয়ার্ড বাই' : 'Powered by'}{' '}
            <a
              href="https://tikmerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 underline underline-offset-2 transition-colors inline-flex items-center gap-1"
            >
              TIKMERK IT
              <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
};
