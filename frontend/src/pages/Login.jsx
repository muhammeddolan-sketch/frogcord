import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Login() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(usernameOrEmail, password);
    if (result.success) navigate('/app');
  };

  return (
    <div className="min-h-screen w-screen bg-[#111214] flex items-center justify-center font-sans p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#23a559] opacity-5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#5865f2] opacity-5 rounded-full blur-[120px]"></div>

      <div className="bg-[#17181a] border border-[#2b2d31] shadow-2xl rounded-xl w-full max-w-md p-8 relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 mb-6 rounded-2xl overflow-hidden bg-[#2b2d31] shadow-inner p-1">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-xl" />
        </div>

        <h1 className="text-2xl font-bold text-gray-100 mb-1">Tekrar Hoş Geldin!</h1>
        <p className="text-[#949ba4] text-sm mb-6 text-center">Seni tekrar görmek ne güzel. Lütfen giriş yap.</p>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">
              E-Posta veya Kullanıcı Adı
            </label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              className="w-full bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 focus:outline-none focus:border-[#5865f2] transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 focus:outline-none focus:border-[#5865f2] transition"
            />
            <a href="#" className="text-[#00a8fc] hover:underline text-xs text-left mt-1">
              Şifreni mi unuttun?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-md mt-2 transition duration-200 shadow-lg text-sm"
          >
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <div className="w-full mt-6 flex items-center text-sm">
          <span className="text-[#949ba4]">Hesabın yok mu?</span>
          <Link to="/register" className="text-[#00a8fc] hover:underline ml-1">Kaydol</Link>
        </div>
      </div>
    </div>
  );
}
