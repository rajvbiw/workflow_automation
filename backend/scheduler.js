const cron = require('node-cron')
const { query } = require('./db')
const Queue = require('bull')
require('dotenv').config()

const workflowQueue = new Queue('workflow-execution', process.env.REDIS_URL)
let scheduledJobs = new Map()

async function loadSchedules() {
  for (const [id, task] of scheduledJobs.entries()) {
    task.stop()
    scheduledJobs.delete(id)
  }

  const result = await query(`SELECT * FROM workflows WHERE trigger_type = 'schedule'`)
  for (const workflow of result.rows) {
    const cronExpr = workflow.trigger_config.cron
    if (!cronExpr || !cron.validate(cronExpr)) {
      console.error(`Invalid cron for workflow ${workflow.id}: ${cronExpr}`)
      continue
    }
    const task = cron.schedule(cronExpr, async () => {
      console.log(`Cron trigger for workflow ${workflow.id}`)
      await workflowQueue.add({
        workflowId: workflow.id,
        payload: { scheduledAt: new Date().toISOString() },
        triggerInfo: { type: 'schedule', cron: cronExpr }
      })
    })
    scheduledJobs.set(workflow.id, task)
    console.log(`Scheduled workflow ${workflow.id} with cron: ${cronExpr}`)
  }
}

if (process.argv.includes('reload')) {
  loadSchedules().then(() => {
    console.log('Scheduler reloaded')
    process.exit(0)
  })
} else {
  loadSchedules().catch(console.error)
  console.log('Scheduler running')
}