import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { SettingsProvider } from './state/SettingsContext.jsx'
import { ToastProvider } from './state/ToastContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <SettingsProvider>
          <App />
        </SettingsProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>,
)
