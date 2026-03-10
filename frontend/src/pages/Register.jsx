import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function Register() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(email, username, displayName, password);
    if (result.success) navigate('/login');
  };

  return (
    <div className="min-h-screen w-screen bg-[#111214] flex items-center justify-center font-sans p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#5865f2] opacity-5 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[#23a559] opacity-5 rounded-full blur-[120px]"></div>

      <div className="bg-[#17181a] border border-[#2b2d31] shadow-2xl rounded-xl w-full max-w-md p-8 relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 mb-4 rounded-2xl overflow-hidden bg-[#2b2d31] shadow-inner p-1">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain rounded-xl" />
        </div>

        <h1 className="text-2xl font-bold text-gray-100 mb-5">Hesap Oluştur</h1>

        {error && (
          <div className="w-full bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <form className="w-full flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">E-Posta</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 focus:outline-none focus:border-[#5865f2] transition" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Görünen Ad</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="(İsteğe bağlı)"
              className="w-full bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 placeholder-[#80848e] focus:outline-none focus:border-[#5865f2] transition" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Kullanıcı Adı</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
              className="w-full bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 focus:outline-none focus:border-[#5865f2] transition" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[#b5bac1] text-xs font-bold uppercase tracking-wide">Şifre</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-[#1e1f22] border border-[#111214] rounded-md px-3 py-2.5 text-gray-200 focus:outline-none focus:border-[#5865f2] transition" />
          </div>

          <button type="submit" disabled={isLoading}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-md mt-3 transition duration-200 shadow-lg text-sm">
            {isLoading ? 'Hesap oluşturuluyor...' : 'Devam Et'}
          </button>
        </form>

        <div className="w-full mt-5 flex items-center text-sm">
          <Link to="/login" className="text-[#00a8fc] hover:underline">Zaten bir hesabın var mı?</Link>
        </div>

        <div className="mt-4 text-[11px] text-[#949ba4] text-center px-4 leading-relaxed">
          Kaydolarak <a href="#" className="text-[#00a8fc] hover:underline">Hizmet Şartları</a> ve <a href="#" className="text-[#00a8fc] hover:underline">Gizlilik Politikası</a>'nı kabul etmiş olursun.
        </div>
      </div>
    </div>
  );
}
