import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('register');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState('');

  const { register, verifyRequest, verifyConfirm, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(email, username, displayName, password);
    if (result.success) {
      navigate('/login');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setVerificationError('');
    const result = await verifyConfirm(email, verificationCode);
    if (result.success) {
      setVerificationSuccess('E-posta doğrulandı! Giriş sayfasına yönlendiriliyorsun...');
      setTimeout(() => navigate('/login'), 2000);
    } else {
      setVerificationError(result.error || 'Geçersiz kod.');
    }
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen w-screen bg-[var(--bg-darker)] flex items-center justify-center font-sans p-4 relative overflow-hidden">
        <div className="mesh-container">
          <div className="mesh-blob bg-[var(--accent-primary)]/6 top-[-15%] right-[-15%]"></div>
        </div>
        <div className="absolute inset-0 opacity-[0.02] z-[1]" style={{ backgroundImage: 'radial-gradient(var(--text-secondary) 0.5px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        
        <div className="premium-glass w-full max-w-[400px] relative z-10 animate-fade-up overflow-hidden">
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-50" />
          <div className="p-10 flex flex-col items-center">
            <div className="w-12 h-12 bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-xl flex items-center justify-center mb-6">
              <span className="text-2xl">📧</span>
            </div>
            <h1 className="text-xl font-extrabold text-[var(--text-primary)] mb-2 tracking-tight text-center">E-postanı doğrula</h1>
            <p className="text-[var(--text-secondary)] text-[13px] text-center mb-8 leading-relaxed">
              <span className="text-[var(--text-primary)] font-medium">{email}</span> adresine bir doğrulama kodu gönderdik.
            </p>

            <form className="w-full flex flex-col gap-5" onSubmit={handleVerify}>
              <div className="relative">
                <input 
                  type="text" 
                  value={verificationCode} 
                  onChange={(e) => setVerificationCode(e.target.value)} 
                  placeholder="000000"
                  required
                  autoFocus
                  maxLength={6}
                  className="pixel-input w-full text-center text-2xl tracking-[0.5em] font-bold py-4" 
                />
              </div>
              
              {verificationError && <p className="text-[var(--danger)] text-xs text-center font-medium">{verificationError}</p>}
              {verificationSuccess && <p className="text-[var(--accent-primary)] text-xs text-center font-medium">{verificationSuccess}</p>}
              
              <button type="submit" disabled={isLoading}
                className="pixel-btn-primary w-full py-3 text-sm font-bold tracking-wide">
                {isLoading ? 'Doğrulanıyor...' : 'Doğrula'}
              </button>
            </form>
            
            <p className="mt-8 text-[11px] text-[var(--text-muted)]">Geliştirici modu: <code className="bg-[var(--bg-light)] px-2 py-0.5 rounded text-[var(--text-secondary)]">123456</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-[var(--bg-darker)] flex items-center justify-center font-sans p-4 relative overflow-hidden">
      <div className="mesh-container">
        <div className="mesh-blob bg-[var(--accent-secondary)]/6 top-[-15%] right-[-15%]"></div>
        <div className="mesh-blob bg-[var(--accent-primary)]/5 bottom-[-15%] left-[-15%]" style={{ animationDelay: '-8s' }}></div>
      </div>
      <div className="absolute inset-0 opacity-[0.02] z-[1]" style={{ backgroundImage: 'radial-gradient(var(--text-secondary) 0.5px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      <div className="premium-glass w-full max-w-[480px] relative z-10 animate-fade-up overflow-hidden">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-50" />
        
        <div className="p-10 pt-8 flex flex-col items-center">
          {/* Logo */}
          <div className="w-16 h-16 mb-6 relative group">
            <div className="absolute inset-[-6px] bg-[var(--accent-primary)] opacity-0 blur-2xl group-hover:opacity-20 transition-opacity duration-700"></div>
            <div className="relative w-full h-full bg-[var(--bg-dark)] border border-[var(--border-pixel)] rounded-xl shadow-lg p-3 flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:scale-105 group-hover:border-[var(--accent-primary)]/40">
               <img src="/logo.png" alt="Logo" className="w-full h-full object-contain logo-img" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-xl font-extrabold text-[var(--text-primary)] mb-2 tracking-tight">Hesap oluştur</h1>
            <p className="text-[var(--text-secondary)] text-[13px]">FrogCord'a katılmak için bilgilerini gir.</p>
          </div>

          {error && (
            <div className="w-full bg-[var(--danger)]/8 border border-[var(--danger)]/20 text-[var(--danger)] px-4 py-3 text-xs mb-5 rounded-md font-medium text-center animate-fade-up">
              {error}
            </div>
          )}

          <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
                E-posta <span className="text-[var(--danger)]">*</span>
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="ornek@email.com"
                className="pixel-input w-full text-sm py-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
                  Kullanıcı adı <span className="text-[var(--danger)]">*</span>
                </label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                  className="pixel-input w-full text-sm py-3" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
                  Görünen ad
                </label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="pixel-input w-full text-sm py-3" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
                Şifre <span className="text-[var(--danger)]">*</span>
              </label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="pixel-input w-full text-sm py-3 pr-10" />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition text-xs"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="pixel-btn-primary w-full py-3 mt-2 text-sm font-bold tracking-wide">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Kayıt yapılıyor...
                </span>
              ) : 'Devam Et'}
            </button>
          </form>

          <div className="w-full mt-5 text-[13px]">
            <span className="text-[var(--text-muted)]">Zaten bir hesabın var mı? </span>
            <Link to="/login" className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] font-semibold transition-colors hover:underline">
              Giriş Yap
            </Link>
          </div>

          <p className="mt-6 text-[10px] text-[var(--text-muted)] text-center leading-relaxed opacity-60">
            Kayıt olarak <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition underline">Hizmet Şartlarını</a> ve <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition underline">Gizlilik Politikasını</a> kabul etmiş olursun.
          </p>
        </div>
      </div>
      
      <div className="absolute bottom-4 right-6 text-[var(--text-muted)] text-[10px] font-medium opacity-30 select-none">
        FrogCord v3.0
      </div>
    </div>
  );
}
