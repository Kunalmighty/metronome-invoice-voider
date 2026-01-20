import { useState, useEffect } from 'react'

// Determine API base URL
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : ''

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('metronome_api_key') || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [voidingAll, setVoidingAll] = useState(false)
  const [regeneratingAll, setRegeneratingAll] = useState(false)
  const [voidingId, setVoidingId] = useState(null)
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [statusFilter, setStatusFilter] = useState('FINALIZED')
  const [regeneratedResults, setRegeneratedResults] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    nonZero: 0,
    voided: 0,
    regenerated: 0,
    failed: 0,
  })

  // Save API key to localStorage when it changes
  const handleApiKeyChange = (e) => {
    const value = e.target.value
    setApiKey(value)
    localStorage.setItem('metronome_api_key', value)
  }

  // Common headers for all API requests
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(apiKey && { 'X-Metronome-Api-Key': apiKey }),
  })

  const fetchInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/invoices?status=${statusFilter}`, {
        headers: getHeaders(),
      })
      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch invoices')
      }
      
      setInvoices(data.invoices || [])
      const nonZeroCount = (data.invoices || []).filter(inv => (inv.total ?? inv.subtotal ?? 0) !== 0).length
      setStats(prev => ({
        ...prev,
        total: data.count || 0,
        nonZero: nonZeroCount,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const voidInvoice = async (invoiceId) => {
    setVoidingId(invoiceId)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/void`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ invoiceId }),
      })
      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to void invoice')
      }
      
      setSuccess(`Invoice ${invoiceId.slice(0, 8)}... voided successfully`)
      setTimeout(() => setSuccess(null), 3000)
      
      // Refresh the list
      await fetchInvoices()
    } catch (err) {
      setError(err.message)
    } finally {
      setVoidingId(null)
    }
  }

  const regenerateInvoice = async (invoiceId) => {
    setRegeneratingId(invoiceId)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/regenerate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ invoiceId }),
      })
      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to regenerate invoice')
      }
      
      setSuccess(`Invoice ${invoiceId.slice(0, 8)}... regenerated successfully`)
      setStats(prev => ({ ...prev, regenerated: prev.regenerated + 1 }))
      setTimeout(() => setSuccess(null), 3000)
      
      // Refresh the list
      await fetchInvoices()
    } catch (err) {
      setError(err.message)
    } finally {
      setRegeneratingId(null)
    }
  }

  const regenerateAllVoided = async () => {
    if (!confirm('Are you sure you want to regenerate all voided invoices?')) {
      return
    }
    
    setRegeneratingAll(true)
    setError(null)
    setRegeneratedResults(null)
    try {
      const res = await fetch(`${API_BASE}/api/regenerate-all`, {
        method: 'POST',
        headers: getHeaders(),
      })
      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to regenerate invoices')
      }
      
      const regeneratedCount = data.regenerated?.length || 0
      const failedCount = data.failed?.length || 0
      
      // Store the results to display
      setRegeneratedResults({
        regenerated: data.regenerated || [],
        failed: data.failed || [],
      })
      
      setStats(prev => ({
        ...prev,
        regenerated: prev.regenerated + regeneratedCount,
      }))
      
      // Clear the voided invoices list since they're now regenerated
      setInvoices([])
      setStats(prev => ({ ...prev, total: 0, nonZero: 0 }))
      
      if (failedCount > 0) {
        setError(`Regenerated ${regeneratedCount} invoices, but ${failedCount} failed`)
      } else {
        setSuccess(`Successfully regenerated ${regeneratedCount} voided invoices`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setRegeneratingAll(false)
    }
  }

  const clearRegeneratedResults = () => {
    setRegeneratedResults(null)
    setSuccess(null)
  }

  const voidAllNonZero = async () => {
    if (!confirm('Are you sure you want to void all non-zero invoices? This action cannot be undone.')) {
      return
    }
    
    setVoidingAll(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/void-all`, {
        method: 'POST',
        headers: getHeaders(),
      })
      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to void invoices')
      }
      
      setStats(prev => ({
        ...prev,
        voided: data.voided?.length || 0,
        failed: data.failed?.length || 0,
      }))
      
      const voidedCount = data.voided?.length || 0
      const failedCount = data.failed?.length || 0
      
      if (failedCount > 0) {
        setError(`Voided ${voidedCount} invoices, but ${failedCount} failed`)
      } else {
        setSuccess(`Successfully voided ${voidedCount} non-zero invoices`)
        setTimeout(() => setSuccess(null), 5000)
      }
      
      // Clear the current list immediately to reflect changes
      setInvoices([])
      setStats(prev => ({ ...prev, total: 0, nonZero: 0 }))
      
      // Refresh the list to get updated data from server
      await fetchInvoices()
    } catch (err) {
      setError(err.message)
    } finally {
      setVoidingAll(false)
    }
  }

  useEffect(() => {
    if (apiKey) {
      fetchInvoices()
    }
  }, [statusFilter])

  const formatAmount = (invoice) => {
    const amount = invoice.total ?? invoice.subtotal ?? 0
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.credit_type?.name === 'USD' ? 'USD' : 'USD',
    }).format(amount)
  }

  const isNonZero = (invoice) => {
    const amount = invoice.total ?? invoice.subtotal ?? 0
    return amount !== 0
  }

  return (
    <div className="app">
      <header className="header">
        <img src="/gnomeworks.png" alt="Gnomeworks Logo" className="logo" />
        <h1>Metronome Invoice Voider</h1>
        <p>Manage and void finalized invoices in your Metronome account</p>
      </header>

      <div className="api-key-section">
        <label htmlFor="apiKey" className="api-key-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
          Metronome API Key
        </label>
        <div className="api-key-input-wrapper">
          <input
            id="apiKey"
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="Enter your Metronome API key..."
            className="api-key-input"
          />
          <button
            type="button"
            className="api-key-toggle"
            onClick={() => setShowApiKey(!showApiKey)}
            title={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            {showApiKey ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
        {!apiKey && (
          <p className="api-key-hint">Enter your API key to fetch invoices</p>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          {success}
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value total">{stats.total}</div>
          <div className="stat-label">Total Invoices</div>
        </div>
        <div className="stat-card">
          <div className="stat-value non-zero">{stats.nonZero}</div>
          <div className="stat-label">Non-Zero Amount</div>
        </div>
        <div className="stat-card">
          <div className="stat-value voided">{stats.voided}</div>
          <div className="stat-label">Voided This Session</div>
        </div>
        <div className="stat-card">
          <div className="stat-value regenerated">{stats.regenerated}</div>
          <div className="stat-label">Regenerated</div>
        </div>
      </div>

      <div className="actions">
        <button 
          className="btn btn-primary" 
          onClick={fetchInvoices} 
          disabled={loading || !apiKey}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Loading...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Refresh Invoices
            </>
          )}
        </button>
        <button 
          className="btn btn-danger" 
          onClick={voidAllNonZero} 
          disabled={voidingAll || loading || stats.nonZero === 0 || !apiKey}
        >
          {voidingAll ? (
            <>
              <span className="spinner"></span>
              Voiding...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
              Void All Non-Zero Invoices
            </>
          )}
        </button>
        <button 
          className="btn btn-success" 
          onClick={regenerateAllVoided} 
          disabled={regeneratingAll || loading || !apiKey}
        >
          {regeneratingAll ? (
            <>
              <span className="spinner"></span>
              Regenerating...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6"/>
                <path d="M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Regenerate All Voided
            </>
          )}
        </button>
      </div>

      {regeneratedResults && (
        <div className="results-panel">
          <div className="results-header">
            <h2>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              Regeneration Results
            </h2>
            <button className="btn btn-small" onClick={clearRegeneratedResults}>
              Dismiss
            </button>
          </div>
          
          {regeneratedResults.regenerated.length > 0 && (
            <div className="results-section">
              <h3 className="results-section-title success">
                ✓ Successfully Regenerated ({regeneratedResults.regenerated.length})
              </h3>
              <div className="results-list">
                {regeneratedResults.regenerated.map((inv) => (
                  <div key={inv.id} className="result-item success">
                    <span className="result-id">{inv.id.slice(0, 8)}...</span>
                    <span className="result-amount">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(inv.total || 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {regeneratedResults.failed.length > 0 && (
            <div className="results-section">
              <h3 className="results-section-title error">
                ✗ Failed to Regenerate ({regeneratedResults.failed.length})
              </h3>
              <div className="results-list">
                {regeneratedResults.failed.map((inv) => (
                  <div key={inv.id} className="result-item error">
                    <span className="result-id">{inv.id.slice(0, 8)}...</span>
                    <span className="result-error">{inv.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="table-container">
        <div className="table-header">
          <h2>{statusFilter === 'FINALIZED' ? 'Finalized' : 'Voided'} Invoices</h2>
          <div className="table-header-controls">
            <select 
              className="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="FINALIZED">Finalized</option>
              <option value="VOID">Voided</option>
            </select>
            <span>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        {invoices.length === 0 && !loading ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <p>{!apiKey ? 'Enter your API key and click "Refresh Invoices" to get started' : 'No finalized invoices found'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Customer ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <span className="invoice-id">{invoice.id.slice(0, 8)}...</span>
                    </td>
                    <td>
                      <span className="invoice-id">{invoice.customer_id?.slice(0, 8) || 'N/A'}...</span>
                    </td>
                    <td>
                      <span className={`amount ${isNonZero(invoice) ? 'non-zero' : 'zero'}`}>
                        {formatAmount(invoice)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${invoice.status?.toLowerCase() || 'finalized'}`}>
                        {invoice.status || 'FINALIZED'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {invoice.status === 'VOID' ? (
                        <button 
                          className="btn btn-success btn-small"
                          onClick={() => regenerateInvoice(invoice.id)}
                          disabled={regeneratingId === invoice.id}
                        >
                          {regeneratingId === invoice.id ? (
                            <span className="spinner"></span>
                          ) : (
                            'Regenerate'
                          )}
                        </button>
                      ) : isNonZero(invoice) && (
                        <button 
                          className="btn btn-danger btn-small"
                          onClick={() => voidInvoice(invoice.id)}
                          disabled={voidingId === invoice.id}
                        >
                          {voidingId === invoice.id ? (
                            <span className="spinner"></span>
                          ) : (
                            'Void'
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
