import { create } from 'zustand';

// 测试 TypeScript 类型接口
interface TestState {
  count: number;
  increase: () => void;
  decrease: () => void;
}

export const useTestStore = create<TestState>((set) => ({
  count: 0,
  increase: () => set((state) => ({ count: state.count + 1 })),
  decrease: () => set((state) => ({ count: state.count - 1 })),
}));