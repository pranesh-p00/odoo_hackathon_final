import React, { useState, useEffect } from 'react';
import { login, register, logout, getStoredUser, requestPasswordReset, verifyOtp, resetPassword } from './authService';
import { AuthStatus, User } from './types';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin' | 'internal_staff'>('user');
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<AuthStatus>(AuthStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      setStatus(AuthStatus.SUCCESS);
    }
  }, []);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setRole('user');
    setErrorMessage(null);
    setStatus(AuthStatus.IDLE);
    setResetEmail('');
    setResetOtp('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetStep(1);
    setResetMessage(null);
  };

  const handleModeSwitch = (newMode: 'LOGIN' | 'REGISTER' | 'FORGOT') => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'FORGOT') return;
    setStatus(AuthStatus.LOADING);
    setErrorMessage(null);

    try {
      let response;
      if (mode === 'REGISTER') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        response = await register(name, email, password, role);
      } else {
        response = await login(email, password);
      }
      
      setCurrentUser(response.user);
      setStatus(AuthStatus.SUCCESS);
    } catch (err: any) {
      setStatus(AuthStatus.ERROR);
      setErrorMessage(err.message || "An unexpected error occurred");
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setStatus(AuthStatus.IDLE);
    setMode('LOGIN');
  };

  const handleRequestOtp = async () => {
    setStatus(AuthStatus.LOADING);
    setErrorMessage(null);
    setResetMessage(null);
    try {
      const response = await requestPasswordReset(resetEmail);
      setResetMessage(response.message + (response.otp ? ` OTP: ${response.otp}` : ''));
      setResetStep(2);
      setStatus(AuthStatus.IDLE);
    } catch (err: any) {
      setStatus(AuthStatus.ERROR);
      setErrorMessage(err.message || "Failed to request OTP");
    }
  };

  const handleVerifyOtp = async () => {
    setStatus(AuthStatus.LOADING);
    setErrorMessage(null);
    try {
      await verifyOtp(resetEmail, resetOtp);
      setResetStep(3);
      setStatus(AuthStatus.IDLE);
    } catch (err: any) {
      setStatus(AuthStatus.ERROR);
      setErrorMessage(err.message || "OTP verification failed");
    }
  };

  const handleResetPassword = async () => {
    setStatus(AuthStatus.LOADING);
    setErrorMessage(null);
    if (resetNewPassword !== resetConfirmPassword) {
      setStatus(AuthStatus.ERROR);
      setErrorMessage("Passwords do not match");
      return;
    }
    try {
      const response = await resetPassword(resetEmail, resetOtp, resetNewPassword);
      setResetMessage(response.message);
      setStatus(AuthStatus.SUCCESS);
      setMode('LOGIN');
      setEmail(resetEmail);
      setPassword('');
    } catch (err: any) {
      setStatus(AuthStatus.ERROR);
      setErrorMessage(err.message || "Password reset failed");
    }
  };

  // --- DASHBOARD VIEW (Protected) ---
  if (currentUser && status === AuthStatus.SUCCESS) {
    const isAdmin = currentUser.role === 'admin';
    const isInternalStaff = currentUser.role === 'internal_staff';
    const roleLabel = isInternalStaff ? 'Internal Staff' : currentUser.role;
    
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background-light dark:bg-background-dark relative overflow-hidden">
         <div className="absolute inset-0 bg-grid-pattern dark:bg-grid-pattern-dark pointer-events-none z-0"></div>
         
         <div className={`w-full max-w-2xl ${
           isAdmin 
             ? 'bg-slate-900 border-slate-700' 
             : isInternalStaff 
               ? 'bg-white dark:bg-[#112a2a] border-[#dbe6de] dark:border-[#1f3a3a]'
               : 'bg-white dark:bg-[#1a2e1f] border-[#dbe6de] dark:border-[#2a4531]'
         } rounded-xl shadow-2xl relative z-10 border overflow-hidden transition-colors duration-500`}>
            
            {/* Dashboard Header */}
            <div className={`h-2 w-full ${isAdmin ? 'bg-purple-500' : isInternalStaff ? 'bg-teal-500' : 'bg-primary'}`}></div>
            
            <div className="flex flex-col md:flex-row">
              {/* Sidebar / Info Panel */}
              <div className={`p-8 md:w-1/3 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r ${
                isAdmin 
                  ? 'border-slate-700 bg-slate-800/50' 
                  : isInternalStaff 
                    ? 'border-[#e6f0ee] dark:border-[#1f3a3a] bg-teal-50/40 dark:bg-[#0f2020]'
                    : 'border-[#f0f4f1] dark:border-[#2a4531] bg-gray-50 dark:bg-[#15251a]'
              }`}>
                 <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 ${
                   isAdmin 
                     ? 'bg-purple-500/20 text-purple-400' 
                     : isInternalStaff 
                       ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                       : 'bg-primary/10 text-primary'
                 }`}>
                    <span className="material-symbols-outlined text-5xl">
                      {isAdmin ? 'admin_panel_settings' : isInternalStaff ? 'badge' : 'account_circle'}
                    </span>
                 </div>
                 <h2 className={`text-xl font-bold mb-1 ${isAdmin ? 'text-white' : 'text-[#111813] dark:text-white'}`}>
                   {currentUser.name}
                 </h2>
                 <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 ${
                   isAdmin 
                     ? 'bg-purple-500/20 text-purple-300' 
                     : isInternalStaff 
                       ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                       : 'bg-primary/20 text-primary-dark dark:text-primary'
                 }`}>
                   {roleLabel}
                 </span>
                 
                 <button 
                  onClick={handleLogout}
                  className={`w-full py-2 px-4 rounded-lg border text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2
                    ${isAdmin 
                      ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-red-900/20 hover:border-red-800 hover:text-red-400' 
                      : 'bg-white dark:bg-[#1a2e1f] border-[#dbe6de] dark:border-[#3a5840] hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:hover:bg-red-900/10 dark:hover:border-red-800 dark:hover:text-red-400 text-[#111813] dark:text-white'
                    }`}
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Sign Out
                </button>
              </div>

              {/* Main Content Area */}
              <div className="p-8 md:w-2/3">
                 <div className="mb-6">
                    <h3 className={`text-2xl font-bold mb-2 ${isAdmin ? 'text-white' : 'text-[#111813] dark:text-white'}`}>
                      {isAdmin ? 'System Overview' : isInternalStaff ? 'Staff Dashboard' : 'My Dashboard'}
                    </h3>
                    <p className={`text-sm ${isAdmin ? 'text-slate-400' : isInternalStaff ? 'text-teal-700/80 dark:text-teal-300/80' : 'text-[#61896b] dark:text-[#a0cfa5]'}`}>
                      {isAdmin 
                        ? 'You have full access to system settings and user management.' 
                        : isInternalStaff
                          ? 'Access internal tools, support queues, and operational updates.'
                          : 'Manage your personal settings and view your activity logs.'}
                    </p>
                 </div>

                 {/* Mock Content Blocks */}
                 <div className="grid grid-cols-1 gap-4">
                    {/* Block 1 */}
                    <div className={`p-4 rounded-lg border ${
                      isAdmin 
                        ? 'bg-slate-800 border-slate-700' 
                        : isInternalStaff
                          ? 'bg-white/70 dark:bg-[#0f2020] border-[#d7ece7] dark:border-[#1f3a3a]'
                          : 'bg-background-light dark:bg-background-dark border-[#dbe6de] dark:border-[#2a4531]'
                    }`}>
                       <div className="flex items-center gap-3 mb-2">
                          <span className={`material-symbols-outlined ${isAdmin ? 'text-blue-400' : isInternalStaff ? 'text-teal-600 dark:text-teal-400' : 'text-primary'}`}>
                            {isAdmin ? 'group' : isInternalStaff ? 'support_agent' : 'notifications'}
                          </span>
                          <h4 className={`font-bold ${isAdmin ? 'text-slate-200' : 'text-[#111813] dark:text-white'}`}>
                             {isAdmin ? 'User Management' : isInternalStaff ? 'Staff Queue' : 'Recent Notifications'}
                          </h4>
                       </div>
                       <p className={`text-sm ${isAdmin ? 'text-slate-400' : isInternalStaff ? 'text-teal-700/80 dark:text-teal-300/80' : 'text-[#61896b] dark:text-[#8ab895]'}`}>
                          {isAdmin ? '342 Active Users registered this week.' : isInternalStaff ? '5 tickets waiting for review in your queue.' : 'You have no unread notifications at this time.'}
                       </p>
                    </div>

                    {/* Block 2 */}
                    <div className={`p-4 rounded-lg border ${
                      isAdmin 
                        ? 'bg-slate-800 border-slate-700' 
                        : isInternalStaff
                          ? 'bg-white/70 dark:bg-[#0f2020] border-[#d7ece7] dark:border-[#1f3a3a]'
                          : 'bg-background-light dark:bg-background-dark border-[#dbe6de] dark:border-[#2a4531]'
                    }`}>
                       <div className="flex items-center gap-3 mb-2">
                          <span className={`material-symbols-outlined ${isAdmin ? 'text-yellow-400' : isInternalStaff ? 'text-teal-600 dark:text-teal-400' : 'text-primary'}`}>
                            {isAdmin ? 'database' : isInternalStaff ? 'badge' : 'history'}
                          </span>
                          <h4 className={`font-bold ${isAdmin ? 'text-slate-200' : 'text-[#111813] dark:text-white'}`}>
                             {isAdmin ? 'System Database' : isInternalStaff ? 'Shift Summary' : 'Login History'}
                          </h4>
                       </div>
                       <p className={`text-sm ${isAdmin ? 'text-slate-400' : isInternalStaff ? 'text-teal-700/80 dark:text-teal-300/80' : 'text-[#61896b] dark:text-[#8ab895]'}`}>
                          {isAdmin ? 'Database running optimal at 12ms latency.' : isInternalStaff ? 'On duty: 3 hours. SLA compliance is green.' : 'Last login: Just now from Chrome on Windows.'}
                       </p>
                    </div>
                    
                    {isAdmin && (
                      <div className="p-4 rounded-lg border bg-purple-900/20 border-purple-500/30">
                         <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-purple-400">security</span>
                            <h4 className="font-bold text-purple-100">Admin Controls</h4>
                         </div>
                         <div className="flex gap-2 mt-3">
                            <button className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded transition-colors">View Logs</button>
                            <button className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors">Settings</button>
                         </div>
                      </div>
                    )}
                 </div>
              </div>
            </div>
         </div>
      </div>
    );
  }

  // --- AUTH FORMS ---
  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern dark:bg-grid-pattern-dark pointer-events-none z-0"></div>

      {/* Main Container */}
      <div className="w-full max-w-md bg-white dark:bg-[#1a2e1f] rounded-xl shadow-2xl relative z-10 border border-[#dbe6de] dark:border-[#2a4531]">
        
        {/* Header Tabs */}
        <div className="flex items-center border-b border-[#f0f4f1] dark:border-[#2a4531]">
          <button 
            onClick={() => handleModeSwitch('LOGIN')}
            className={`flex-1 py-4 text-sm font-bold transition-colors relative ${mode === 'LOGIN' ? 'text-primary' : 'text-[#61896b] hover:text-[#111813] dark:hover:text-white'}`}
          >
            Sign In
            {mode === 'LOGIN' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
          </button>
          <button 
            onClick={() => handleModeSwitch('REGISTER')}
            className={`flex-1 py-4 text-sm font-bold transition-colors relative ${mode === 'REGISTER' ? 'text-primary' : 'text-[#61896b] hover:text-[#111813] dark:hover:text-white'}`}
          >
            Create Account
            {mode === 'REGISTER' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>}
          </button>
        </div>

        <div className="px-8 py-8 flex flex-col gap-6">
          {/* Titles */}
          <div className="text-center">
            <h1 className="text-[#111813] dark:text-white text-2xl font-bold tracking-tight mb-2">
              {mode === 'LOGIN' ? 'Welcome Back' : 'Get Started'}
            </h1>
            <p className="text-[#61896b] dark:text-[#a0cfa5] text-sm">
              {mode === 'LOGIN' ? 'Enter your credentials to access your account.' : 'Join us to manage your projects efficiently.'}
            </p>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm animate-pulse">
                 <span className="material-symbols-outlined text-sm">error</span>
                 {errorMessage}
              </div>
            )}

            {resetMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {resetMessage}
              </div>
            )}

            {mode === 'FORGOT' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#111813] dark:text-[#e0e7e1] text-sm font-semibold" htmlFor="resetEmail">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#61896b] flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-[20px]">mail</span>
                    </span>
                    <input
                      id="resetEmail"
                      name="resetEmail"
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="form-input w-full rounded-lg border border-[#dbe6de] dark:border-[#3a5840] bg-white dark:bg-[#15251a] text-[#111813] dark:text-white pl-11 pr-4 py-3 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary placeholder-[#61896b]/60 dark:placeholder-[#61896b]"
                    />
                  </div>
                </div>

                {resetStep >= 2 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[#111813] dark:text-[#e0e7e1] text-sm font-semibold" htmlFor="resetOtp">OTP</label>
                    <input
                      id="resetOtp"
                      name="resetOtp"
                      type="text"
                      required
                      placeholder="6-digit OTP"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      className="form-input w-full rounded-lg border border-[#dbe6de] dark:border-[#3a5840] bg-white dark:bg-[#15251a] text-[#111813] dark:text-white px-4 py-3 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary placeholder-[#61896b]/60 dark:placeholder-[#61896b]"
                    />
                  </div>
                )}

                {resetStep >= 3 && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[#111813] dark:text-[#e0e7e1] text-sm font-semibold" htmlFor="resetNewPassword">New Password</label>
                      <input
                        id="resetNewPassword"
                        name="resetNewPassword"
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        className="form-input w-full rounded-lg border border-[#dbe6de] dark:border-[#3a5840] bg-white dark:bg-[#15251a] text-[#111813] dark:text-white px-4 py-3 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary placeholder-[#61896b]/60 dark:placeholder-[#61896b]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[#111813] dark:text-[#e0e7e1] text-sm font-semibold" htmlFor="resetConfirmPassword">Confirm New Password</label>
                      <input
                        id="resetConfirmPassword"
                        name="resetConfirmPassword"
                        type="password"
                        required
                        minLength={6}
                        placeholder="••••••••"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        className="form-input w-full rounded-lg border border-[#dbe6de] dark:border-[#3a5840] bg-white dark:bg-[#15251a] text-[#111813] dark:text-white px-4 py-3 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary placeholder-[#61896b]/60 dark:placeholder-[#61896b]"
                      />
                    </div>
                  </>
                )}

                {resetStep === 1 && (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={status === AuthStatus.LOADING || !resetEmail}
                    className={`mt-2 w-full font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${status === AuthStatus.LOADING ? 'opacity-80 cursor-not-allowed' : ''} bg-primary hover:bg-primary-dark text-[#111813]`}
                  >
                    {status === AuthStatus.LOADING ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                )}

                {resetStep === 2 && (
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={status === AuthStatus.LOADING || !resetOtp}
                    className={`mt-2 w-full font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${status === AuthStatus.LOADING ? 'opacity-80 cursor-not-allowed' : ''} bg-primary hover:bg-primary-dark text-[#111813]`}
                  >
                    {status === AuthStatus.LOADING ? 'Verifying...' : 'Verify OTP'}
                  </button>
                )}

                {resetStep === 3 && (
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={status === AuthStatus.LOADING}
                    className={`mt-2 w-full font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ${status === AuthStatus.LOADING ? 'opacity-80 cursor-not-allowed' : ''} bg-primary hover:bg-primary-dark text-[#111813]`}
                  >
                    {status === AuthStatus.LOADING ? 'Updating...' : 'Change Password'}
                  </button>
                )}
              </>
            ) : (
              <>
            {/* Name Field (Register Only) */}
            {mode === 'REGISTER' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[#111813] dark:text-[#e0e7e1] text-sm font-semibold" htmlFor="name">Full Name</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#61896b] flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </span>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={mode === 'REGISTER'}
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input w-full rounded-lg border border-[#dbe6de] dark:border-[#3a5840] bg-white dark:bg-[#15251a] text-[#111813] dark:text-white pl-11 pr-4 py-3 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary placeholder-[#61896b]/60 dark:placeholder-[#61896b]"
                  />
                </div>
              </div>
            )}

            {/* Role Selection (Register Only) */}
            {mode === 'REGISTER' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[#111813] dark:text-[#e0e7e1] text-sm font-semibold">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('user')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${role === 'user' ? 'bg-primary/10 border-primary text-primary-dark dark:text-primary font-bold' : 'bg-white dark:bg-[#15251a] border-[#dbe6de] dark:border-[#3a5840] text-[#61896b]'}`}
                  >
                    <span className="material-symbols-outlined text-lg">person</span>
                    User
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${role === 'admin' ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 font-bold' : 'bg-white dark:bg-[#15251a] border-[#dbe6de] dark:border-[#3a5840] text-[#61896b]'}`}
                  >
                    <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('internal_staff')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-lg border transition-all ${role === 'internal_staff' ? 'bg-teal-500/10 border-teal-500 text-teal-700 dark:text-teal-300 font-bold' : 'bg-white dark:bg-[#15251a] border-[#dbe6de] dark:border-[#3a5840] text-[#61896b]'}`}
                  >
                    <span className="material-symbols-outlined text-lg">badge</span>
                    Staff
                  </button>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[#111813] dark:text-[#e0e7e1] text-sm font-semibold" htmlFor="email">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#61896b] flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input w-full rounded-lg border border-[#dbe6de] dark:border-[#3a5840] bg-white dark:bg-[#15251a] text-[#111813] dark:text-white pl-11 pr-4 py-3 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary placeholder-[#61896b]/60 dark:placeholder-[#61896b]"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[#111813] dark:text-[#e0e7e1] text-sm font-semibold" htmlFor="password">Password</label>
                {mode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('FORGOT')}
                    className="text-[#61896b] hover:text-primary dark:text-[#a0cfa5] dark:hover:text-primary text-xs font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#61896b] flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input w-full rounded-lg border border-[#dbe6de] dark:border-[#3a5840] bg-white dark:bg-[#15251a] text-[#111813] dark:text-white pl-11 pr-12 py-3 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary placeholder-[#61896b]/60 dark:placeholder-[#61896b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#61896b] hover:text-[#111813] dark:hover:text-white transition-colors flex items-center cursor-pointer focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm Password (Register Only) */}
            {mode === 'REGISTER' && (
              <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[#111813] dark:text-[#e0e7e1] text-sm font-semibold" htmlFor="confirmPassword">Confirm Password</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#61896b] flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                  </span>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    required={mode === 'REGISTER'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input w-full rounded-lg border border-[#dbe6de] dark:border-[#3a5840] bg-white dark:bg-[#15251a] text-[#111813] dark:text-white pl-11 pr-12 py-3 focus:border-primary focus:ring-primary dark:focus:border-primary dark:focus:ring-primary placeholder-[#61896b]/60 dark:placeholder-[#61896b]"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status === AuthStatus.LOADING}
              className={`mt-2 w-full font-bold py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group ${
                status === AuthStatus.LOADING ? 'opacity-80 cursor-not-allowed' : ''
              } ${
                mode === 'REGISTER' && role === 'admin'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : mode === 'REGISTER' && role === 'internal_staff'
                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                    : 'bg-primary hover:bg-primary-dark text-[#111813]'
              }`}
            >
              {status === AuthStatus.LOADING ? (
                 <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>
                  <span>{mode === 'LOGIN' ? 'Sign In' : (role === 'admin' ? 'Create Admin Account' : role === 'internal_staff' ? 'Create Staff Account' : 'Create User Account')}</span>
                  <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </>
              )}
            </button>
              </>
            )}
          </form>

          {/* Footer / Secondary Actions */}
          <div className="pt-2 flex flex-col items-center gap-4 border-t border-[#f0f4f1] dark:border-[#2a4531]">
            <p className="text-sm text-[#61896b] dark:text-[#8ab895]">
              {mode === 'LOGIN' ? "Don't have an account?" : mode === 'REGISTER' ? "Already have an account?" : "Back to login?"}{" "}
              <button 
                onClick={() => handleModeSwitch(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                className="text-[#111813] dark:text-white font-semibold hover:text-primary dark:hover:text-primary hover:underline transition-colors focus:outline-none"
              >
                {mode === 'LOGIN' ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
