import { ElectronAPI } from '@electron-toolkit/preload'
import type { AsthenoApi } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: AsthenoApi
  }
}
