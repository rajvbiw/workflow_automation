import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function Workflows() {
  const navigate = useNavigate()
  const [workflows, setWorkflows] = useState([])
  const [executions, setExecutions] = useState([])
  const [stats, setStats] = useState({ activeWorkflows: 0, totalExecutions: 0, successRate: 0 })
  const [newName, setNewName] = useState('')
  const [triggerType, setTriggerType] = useState('webhook')
  const [triggerConfig, setTriggerConfig] = useState('')
  const [actionType, setActionType] = useState('http')
  const [actionConfig, setActionConfig] = useState('')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchWorkflows()
    fetchExecutions()
    fetchStats()
    const interval = setInterval(() => {
      fetchExecutions()
      fetchStats()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchWorkflows = async () => {
    try {
      const res = await api.get('/workflows')
      setWorkflows(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchExecutions = async () => {
    try {
      const res = await api.get('/executions')
      setExecutions(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats')
      setStats(res.data)
    } catch (err) { console.error(err) }
  }

  const createWorkflow = async (e) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      let trigger = { type: triggerType }
      if (triggerType === 'webhook') trigger.config = { url: triggerConfig }
      if (triggerType === 'schedule') trigger.config = { cron: triggerConfig }

      let action = { type: actionType }
      if (actionType === 'http') action.config = { url: actionConfig }
      if (actionType === 'task') action.config = { title: actionConfig }
      if (actionType === 'email') action.config = { address: actionConfig }

      await api.post('/workflows', { name: newName, trigger, action })
      setNewName('')
      setTriggerConfig('')
      setActionConfig('')
      fetchWorkflows()
    } catch (err) { 
      alert('Failed to create workflow') 
    } finally {
      setIsCreating(false)
    }
  }

  const deleteWorkflow = async (id) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      await api.delete(`/workflows/${id}`)
      fetchWorkflows()
    }
  }

  const runWebhook = async (wf) => {
    try {
      const suffix = wf.trigger_config.url
      await api.post(`/webhook/${suffix}`, { source: 'manual_trigger' })
      alert(`Workflow "${wf.name}" triggered dynamically!`)
      fetchExecutions()
    } catch (err) {
      alert('Failed to trigger workflow dynamically. ' + (err.response?.data?.message || err.message))
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="container animate-fade-in">
      <header className="header-bar">
        <div className="logo-text">
          <span>Nexus</span> Flow
        </div>
        <button onClick={logout} className="danger">Sign Out</button>
      </header>

      <div className="grid grid-cols-3 gap-6" style={{ marginBottom: '2rem' }}>
        <div className="card dashboard-widget">
          <div className="value">{stats.activeWorkflows}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Active Workflows</div>
        </div>
        <div className="card dashboard-widget">
          <div className="value">{stats.totalExecutions}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Total Executions</div>
        </div>
        <div className="card dashboard-widget">
          <div className="value">{stats.successRate}%</div>
          <div style={{ color: 'var(--text-secondary)' }}>Success Rate</div>
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(300px, 350px) 1fr' }}>
        
        {/* Left Column: Create Workflow form */}
        <div>
          <div className="glass-panel" style={{ position: 'sticky', top: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Create Workflow</h3>
            <form onSubmit={createWorkflow} className="flex grid gap-4" style={{ gridTemplateColumns: '1fr' }}>
              <div>
                <label>Workflow Name</label>
                <input 
                  placeholder="e.g., Sync Data" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  required 
                />
              </div>
              
              <div>
                <label>Trigger Source</label>
                <select value={triggerType} onChange={e => setTriggerType(e.target.value)}>
                  <option value="webhook">Webhook Endpoint</option>
                  <option value="schedule">CRON Schedule</option>
                </select>
              </div>

              <div>
                <label>{triggerType === 'webhook' ? 'Endpoint Path' : 'Cron Expression'}</label>
                <input 
                  placeholder={triggerType === 'webhook' ? 'e.g., myservice-hook' : 'e.g., */5 * * * *'} 
                  value={triggerConfig} 
                  onChange={e => setTriggerConfig(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label>Action</label>
                <select value={actionType} onChange={e => setActionType(e.target.value)}>
                  <option value="http">Make HTTP Request</option>
                  <option value="task">Create Internal Task</option>
                  <option value="email">Send Email Notification</option>
                </select>
              </div>

              <div>
                <label>
                  {actionType === 'http' ? 'Target URL' : 
                   actionType === 'task' ? 'Task Title' : 
                   'Recipient Email'}
                </label>
                <input 
                  placeholder={
                    actionType === 'http' ? 'https://api.example.com' : 
                    actionType === 'task' ? 'e.g., Review user registration' : 
                    'hello@example.com'
                  } 
                  value={actionConfig} 
                  onChange={e => setActionConfig(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="primary" style={{ marginTop: '0.5rem' }} disabled={isCreating}>
                {isCreating ? 'Creating...' : '+ Add Workflow'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Workflows Grid and Executions */}
        <div>
          <h3 style={{ marginBottom: '1rem' }}>Your Workflows</h3>
          {workflows.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p>You haven't created any workflows yet. Use the panel on the left to add one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4" style={{ marginBottom: '2rem' }}>
              {workflows.map(wf => (
                <div key={wf.id} className="card flex" style={{ flexDirection: 'column', height: '100%' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {wf.name}
                    </h4>
                    <button className="danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => deleteWorkflow(wf.id)}>
                      X
                    </button>
                  </div>

                  <div className="flex grid gap-2" style={{ gridTemplateColumns: '1fr', flexGrow: 1, marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem' }}>
                      <span className="badge info">Trigger • {wf.trigger_type}</span>
                      <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                        {wf.trigger_type === 'webhook' ? wf.trigger_config.url : wf.trigger_config.cron}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem' }}>
                      <span className="badge">Action • {wf.action_type}</span>
                      <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                        {wf.action_type === 'http' ? wf.action_config.url : 
                         wf.action_type === 'task' ? wf.action_config.title : 
                         wf.action_config.address}
                      </div>
                    </div>
                  </div>

                  {wf.trigger_type === 'webhook' && (
                     <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem' }}>
                        <button className="primary" style={{ width: '100%', padding: '0.5rem' }} onClick={() => runWebhook(wf)}>
                          ▶ Run Now
                        </button>
                     </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Execution History</h3>
            <select style={{ width: 'auto', padding: '0.5rem' }} onChange={e => setSelectedWorkflowId(e.target.value || null)}>
              <option value="">All Workflows</option>
              {workflows.map(wf => <option key={wf.id} value={wf.id}>{wf.name}</option>)}
            </select>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Workflow Name</th>
                  <th>Result Summary</th>
                  <th>Execution Time</th>
                </tr>
              </thead>
              <tbody>
                {executions.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>No executions recorded yet.</span>
                    </td>
                  </tr>
                )}
                {executions.filter(ex => !selectedWorkflowId || ex.workflow_id === parseInt(selectedWorkflowId)).map(ex => {
                  const wf = workflows.find(w => w.id === ex.workflow_id)
                  const isSuccess = ex.status === 'success'
                  return (
                    <tr key={ex.id}>
                      <td>
                        <span className={`badge ${isSuccess ? 'success' : 'error'}`}>
                          {ex.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{wf?.name || `ID: ${ex.workflow_id}`}</td>
                      <td>
                        <pre style={{ margin: 0, padding: '0.5rem', maxHeight: '100px', overflowY: 'auto' }}>
                          {JSON.stringify(ex.result, null, 2)}
                        </pre>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {new Date(ex.executed_at).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Workflows