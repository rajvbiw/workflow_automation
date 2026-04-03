const Queue = require('bull')
const axios = require('axios')
const { query } = require('./db')
require('dotenv').config()

const workflowQueue = new Queue('workflow-execution', process.env.REDIS_URL)

async function executeHttpAction(config, payload) {
  const { url } = config
  try {
    const response = await axios.post(url, payload, { timeout: 5000 })
    return { success: true, status: response.status, data: response.data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function executeCreateTaskAction(config, payload) {
  const { title } = config
  const taskId = `task_${Date.now()}`
  console.log(`[Task Action] Created task "${title}" with ID ${taskId}`)
  return { success: true, taskId, title }
}

async function executeEmailAction(config, payload) {
  const { address } = config
  // In a real app, you would use Nodemailer or SendGrid here!
  console.log(`[Email Action] Simulating sending email to ${address}`)
  return { success: true, message: `Email dispatched to ${address}`, timestamp: new Date().toISOString() }
}

workflowQueue.process(async (job) => {
  const { workflowId, payload, triggerInfo } = job.data
  console.log(`Processing workflow ${workflowId} triggered by ${triggerInfo?.type || 'unknown'}`)

  const result = await query('SELECT * FROM workflows WHERE id = $1', [workflowId])
  if (result.rows.length === 0) throw new Error('Workflow not found')
  const workflow = result.rows[0]

  let actionResult, status = 'success'
  try {
    switch (workflow.action_type) {
      case 'http':
        actionResult = await executeHttpAction(workflow.action_config, payload)
        if (!actionResult.success) status = 'failed'
        break
      case 'task':
        actionResult = await executeCreateTaskAction(workflow.action_config, payload)
        break
      case 'email':
        actionResult = await executeEmailAction(workflow.action_config, payload)
        break
      default:
        throw new Error(`Unknown action type: ${workflow.action_type}`)
    }
  } catch (err) {
    status = 'failed'
    actionResult = { error: err.message }
  }

  await query(
    `INSERT INTO executions (workflow_id, status, result) VALUES ($1, $2, $3)`,
    [workflowId, status, JSON.stringify(actionResult)]
  )
  return actionResult
})

console.log('Worker started')