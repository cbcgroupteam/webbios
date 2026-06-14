import { WebbiSDK } from '@webbios/sdk';

const resolveApiUrl = () => {
  // 1. Ưu tiên biến môi trường nếu được set cứng (như .env.production vừa tạo)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = window.location.hostname;

  // 2. Môi trường Local
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:8787/v1/admin';
  }

  // 3. Môi trường thực tế (Domain Convention)
  // Khách dùng trial: admin.shop1.webbi.vn -> api.shop1.webbi.vn
  // Khách dùng domain riêng: admin.domain.com -> api.domain.com
  if (hostname.startsWith('admin.')) {
    return `https://${hostname.replace('admin.', 'api.')}/v1/admin`;
  }

  // 4. Môi trường Development trên Cloudflare (Dùng chung cho cả nhánh preview)
  if (hostname.endsWith('.pages.dev')) {
    // Trích xuất shopId từ domain: webbios-dashboard-wbshop9050.pages.dev
    const parts = hostname.split('.');
    // Nếu có dạng hash.webbios-dashboard-xxx.pages.dev thì lấy phần tử [1], nếu không thì [0]
    const projectDomain = parts.length > 3 ? parts[1] : parts[0];
    
    if (projectDomain.startsWith('webbios-dashboard-')) {
      const shopId = projectDomain.replace('webbios-dashboard-', '');
      return `https://webbios-api-${shopId}.chieunt.workers.dev/v1/admin`;
    }
    
    if (projectDomain === 'webbios-dashboard') {
      return 'https://webbios-api.webbios-developers.workers.dev/v1/admin';
    }

    return 'https://webbios-api.webbios-developers.workers.dev/v1/admin';
  }

  // Fallback an toàn nếu không khớp các quy tắc trên
  return 'http://127.0.0.1:8787/v1/admin';
};

export const webbios = new WebbiSDK({
  endpoint: resolveApiUrl()
});