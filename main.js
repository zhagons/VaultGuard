const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const xlsx = require('xlsx');

const user_path = app.getPath('home'); // 自动获取 Win 或 Mac 的用户目录
const userDataPath = app.getPath('userData');
console.log(user_path)
console.log(userDataPath)
const device_id = crypto.randomUUID(); // 用于生成唯一ID

// 获取配置文件地址
let appidFileExt = '.gvappid';
if (!app.isPackaged) {
  appidFileExt = '.dgvappid';
}
let appid_path = path.join(user_path, appidFileExt);
// 判断文件是否存在，不存在就先创建，并写入设备ID
if (!fs.existsSync(appid_path)) {
  fs.writeFileSync(appid_path, device_id, 'utf8');
}
//获取当前应用唯一标识
let appid = fs.readFileSync(appid_path, 'utf8');

// 密码文件
let password_file = 'passwords.json';
if (!app.isPackaged) {
  password_file = 'devpasswords.json';
}

const DATA_FILE = path.join(userDataPath, password_file);

const SALT = appid;//'mysalt_for_kdf'; // 实际用建议随机存储盐，否则每次都一致
const ALGORITHM = 'aes-256-cbc';

function getKeyFromPassword(password, salt = SALT) {
  return crypto.scryptSync(password, salt, 32);
}

function encrypt(data, password) {
  const key = getKeyFromPassword(password);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    data: encrypted.toString('hex')
  };
}

function decrypt(encrypted, password) {
  const key = getKeyFromPassword(password);
  const iv = Buffer.from(encrypted.iv, 'hex');
  const data = Buffer.from(encrypted.data, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

function loadPasswords(key) {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const encryptedContentStr = fs.readFileSync(DATA_FILE, 'utf8');
      if (!encryptedContentStr) return [];
      const encryptedContent = JSON.parse(encryptedContentStr);
      const jsonStr = decrypt(encryptedContent, key);
      return JSON.parse(jsonStr);
    } catch (err) {
      console.error('加载或解密失败:', err);
      return null;
    }
  }
  return [];
}

function savePasswords(data, key) {
  try {
    const jsonStr = JSON.stringify(data);
    const encrypted = encrypt(jsonStr, key);
    fs.writeFileSync(DATA_FILE, JSON.stringify(encrypted), 'utf8');
    return true;
  } catch (err) {
    console.error('保存密码失败:', err);
    return false;
  }
}

let mainWindow;
let currentKey = null; // 由验证成功的密码派生

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  // mainWindow.loadFile('index.html');
  mainWindow.loadFile('home.html');
}

app.whenReady().then(createWindow);

//////////////// ipcMain handlers ////////////////

// 检查是否已初始化
ipcMain.handle('is-initialized', () => {
  return fs.existsSync(DATA_FILE);
});

// 初始化主密码
ipcMain.handle('initialize', async (event, password) => {
  try {
    // 初始化存储文件
    if (!fs.existsSync(DATA_FILE)) {
      const result = savePasswords([], getKeyFromPassword(password));
      if (!result) {
        return { success: false, message: '初始化密码存储失败' };
      }
    }
    currentKey = getKeyFromPassword(password);
    return { success: true, message: '初始化成功' };
  } catch (err) {
    console.error('初始化主密码失败:', err);
    return { success: false, message: '初始化失败' };
  }
});

// 登录验证
ipcMain.handle('login', async (event, password) => {
  const key = getKeyFromPassword(password);
  try {
    const data = loadPasswords(key);
    if (data === null) {
      // 无法解密或密码错误
      return { success: false, message: '密码错误' };
    }
    currentKey = key; //成功，更新当前密钥
    return { success: true, message: '登录成功' };
  } catch (err) {
    console.error('登录验证失败:', err);
    // 如果文件不存在，说明还未设置密码
    if (!fs.existsSync(DATA_FILE)) {
      return { success: false, message: '尚未设置密码' };
    }
    return { success: false, message: '验证失败' };
  }
});

