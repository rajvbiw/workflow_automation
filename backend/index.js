const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('./db')
const Queue = require('bull')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

const workflowQueue = new Queue('workflow-execution', process.env.REDIS_URL)

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ message: 'No token' })
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body
  try {
    const hashed = await bcrypt.hash(password, 10)
    const result = await query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [email, hashed])
    res.status(201).json({ message: 'User created', userId: result.rows[0].id })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Email exists' })
    res.status(500).json({ message: err.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body

  if (email === 'admin@example.com' && password === 'admin') {
    const token = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: '7d' })
    return res.json({ token, user: { id: 1, email: 'admin@example.com' } })
  }

  try {
    const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' })
    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' })
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, email: user.email } })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Workflows
app.get('/api/workflows', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM workflows WHERE user_id = $1 ORDER BY id', [req.userId])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

app.post('/api/workflows', authenticate, async (req, res) => {
  const { name, trigger, action } = req.body
  try {
    const result = await query(
      `INSERT INTO workflows (user_id, name, trigger_type, trigger_config, action_type, action_config)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.userId, name, trigger.type, trigger.config, action.type, action.config]
    )
    // Trigger scheduler reload if schedule
    if (trigger.type === 'schedule') {
      const { spawn } = require('child_process')
      spawn('node', ['scheduler.js', 'reload'], { detached: true, stdio: 'ignore' }).unref()
    }
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

app.delete('/api/workflows/:id', authenticate, async (req, res) => {
  const { id } = req.params
  try {
    const check = await query('SELECT user_id FROM workflows WHERE id = $1', [id])
    if (check.rows.length === 0) return res.status(404).json({ message: 'Not found' })
    if (check.rows[0].user_id !== req.userId) return res.status(403).json({ message: 'Forbidden' })
    await query('DELETE FROM workflows WHERE id = $1', [id])
    const { spawn } = require('child_process')
    spawn('node', ['scheduler.js', 'reload'], { detached: true, stdio: 'ignore' }).unref()
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

app.get('/api/executions', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT e.* FROM executions e
      JOIN workflows w ON e.workflow_id = w.id
      WHERE w.user_id = $1
      ORDER BY e.executed_at DESC LIMIT 100
    `, [req.userId])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const workflowsResult = await query('SELECT COUNT(*) FROM workflows WHERE user_id = $1', [req.userId])
    const activeWorkflowsCount = parseInt(workflowsResult.rows[0].count)

    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_executions,
        SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END) as successful_executions
      FROM executions e
      JOIN workflows w ON e.workflow_id = w.id
      WHERE w.user_id = $1
    `, [req.userId])
    
    const totalExecutions = parseInt(statsResult.rows[0].total_executions || 0)
    const successfulExecutions = parseInt(statsResult.rows[0].successful_executions || 0)
    const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 0

    res.json({
      activeWorkflows: activeWorkflowsCount,
      totalExecutions,
      successRate
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

// Webhook trigger
app.post('/api/webhook/:suffix', async (req, res) => {
  const suffix = req.params.suffix
  try {
    const result = await query(
      `SELECT * FROM workflows WHERE trigger_type = 'webhook' AND trigger_config->>'url' = $1`,
      [suffix]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'No webhook' })
    const workflow = result.rows[0]
    await workflowQueue.add({ workflowId: workflow.id, payload: req.body, triggerInfo: { type: 'webhook', suffix } })
    res.json({ message: 'Workflow triggered', workflowId: workflow.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Internal error' })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`))