import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { createServer } from 'http'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  createChat,
  promptChat,
  abortChat,
  subscribeChat,
  listChats,
  openChat,
  listModels,
  setChatModel,
  renameChat,
  generateChatTitle,
  getProviderStatus,
  setProviderApiKey,
  clearProviderApiKey
} from './agent/runtime'
import type { ChatStreamEvent } from '../preload'

let mainWindow: BrowserWindow | null = null
// Chats we've already subscribed to in this process — avoids double
// subscription if the renderer re-opens a chat that's already live.
const subscribedChats = new Set<string>()

// Dev convenience only — the Settings screen (gear icon) is the real,
// persisted way to set a provider key; a stored credential wins over this
// env var anyway. Lets a fresh clone's dev loop skip opening the app once
// just to paste a key in.
function loadDevEnv(): void {
  if (!is.dev) return
  try {
    process.loadEnvFile(join(app.getAppPath(), '.env.local'))
  } catch {
    // no .env.local yet — provider calls will fail with a clear error until one exists
  }
}

function ensureSubscribed(chatId: string): void {
  if (subscribedChats.has(chatId)) return
  subscribedChats.add(chatId)
  subscribeChat(chatId, (event: ChatStreamEvent) => {
    mainWindow?.webContents.send('astheno:chat:event', event)
  })
}

function handle<Args extends unknown[], Result>(
  channel: string,
  fn: (...args: Args) => Promise<Result>
): void {
  ipcMain.handle(channel, async (_event, ...args: Args) => {
    try {
      return await fn(...args)
    } catch (err) {
      console.error(`[ipc:${channel}]`, err)
      throw err
    }
  })
}

function registerChatIpc(): void {
  handle('astheno:chat:list', async () => listChats())

  handle('astheno:chat:open', async (chatId: string) => {
    const result = await openChat(chatId)
    ensureSubscribed(chatId)
    return result
  })

  handle('astheno:chat:create', async (modelId?: string) => {
    const { chatId, modelId: resolvedModelId } = await createChat(modelId)
    ensureSubscribed(chatId)
    return { chatId, modelId: resolvedModelId }
  })

  handle('astheno:chat:prompt', async (chatId: string, text: string) => {
    await promptChat(chatId, text)
  })

  handle('astheno:chat:abort', async (chatId: string) => {
    await abortChat(chatId)
  })

  handle('astheno:chat:listModels', async () => listModels())

  handle('astheno:chat:setModel', async (chatId: string, modelId: string) => {
    await setChatModel(chatId, modelId)
  })

  handle('astheno:chat:rename', async (chatId: string, title: string) => {
    await renameChat(chatId, title)
  })

  handle('astheno:chat:generateTitle', async (chatId: string, firstMessage: string) => {
    const title = await generateChatTitle(chatId, firstMessage)
    return { title }
  })
}

function registerSettingsIpc(): void {
  handle('astheno:settings:getProviderStatus', async () => getProviderStatus())

  handle('astheno:settings:setApiKey', async (providerId: string, apiKey: string) => {
    await setProviderApiKey(providerId, apiKey)
  })

  handle('astheno:settings:clearApiKey', async (providerId: string) => {
    await clearProviderApiKey(providerId)
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 832,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 19 },
    backgroundColor: '#f5f5f5',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  if (is.dev) {
    mainWindow.webContents.on('console-message', (_e, level, message, line, sourceId) => {
      console.log('[renderer]', level, message, `${sourceId}:${line}`)
    })
  }

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Dev-only inspection server so an agent (or `curl`) can screenshot/click the
// already-running dev window instead of launching a separate instance.
// Loopback-only, never started outside `is.dev`, so it never ships.
function startDevInspectionServer(): void {
  const server = createServer(async (req, res) => {
    try {
      if (!mainWindow) throw new Error('no window')
      const url = new URL(req.url ?? '/', 'http://localhost')

      if (url.pathname === '/screenshot') {
        const image = await mainWindow.webContents.capturePage()
        res.writeHead(200, { 'Content-Type': 'image/png' })
        res.end(image.toPNG())
        return
      }

      if (url.pathname === '/click') {
        const text = url.searchParams.get('text') ?? ''
        const result = await mainWindow.webContents.executeJavaScript(`
          (() => {
            const els = [...document.querySelectorAll('button, [role="tab"], a')];
            const el = els.find(e => e.textContent?.includes(${JSON.stringify(text)}) || e.getAttribute('aria-label')?.includes(${JSON.stringify(text)}));
            if (!el) return 'NOT_FOUND';
            el.click();
            return 'OK';
          })()
        `)
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end(String(result))
        return
      }

      if (url.pathname === '/type') {
        const text = url.searchParams.get('text') ?? ''
        const selector = url.searchParams.get('selector') ?? 'textarea'
        await mainWindow.webContents.executeJavaScript(`
          (() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return 'NOT_FOUND';
            const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
            setter.call(el, ${JSON.stringify(text)});
            el.dispatchEvent(new Event('input', { bubbles: true }));
            return 'OK';
          })()
        `)
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
        return
      }

      if (url.pathname === '/key') {
        const key = url.searchParams.get('name') ?? 'Enter'
        const selector = url.searchParams.get('selector') ?? 'textarea'
        await mainWindow.webContents.executeJavaScript(`
          (() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return 'NOT_FOUND';
            el.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true, cancelable: true }));
            return 'OK';
          })()
        `)
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
        return
      }

      res.writeHead(404)
      res.end('not found')
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(String(err))
    }
  })

  server.on('error', (err) => {
    // Most likely EADDRINUSE from a previous dev session's server still
    // shutting down — harmless, this is a dev convenience only.
    console.warn('[dev-inspection] server error:', err.message)
  })

  server.listen(47823, '127.0.0.1')
}

app.whenReady().then(() => {
  loadDevEnv()
  electronApp.setAppUserModelId('com.astheno.app')

  // Packaged builds get the icon from the app bundle (build/icon.icns) automatically —
  // this is only needed because `npm run dev`/`start` launch the bare Electron binary,
  // which shows Electron's own dock icon otherwise.
  if (is.dev && process.platform === 'darwin') {
    app.dock?.setIcon(icon)
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  registerChatIpc()
  registerSettingsIpc()

  if (is.dev) {
    startDevInspectionServer()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
