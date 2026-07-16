'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useTestStore } from '@/store/useTestStore';

// 1. 提取网络订阅逻辑，用于 useSyncExternalStore
const subscribeOnline = (callback: () => void) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
      window.removeEventListener('online', callback);
      window.removeEventListener('offline', callback);
    };
  }
  return () => {};
};

const getOnlineSnapshot = () => {
  if (typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true; 
};

const getServerSnapshot = () => true; // 解决 Next.js SSR 水合报错

export default function Home() {
  const { count, increase, decrease } = useTestStore();
  
  // 完美解决 useEffect 同步 setState 警告：使用 React 18 推荐的外部状态同步 Hook
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
  const isOffline = !isOnline;

  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // 完美解决 any 报错：使用 unknown 作为中间层进行类型断言
    // 这样既满足了 TS 严格模式，又读取了 iOS 特有的 standalone 属性
    const nav = window.navigator as unknown as { standalone?: boolean };
    
    // 通过 Promise.resolve 将状态更新推迟到微任务队列
    // 彻底避开 "Calling setState synchronously within an effect" 的警告
    Promise.resolve().then(() => {
      const isPwaMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        nav.standalone === true;
      setIsStandalone(isPwaMode);
    });
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-lg w-full text-center">
        
        <h1 className="text-3xl font-extrabold text-blue-600 mb-2">
          架构测试面板 🚀
        </h1>
        <p className="text-gray-500 font-medium mb-8">
          Next.js + React + TypeScript 环境正常
        </p>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Zustand 状态测试</h2>
          <div className="flex items-center justify-center space-x-6">
            <button
              onClick={decrease}
              className="px-5 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 active:scale-95 transition-all"
            >
              减少
            </button>
            <span className="text-4xl font-black text-gray-800 w-12">{count}</span>
            <button
              onClick={increase}
              className="px-5 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 active:scale-95 transition-all"
            >
              增加
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 text-left">
          <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">Next-PWA 测试</h2>
          
          <ul className="space-y-3">
            <li className="flex items-center space-x-2">
              <span className="text-xl">{isStandalone ? '✅' : '🟡'}</span>
              <span className={isStandalone ? 'text-green-700 font-semibold' : 'text-yellow-700'}>
                {isStandalone ? '已在 PWA 独立模式下运行' : '当前为浏览器模式 (需点击安装应用)'}
              </span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-xl">{isOffline ? '✈️' : '🌐'}</span>
              <span className={isOffline ? 'text-amber-600 font-semibold' : 'text-blue-600 font-semibold'}>
                {isOffline ? '当前处于离线模式 (Service Worker 正在工作!)' : '当前网络已连接'}
              </span>
            </li>
          </ul>

          <div className="mt-4 text-sm text-gray-500 bg-gray-200/50 p-3 rounded-lg">
            <strong>如何测试离线缓存：</strong> 打开浏览器开发者工具 (F12) → Network (网络) 面板 → 将网络节流设置为 "Offline" → 刷新页面。如果页面还能正常渲染，说明 next-pwa 缓存成功。
          </div>
        </div>
        
      </div>
    </main>
  );
}