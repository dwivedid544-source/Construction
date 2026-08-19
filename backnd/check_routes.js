const fs = require('fs');
const path = require('path');
const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
const errors = [];
for (const f of files) {
  try {
    require(path.join(routesDir, f));
  } catch(e) {
    errors.push(f + ': ' + e.message.split('\n')[0]);
  }
}
if (errors.length) console.log(errors.join('\n'));
else console.log('All route files loaded OK');
