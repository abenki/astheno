import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { createServer } from 'http'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null

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
    backgroundColor: '#ffffff',
    ...(process.platform === 'linux' ? {} : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

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
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
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
  electronApp.setAppUserModelId('com.astheno.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

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
