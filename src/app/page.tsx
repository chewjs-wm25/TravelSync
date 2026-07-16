'use client';

import { useState } from 'react';

const destinations = [
  {
    id: 1,
    name: '东京',
    country: '日本',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop',
    tag: '热门',
  },
  {
    id: 2,
    name: '巴黎',
    country: '法国',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&h=400&fit=crop',
    tag: '浪漫',
  },
  {
    id: 3,
    name: '冰岛',
    country: '冰岛',
    image: 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=600&h=400&fit=crop',
    tag: '自然',
  },
  {
    id: 4,
    name: '曼谷',
    country: '泰国',
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&h=400&fit=crop',
    tag: '美食',
  },
  {
    id: 5,
    name: '巴厘岛',
    country: '印度尼西亚',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop',
    tag: '度假',
  },
  {
    id: 6,
    name: '瑞士',
    country: '瑞士',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?w=600&h=400&fit=crop',
    tag: '风光',
  },
];

const features = [
  {
    icon: '📋',
    title: '智能行程规划',
    desc: 'AI 自动为你安排最优路线和时间',
  },
  {
    icon: '👥',
    title: '多人实时协作',
    desc: '和旅伴一起编辑行程，同步更新',
  },
  {
    icon: '💰',
    title: '费用自动分摊',
    desc: '旅行结束后一键生成账单，轻松结算',
  },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">TravelSync</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
            <a href="#destinations" className="hover:text-foreground transition-colors">目的地</a>
            <a href="#features" className="hover:text-foreground transition-colors">功能</a>
            <a href="#" className="hover:text-foreground transition-colors">我的行程</a>
          </div>
          <button className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary-dark transition-colors">
            开始规划
          </button>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            让旅行规划
            <br />
            <span className="text-primary">更简单</span>
          </h1>
          <p className="text-lg text-muted max-w-xl mx-auto mb-10">
            TravelSync 帮你和旅伴一起规划行程、分摊费用、分享回忆
          </p>
          <div className="flex items-center max-w-md mx-auto bg-card border border-border rounded-full px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
            <svg className="w-5 h-5 text-muted mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索目的地..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted"
            />
            <button className="ml-2 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-full hover:bg-primary-dark transition-colors">
              搜索
            </button>
          </div>
        </div>
      </section>

      <section id="destinations" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">热门目的地</h2>
            <p className="text-sm text-muted mt-1">探索最受欢迎的旅行地</p>
          </div>
          <a href="#" className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">
            查看全部
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="group bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold text-foreground rounded-full">
                  {dest.tag}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg">{dest.name}</h3>
                <p className="text-sm text-muted">{dest.country}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">为什么选择 TravelSync</h2>
            <p className="text-sm text-muted mt-2">一站式旅行协作平台</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="p-6 bg-background rounded-2xl border border-border hover:border-primary/20 transition-colors"
              >
                <span className="text-3xl">{f.icon}</span>
                <h3 className="font-bold mt-4 mb-2">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-3xl p-10 md:p-16 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">准备好开始了吗？</h2>
          <p className="text-white/80 max-w-md mx-auto mb-8">
            创建你的第一个旅行计划，邀请朋友一起加入
          </p>
          <button className="px-8 py-3 bg-white text-primary font-semibold rounded-full hover:bg-white/90 transition-colors">
            免费开始
          </button>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <span className="font-semibold text-foreground">TravelSync</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">关于我们</a>
            <a href="#" className="hover:text-foreground transition-colors">隐私政策</a>
            <a href="#" className="hover:text-foreground transition-colors">联系我们</a>
          </div>
          <span>&copy; 2026 TravelSync</span>
        </div>
      </footer>
    </main>
  );
}