// 获取密码列表
ipcMain.handle('get-passwords', () => {
  if (!currentKey) {
    return { success: false, message: '未验证身份' };
  }
  try {
    const list = loadPasswords(currentKey);
    // 为每个密码项添加ID
    const passwordsWithId = (list || []).map((item, index) => {
      return {
        ...item,
        id: index.toString()
      };
    });
    return passwordsWithId;
  } catch (err) {
    console.error('加载密码列表失败:', err);
    return [];
  }
});

// 获取单个密码
ipcMain.handle('get-password', (event, id) => {
  if (!currentKey) {
    return { success: false, message: '未验证身份' };
  }
  try {
    const list = loadPasswords(currentKey) || [];
    const index = parseInt(id);
    if (index >= 0 && index < list.length) {
      console.log('获取密码-----get-password:', list[index]);
      return list[index];
    } else {
      return { success: false, message: '密码不存在' };
    }
  } catch (err) {
    console.error('获取密码失败:', err);
    return { success: false, message: '获取密码失败' };
  }
});

// 添加密码
ipcMain.handle('add-password', (event, item) => {
  if (!currentKey) {
    return { success: false, message: '未验证身份' };
  }
  try {
    const list = loadPasswords(currentKey) || [];
    list.push(item);
    const result = savePasswords(list, currentKey);
    return result ? { success: true } : { success: false, message: '保存失败' };
  } catch (err) {
    console.error('添加密码失败:', err);
    return { success: false, message: '添加失败' };
  }
});

// 更新密码
ipcMain.handle('update-password', (event, id, item) => {
  if (!currentKey) {
    return { success: false, message: '未验证身份' };
  }
  try {
    const list = loadPasswords(currentKey) || [];
    const index = parseInt(id);
    if (index >= 0 && index < list.length) {
      list[index] = item;
      const result = savePasswords(list, currentKey);
      return result ? { success: true } : { success: false, message: '保存失败' };
    } else {
      return { success: false, message: '索引无效' };
    }
  } catch (err) {
    console.error('更新密码失败:', err);
    return { success: false, message: '更新失败' };
  }
});

// 删除密码
ipcMain.handle('delete-password', (event, id) => {
  if (!currentKey) {
    return { success: false, message: '未验证身份' };
  }
  try {
    const list = loadPasswords(currentKey) || [];
    const index = parseInt(id);
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      const result = savePasswords(list, currentKey);
      return result ? { success: true } : { success: false, message: '保存失败' };
    } else {
      return { success: false, message: '索引无效' };
    }
  } catch (err) {
    console.error('删除密码失败:', err);
    return { success: false, message: '删除失败' };
  }
});

// 退出登录
ipcMain.handle('logout', () => {
  currentKey = null;
  return { success: true };
});

