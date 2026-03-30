const fs = require('fs');
const path = require('path');

const files = [
  'src/types.ts',
  'src/lib/storage.ts',
  'src/firebase.ts',
  'src/App.tsx'
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  const regex = /<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n[\s\S]*?>>>>>>> origin\/main\r?\n?/g;
  
  const initialLength = content.length;
  content = content.replace(regex, '$1');
  
  if (content.length !== initialLength) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed conflicts in:', file);
  } else {
    console.log('No conflicts found or regex failed in:', file);
  }
}
