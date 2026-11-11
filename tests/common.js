// Общее для тестов: список сцен и папок
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
function sceneList() {
  const src = fs.readFileSync(path.join(root, 'scenes/list.js'), 'utf8');
  const sandbox = { window: {} };
  new Function('window', src)(sandbox.window);
  return sandbox.window.SCENE_LIST || [];
}
const sceneFolders = () => fs.readdirSync(path.join(root, 'scenes'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
module.exports = { root, sceneList, sceneFolders };
