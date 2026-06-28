import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Chart, registerables } from 'chart.js'
import './index.css'
import App from './App.jsx'

Chart.register(...registerables)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