// 导入密码
ipcMain.handle('import-passwords', async (event, filePath, fileType) => {
  if (!currentKey) {
    return { success: false, message: '未验证身份' };
  }

  try {
    let importedPasswords = [];

    if (fileType === 'excel') {
      // 处理Excel文件
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      // 转换Excel数据为密码对象
      importedPasswords = jsonData.map(row => {
        return {
          website: row.website || row.Website || row.网站 || '',
          username: row.username || row.Username || row.用户名 || row.账号 || '',
          password: row.password || row.Password || row.密码 || '',
          notes: row.notes || row.Notes || row.备注 || ''
        };
      });
    } else if (fileType === 'text') {
      // 处理文本文件 (CSV格式)
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lines = fileContent.split('\n').filter(line => line.trim() !== '');

      if (lines.length > 0) {
        // 解析标题行
        const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

        // 解析数据行
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(value => value.trim());
          const passwordObj = {};

          headers.forEach((header, index) => {
            const value = values[index] || '';
            switch (header) {
              case 'website':
              case '网站':
                passwordObj.website = value;
                break;
              case 'username':
              case '用户名':
              case '账号':
                passwordObj.username = value;
                break;
              case 'password':
              case '密码':
                passwordObj.password = value;
                break;
              case 'notes':
              case '备注':
                passwordObj.notes = value;
                break;
              default:
                passwordObj[header] = value;
            }
          });

          // 确保必要的字段存在
          if (!passwordObj.website) passwordObj.website = '';
          if (!passwordObj.username) passwordObj.username = '';
          if (!passwordObj.password) passwordObj.password = '';
          if (!passwordObj.notes) passwordObj.notes = '';

          importedPasswords.push(passwordObj);
        }
      }
    }

    // 加载现有密码
    const existingPasswords = loadPasswords(currentKey) || [];

    // 合并密码（避免重复）
    const mergedPasswords = [...existingPasswords];
    const existingKeys = existingPasswords.map(p => `${p.website}|${p.username}`);

    importedPasswords.forEach(importedPassword => {
      const key = `${importedPassword.website}|${importedPassword.username}`;
      if (!existingKeys.includes(key)) {
        mergedPasswords.push(importedPassword);
      }
    });

    // 保存合并后的密码
    const result = savePasswords(mergedPasswords, currentKey);
    if (result) {
      return {
        success: true,
        message: `成功导入 ${importedPasswords.length} 条密码记录`,
        importedCount: importedPasswords.length
      };
    } else {
      return { success: false, message: '保存导入的密码失败' };
    }
  } catch (err) {
    console.error('导入密码失败:', err);
    return { success: false, message: `导入失败: ${err.message}` };
  }
});

// 选择文件对话框
ipcMain.handle('select-file', async (event, filters) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters
  });

  if (result.canceled) {
    return { success: false, message: '用户取消选择' };
  }

  return { success: true, filePath: result.filePaths[0] };
});

// 保存文件对话框
ipcMain.handle('save-file', async (event, filters) => {
  const result = await dialog.showSaveDialog({
    filters: filters
  });

  if (result.canceled) {
    return { success: false, message: '用户取消保存' };
  }

  return { success: true, filePath: result.filePath };
});

// 导出密码
ipcMain.handle('export-passwords', async (event, filePath, fileType) => {
  if (!currentKey) {
    return { success: false, message: '未验证身份' };
  }

  try {
    // 获取所有密码
    const passwords = loadPasswords(currentKey) || [];

    if (fileType === 'excel') {
      // 创建工作簿
      const workbook = xlsx.utils.book_new();

      // 转换数据格式
      const worksheetData = passwords.map(password => ({
        website: password.website || '',
        username: password.username || '',
        password: password.password || '',
        notes: password.notes || ''
      }));

      // 创建工作表
      const worksheet = xlsx.utils.json_to_sheet(worksheetData);

      // 将工作表添加到工作簿
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Passwords');

      // 写入文件
      xlsx.writeFile(workbook, filePath);
    } else if (fileType === 'text') {
      // 创建CSV内容
      let csvContent = 'website,username,password,notes\n';

      passwords.forEach(password => {
        // 转义包含逗号或引号的字段
        const escapeField = (field) => {
          if (field.includes(',') || field.includes('"')) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        };

        csvContent += `${escapeField(password.website || '')},${escapeField(password.username || '')},${escapeField(password.password || '')},${escapeField(password.notes || '')}\n`;
      });

      // 写入文件（使用UTF-8编码）
      fs.writeFileSync(filePath, '\uFEFF' + csvContent, 'utf8');
    }

    return { success: true, message: `成功导出 ${passwords.length} 条密码记录` };
  } catch (err) {
    console.error('导出密码失败:', err);
    return { success: false, message: `导出失败: ${err.message}` };
  }
});

// 清空密码库
ipcMain.handle('clear-passwords', () => {
  if (!currentKey) {
    return { success: false, message: '未验证身份' };
  }
  try {
    const result = savePasswords([], currentKey);
    return result ? { success: true, message: '密码库已清空' } : { success: false, message: '清空失败' };
  } catch (err) {
    console.error('清空密码库失败:', err);
    return { success: false, message: '清空密码库失败' };
  }
});