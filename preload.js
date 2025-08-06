const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 检查是否已初始化
  isInitialized: () => ipcRenderer.invoke('is-initialized'),

  // 初始化主密码
  initialize: (password) => ipcRenderer.invoke('initialize', password),

  // 登录验证
  login: (password) => ipcRenderer.invoke('login', password),

  // 获取密码列表
  getPasswords: () => ipcRenderer.invoke('get-passwords'),

  // 获取单个密码
  getPassword: (id) => ipcRenderer.invoke('get-password', id),

  // 添加密码
  addPassword: (item) => ipcRenderer.invoke('add-password', item),

  // 更新密码
  updatePassword: (id, item) => ipcRenderer.invoke('update-password', id, item),

  // 删除密码
  deletePassword: (id) => ipcRenderer.invoke('delete-password', id),

  // 退出登录
  logout: () => ipcRenderer.invoke('logout'),

  // 导入密码
  importPasswords: (filePath, fileType) => ipcRenderer.invoke('import-passwords', filePath, fileType),

  // 选择文件
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),

  // 保存文件
  saveFile: (filters) => ipcRenderer.invoke('save-file', filters),

  // 导出密码
  exportPasswords: (filePath, fileType) => ipcRenderer.invoke('export-passwords', filePath, fileType),

  // 清空密码库
  clearPasswords: () => ipcRenderer.invoke('clear-passwords'),
});