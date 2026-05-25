const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class JsonStore {
  constructor(filename) {
    this.filePath = path.join(dataDir, filename);
    this.data = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
      }
    } catch (e) {
      this.data = {};
    }
  }

  save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  get(key, defaultValue = undefined) {
    return this.data[key] !== undefined ? this.data[key] : defaultValue;
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  getAll() {
    return { ...this.data };
  }

  update(updates) {
    Object.assign(this.data, updates);
    this.save();
  }
}

// Singleton stores
const configStore = new JsonStore('config.json');
const workflowStore = new JsonStore('workflow.json');
const historyStore = new JsonStore('history.json');

module.exports = { JsonStore, configStore, workflowStore, historyStore };
