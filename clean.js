const fs = require('fs');
const files = [
  'src/app/admin/page.tsx',
  'src/app/employer/[id]/page.tsx',
  'src/app/freelancer/[id]/page.tsx',
  'src/app/jobs/page.tsx',
  'src/app/messages/ChatInterface.tsx',
  'src/app/workspace/[id]/page.tsx',
  'src/components/TopMatches.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/> \b/g, '>');
  fs.writeFileSync(f, content);
});