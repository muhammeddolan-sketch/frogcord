import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(usernameOrEmail, password);
    if (result.success) {
      navigate('/app');
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center font-sans p-4 relative overflow-hidden bg-[var(--bg-darker)]">
      {/* Animated Mesh Background */}
      <div className="mesh-container">
        <div className="mesh-blob bg-[var(--accent-primary)]/8 top-[-15%] left-[-15%]"></div>
        <div className="mesh-blob bg-[var(--accent-secondary)]/6 bottom-[-15%] right-[-15%]" style={{ animationDelay: '-6s' }}></div>
        <div className="mesh-blob bg-[#22c55e]/4 top-[30%] right-[10%]" style={{ animationDelay: '-12s', width: '500px', height: '500px' }}></div>
      </div>
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02] z-[1]" style={{ backgroundImage: 'radial-gradient(var(--text-secondary) 0.5px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      <div className="premium-glass w-full max-w-[400px] relative z-10 animate-fade-up overflow-hidden">
        {/* Top accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-50" />
        
        <div className="p-10 pt-8 flex flex-col items-center">
          {/* Logo */}
          <div className="w-24 h-24 mb-6 relative group">
            <div className="absolute inset-[-8px] bg-[var(--accent-primary)] opacity-0 blur-2xl group-hover:opacity-25 transition-opacity duration-700"></div>
            <div className="relative w-full h-full bg-[var(--bg-dark)] border border-[var(--border-pixel)] rounded-2xl shadow-lg p-4 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:border-[var(--accent-primary)]/40 group-hover:shadow-[var(--shadow-glow)]">
               <img src="/logo.png" alt="Logo" className="w-full h-full object-contain filter drop-shadow-md logo-img" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-extrabold text-[var(--text-primary)] mb-2 tracking-tight">Tekrar hoş geldin!</h1>
            <p className="text-[var(--text-secondary)] text-[13px] leading-relaxed">
              Seni tekrar görmek güzel!
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="w-full bg-[var(--danger)]/8 border border-[var(--danger)]/20 text-[var(--danger)] px-4 py-3 text-xs mb-5 rounded-md font-medium text-center animate-fade-up">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="w-full flex flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
                E-posta veya kullanıcı adı <span className="text-[var(--danger)]">*</span>
              </label>
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                autoFocus
                className="pixel-input w-full text-sm py-3"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
                  Şifre <span className="text-[var(--danger)]">*</span>
                </label>
                <button type="button" className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] text-[11px] font-semibold transition-colors">
                  Şifremi unuttum
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pixel-input w-full text-sm py-3 pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition text-xs"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="pixel-btn-primary w-full py-3 mt-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold tracking-wide transition-all"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Giriş yapılıyor...
                </span>
              ) : 'Giriş Yap'}
            </button>
          </form>

          {/* Register Link */}
          <div className="w-full mt-6 text-[13px]">
            <span className="text-[var(--text-muted)]">Bir hesabın mı yok? </span>
            <Link to="/register" className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] font-semibold transition-colors hover:underline">
              Kayıt Ol
            </Link>
          </div>
        </div>
      </div>
      
      {/* Version */}
      <div className="absolute bottom-4 right-6 text-[var(--text-muted)] text-[10px] font-medium opacity-30 select-none">
        FrogCord v3.0
      </div>
    </div>
  );
}
