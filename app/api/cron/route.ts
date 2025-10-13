import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: Request) {
  // Verify the cron secret for security
  const authHeader = request.headers.get('Authorization')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Create the directory structure
    await execAsync('mkdir -p .next/server/vendor-chunks/data')
    
    // Copy the Helvetica.afm file
    await execAsync('cp node_modules/pdfkit/js/data/Helvetica.afm .next/server/vendor-chunks/data/')
    
    console.log('[CRON] Successfully copied Helvetica.afm file')
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Helvetica.afm file copied successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[CRON] Failed to copy Helvetica.afm:', error)
    return NextResponse.json({ 
      ok: false, 
      error: 'Failed to copy font file',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
