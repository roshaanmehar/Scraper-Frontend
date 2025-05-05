"use client"

import { create } from "zustand"

interface LogStore {
  logs: string[]
  addLog: (log: string) => void
  clearLogs: () => void
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  addLog: (log: string) => set((state) => ({ logs: [...state.logs, log] })),
  clearLogs: () => set({ logs: [] }),
}))
