import React from 'react';
import { Info, LogOut } from 'lucide-react';

interface NonDemoAccountViewProps {
  userEmail?: string;
  onLogout: () => void;
}

export const NonDemoAccountView: React.FC<NonDemoAccountViewProps> = ({ userEmail, onLogout }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
          <Info className="w-6 h-6 text-amber-600" />
        </div>
        <h1 className="text-lg font-bold text-slate-800">This is a demo environment</h1>
        <p className="text-sm text-slate-500">
          {userEmail && <>Signed in as <strong>{userEmail}</strong>. </>}
          Demo tenders and bidder data are only shown for the official demo account.
          Sign in with that account to view the full walkthrough.
        </p>
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
};