const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const resolveUrl = (url) => {
  if (!url || url === '/logo.png') return '/logo.png';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

export const formatTimeStr = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const time = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return `Bugün ${time}`;
  return `${date.toLocaleDateString('tr-TR')} ${time}`;
};

export const renderInlineMarkdown = (text) => {
  return text; // Placeholder
};

export const renderMarkdown = (text) => {
  return text; // Placeholder
};
