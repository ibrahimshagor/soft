import React, { useState } from 'react';
import {
  Wrench,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LoginView: React.FC = () => {
  const { businessProfile, users, login, language, setLanguage, t } = useApp();

  const [usernameOrPhone, setUsernameOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = login(usernameOrPhone, password);
      if (!res.success) {
        setError(res.error || (language === 'bn' ? 'ইউজারনেম বা পাসওয়ার্ড সঠিক নয়' : 'Invalid username or password.'));
      }
      setIsLoading(false);
    }, 150);
  };

  const handleQuickSelect = (u: (typeof users)[0]) => {
    setUsernameOrPhone(u.username || u.phone);
    setPassword(u.password || '123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher in Header */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <button
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
        >
          {language === 'en' ? 'বাংলা' : 'English'}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Branding */}
        <div className="text-center">
          {businessProfile.logoUrl ? (
            <img
              src={businessProfile.logoUrl}
              alt={businessProfile.businessName}
              className="mx-auto h-16 w-16 object-contain rounded-2xl border border-slate-700 bg-white p-1 shadow-lg"
            />
          ) : (
            <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 font-black">
              <Wrench className="w-8 h-8 text-white" />
            </div>
          )}

          <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-white">
            {businessProfile.businessName}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {businessProfile.appName} • {language === 'bn' ? 'অটোমোবাইল ম্যানেজমেন্ট সিস্টেমে স্বাগতম' : 'Automobile Business Management ERP'}
          </p>
        </div>

        {/* Card */}
        <div className="mt-8 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 py-8 px-6 sm:px-8 shadow-2xl rounded-3xl">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {language === 'bn' ? 'ইউজারনেম অথবা মোবাইল নম্বর' : 'Username or Mobile Number'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameOrPhone}
                  onChange={(e) => setUsernameOrPhone(e.target.value)}
                  placeholder={language === 'bn' ? 'e.g. admin বা 01711...' : 'e.g. admin or 01711...'}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-98 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? (language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Signing in...') : (language === 'bn' ? 'লগইন করুন' : 'Sign In')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Accounts Selection (Controlled by Super Admin in Settings) */}
          {businessProfile.enableDemoMode !== false && (
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>{language === 'bn' ? 'ডেমো ইউজার নির্বাচন করুন (Demo Accounts)' : 'Demo Accounts (Quick Select)'}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              </div>

              <div className="space-y-2">
                {users.map((u) => {
                  const isSelected = usernameOrPhone === (u.username || u.phone);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickSelect(u)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-white font-bold'
                          : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{u.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Username: <span className="font-mono text-amber-400">{u.username || u.phone}</span> • Pass: <span className="font-mono text-slate-400">123</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'super_admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          u.role === 'manager' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {u.role === 'super_admin' ? t('superAdmin') : u.role === 'manager' ? t('manager') : t('staff')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500">
          Software: RM AutoManage • Developed by Md. Ibrahim Hossain • Powered by TIKMERK IT
        </div>
      </div>
    </div>
  );
};
