const fs = require('fs')
const path = require('path')

try {
  const target = require.resolve('@swc/helpers/esm/index.js', { paths: [process.cwd()] })
  const backup = target + '.bak'
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(target, backup)
    console.log('Backup written to', backup)
  }
  let code = fs.readFileSync(target, 'utf8')

  if (code.includes('applyDecoratedDescriptor')) {
    console.log('applyDecoratedDescriptor already present — nothing to do.')
    process.exit(0)
  }

  // Try common internal helper names
  const knownInternal = [
    '_apply_decorated_descriptor',
    '_apply_decorated_descriptor_default',
    'apply_decorated_descriptor',
  ]

  let internalFound = null
  for (const n of knownInternal) {
    if (code.includes(n)) { internalFound = n; break }
  }

  if (!internalFound) {
    // fallback: search for any exported token containing 'decorated'
    const m = code.match(/export\s*\{([^}]*)\}/m)
    if (m && m[1]) {
      const tokens = m[1].split(',').map(t => t.trim())
      const cand = tokens.find(t => t.includes('decorat'))
      if (cand) internalFound = cand.split(' as ')[0].trim()
    }
  }

  if (!internalFound) {
    console.error('Could not find internal decorated helper name in @swc/helpers ESM bundle.')
    process.exit(2)
  }

  const aliasLine = `\nexport { ${internalFound} as applyDecoratedDescriptor };\n`
  code = code + aliasLine
  fs.writeFileSync(target, code, 'utf8')
  console.log('Patched', target, '-> aliasing', internalFound, 'as applyDecoratedDescriptor')
} catch (err) {
  console.error('Patch failed:', err && err.message ? err.message : err)
  process.exit(1)
}
