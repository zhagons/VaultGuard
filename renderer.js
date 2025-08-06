// DOM元素
    const setupView = document.getElementById('setupView');
    const loginView = document.getElementById('loginView');
    const mainApp = document.getElementById('mainApp');
    const passwordList = document.getElementById('passwordList');

    // 初始化检查
    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const isInitialized = await window.api.isInitialized();
        if (!isInitialized) {
          // 显示设置界面
          setupView.style.display = 'block';
          loginView.style.display = 'none';
          mainApp.style.display = 'none';
        } else {
          // 显示登录界面
          setupView.style.display = 'none';
          loginView.style.display = 'block';
          mainApp.style.display = 'none';
        }
      } catch (error) {
        console.error('初始化检查失败:', error);
        // 默认显示设置界面
        setupView.style.display = 'block';
        loginView.style.display = 'none';
        mainApp.style.display = 'none';
      }
    });

    // 密码强度检查
    document.getElementById('masterPassword').addEventListener('input', function () {
      const password = this.value;
      const strengthBar = document.getElementById('passwordStrengthBar');
      let strength = 0;

      // 长度检查
      if (password.length >= 8) strength += 25;
      if (password.length >= 12) strength += 25;

      // 复杂度检查
      if (/[A-Z]/.test(password)) strength += 10;
      if (/[a-z]/.test(password)) strength += 10;
      if (/[0-9]/.test(password)) strength += 10;
      if (/[^A-Za-z0-9]/.test(password)) strength += 20;

      // 更新强度条
      strengthBar.style.width = `${Math.min(strength, 100)}%`;

      // 更新颜色
      if (strength < 40) {
        strengthBar.style.backgroundColor = 'var(--danger)';
      } else if (strength < 70) {
        strengthBar.style.backgroundColor = 'var(--warning)';
      } else {
        strengthBar.style.backgroundColor = 'var(--success)';
      }
    });

    // 初始化设置
    document.getElementById('setupBtn').addEventListener('click', async () => {
      const password = document.getElementById('masterPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const errorElement = document.getElementById('setupError');

      // 验证
      if (!password || !confirmPassword) {
        errorElement.textContent = '请输入密码和确认密码';
        errorElement.style.display = 'block';
        return;
      }

      if (password !== confirmPassword) {
        errorElement.textContent = '两次输入的密码不一致';
        errorElement.style.display = 'block';
        return;
      }

      if (password.length < 8) {
        errorElement.textContent = '密码长度至少需要8个字符';
        errorElement.style.display = 'block';
        return;
      }

      try {
        const result = await window.api.initialize(password);
        if (result.success) {
          // 初始化成功，切换到登录界面
          setupView.style.display = 'none';
          loginView.style.display = 'block';
        } else {
          errorElement.textContent = result.message || '初始化失败';
          errorElement.style.display = 'block';
        }
      } catch (error) {
        console.error('初始化失败:', error);
        errorElement.textContent = '初始化过程中发生错误';
        errorElement.style.display = 'block';
      }
    });

    // 登录功能
    document.getElementById('loginBtn').addEventListener('click', async () => {
      const password = document.getElementById('loginPassword').value;
      const errorElement = document.getElementById('loginError');

      if (!password) {
        errorElement.textContent = '请输入密码';
        errorElement.style.display = 'block';
        return;
      }

      try {
        const result = await window.api.login(password);
        if (result.success) {
          // 登录成功，显示主界面
          loginView.style.display = 'none';
          mainApp.style.display = 'block';
          loadPasswords();
        } else {
          errorElement.textContent = result.message || '密码错误';
          errorElement.style.display = 'block';
        }
      } catch (error) {
        console.error('登录失败:', error);
        errorElement.textContent = '登录过程中发生错误';
        errorElement.style.display = 'block';
      }
    });
    var loadPasswords;
    // 优化密码列表渲染
    loadPasswords = async function() {
      try {
        const passwords = await window.api.getPasswords();
        const passwordList = document.getElementById('passwordList');
        const searchKeyword = document.getElementById('passwordSearch').value.toLowerCase().trim();
        let filteredPasswords = passwords.sort((a, b) => {
          return b.id - a.id; // 按ID降序排序
        });
        if (searchKeyword) {
          filteredPasswords = passwords.filter(password => {
            return (
              (password.website && password.website.toLowerCase().includes(searchKeyword)) ||
              (password.username && password.username.toLowerCase().includes(searchKeyword)) ||
              (password.notes && password.notes.toLowerCase().includes(searchKeyword))
            );
          });
        }
        if (filteredPasswords.length === 0) {
          if (searchKeyword) {
            // 显示搜索结果为空的状态
            passwordList.innerHTML = `
              <div class="empty-state">
                <div class="empty-state-icon" style="background: var(--warning);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <h3 class="empty-state-title">未找到匹配的密码</h3>
                <p class="empty-state-description">没有找到与"${searchKeyword}"相关的密码记录</p>
                <button id="clearSearchBtn" class="btn btn-primary">
                  清除搜索
                </button>
              </div>
            `;
            
            // 使用事件委托或者先移除再添加事件监听器
            const clearSearchBtn = document.getElementById('clearSearchBtn');
            const clearSearchHandler = () => {
              document.getElementById('passwordSearch').value = '';
              document.getElementById('clearSearch').style.display = 'none';
              loadPasswords();
            };
            
            // 移除已存在的事件监听器（如果有的话）
            if (clearSearchBtn.clearSearchHandler) {
              clearSearchBtn.removeEventListener('click', clearSearchBtn.clearSearchHandler);
            }
            
            // 添加新的事件监听器并保存引用
            clearSearchBtn.addEventListener('click', clearSearchHandler);
            clearSearchBtn.clearSearchHandler = clearSearchHandler;
          } else {
            // 显示空状态
            passwordList.innerHTML = `
              <div class="empty-state">
                <div class="empty-state-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h3 class="empty-state-title">您的保险库是空的</h3>
                <p class="empty-state-description">点击"添加密码"按钮开始存储您的第一条密码记录</p>
                <button id="addFirstPasswordBtn" class="btn btn-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  添加密码
                </button>
              </div>
            `;

            const addFirstPasswordBtn = document.getElementById('addFirstPasswordBtn');
            const addFirstPasswordHandler = () => {
              document.getElementById('addPasswordModal').classList.add('active');
            };
            
            // 移除已存在的事件监听器（如果有的话）
            if (addFirstPasswordBtn.addFirstPasswordHandler) {
              addFirstPasswordBtn.removeEventListener('click', addFirstPasswordBtn.addFirstPasswordHandler);
            }
            
            // 添加新的事件监听器并保存引用
            addFirstPasswordBtn.addEventListener('click', addFirstPasswordHandler);
            addFirstPasswordBtn.addFirstPasswordHandler = addFirstPasswordHandler;
          }
          
          return;
        }

        // 清空列表
        passwordList.innerHTML = '';

        // 添加密码项
        filteredPasswords.forEach((password, index) => {
          const passwordItem = document.createElement('div');
          passwordItem.className = 'password-item fade-in';
          passwordItem.style.animationDelay = `${index * 0.05}s`; // 减少动画延迟，提高响应速度

          passwordItem.innerHTML = `
            <div class="password-item-header">
              <div class="password-item-title">${password.website || '未命名网站'}</div>
              <div class="password-item-actions">
                <button class="card-action-btn edit" onclick="editPassword('${password.id}')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span class="tooltip-text" style="display:none">编辑</span>
                </button>
                <button class="card-action-btn delete" onclick="deletePassword('${password.id}')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  <span class="tooltip-text" style="display:none">删除</span>
                </button>
              </div>
            </div>
            <div class="password-item-body">
              <div class="password-field">
                <span class="password-label">用户名</span>
                <div class="password-value">${password.username || '未提供'}</div>
              </div>
              <div class="password-field">
                <span class="password-label">密码</span>
                <div class="password-value masked" id="password-${password.id}" onclick="togglePasswordVisibility('${password.id}')">
                  <span class="password-value-text" style="word-break:break-all;margin-right:6px">${'•'.repeat(12)}</span>
                  <span><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path><circle cx="12" cy="12" r="3"></circle></svg></span>
                </div>
              </div>
              <div class="password-actions">
                <button class="btn-copy username" onclick="copyToClipboard('${password.id}', 'username')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  复制用户名
                </button>
                <button class="btn-copy password" onclick="copyToClipboard('${password.id}', 'password')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  复制密码
                </button>
              </div>
            </div>
          `;

          passwordList.appendChild(passwordItem);
        });
      } catch (error) {
        console.error('加载密码失败:', error);
        passwordList.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon" style="background: var(--danger);">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h3 class="empty-state-title">加载失败</h3>
            <p class="empty-state-description">加载密码时发生错误，请检查您的网络连接或重新登录</p>
            <button id="reloadPasswordsBtn" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
              </svg>
              重新加载
            </button>
          </div>
        `;
        
        const reloadPasswordsBtn = document.getElementById('reloadPasswordsBtn');
        const reloadPasswordsHandler = () => {
          loadPasswords();
        };
        
        // 移除已存在的事件监听器（如果有的话）
        if (reloadPasswordsBtn.reloadPasswordsHandler) {
          reloadPasswordsBtn.removeEventListener('click', reloadPasswordsBtn.reloadPasswordsHandler);
        }
        
        // 添加新的事件监听器并保存引用
        reloadPasswordsBtn.addEventListener('click', reloadPasswordsHandler);
        reloadPasswordsBtn.reloadPasswordsHandler = reloadPasswordsHandler;
      }
    }

    // 全局函数
    window.togglePasswordVisibility = function (id) {
      const element = document.getElementById(`password-${id}`);
      if (element.classList.contains('masked')) {
        // 显示密码
        window.api.getPassword(id).then(password => {
          const pwd = password.password || '';
          element.querySelector('.password-value-text').textContent = pwd;
          element.classList.remove('masked');

          // 3秒后自动隐藏
          setTimeout(() => {
            element.querySelector('.password-value-text').textContent = '•'.repeat(12);
            element.classList.add('masked');
          }, 3000);
        });
      } else {
        // 隐藏密码
        element.querySelector('.password-value-text').textContent = '•'.repeat(12);
        element.classList.add('masked');
      }
    };

    window.copyToClipboard = function (id, type) {
      if (type === 'username') {
        window.api.getPassword(id).then(password => {
          const username = password.username;
          navigator.clipboard.writeText(username).then(() => {
            showToast('用户名已复制到剪贴板');
          });
        });
      } else {
        window.api.getPassword(id).then(password => {
          const pwd = password.password;
          navigator.clipboard.writeText(pwd).then(() => {
            showToast('密码已复制到剪贴板');
          });
        });
      }
    };

    window.editPassword = function (id) {
      window.api.getPassword(id).then(password => {
        document.getElementById('editPasswordId').value = id;
        document.getElementById('editWebsite').value = password.website || '';
        document.getElementById('editUsername').value = password.username || '';
        document.getElementById('editPassword').value = password.password || '';
        document.getElementById('editNotes').value = password.notes || '';

        document.getElementById('editPasswordModal').classList.add('active');
      });
    };

    window.deletePassword = function (id) {
      if (confirm('确定要删除此密码吗？此操作无法撤销。')) {
        window.api.deletePassword(id).then(result => {
          if (result.success) {
            showToast('密码已删除');
            loadPasswords();
          } else {
            showToast('删除失败: ' + (result.message || '未知错误'), 'error');
          }
        });
      }
    };

    // 显示Toast通知
    function showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      // 根据类型添加图标
      if (type === 'success') {
        toast.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          ${message}
        `;
      } else {
        toast.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          ${message}
        `;
      }
      
      document.body.appendChild(toast);
      
      // 触发重排以确保动画效果
      toast.offsetHeight;
      
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);
      
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          if (toast.parentNode) {
            document.body.removeChild(toast);
          }
        }, 300);
      }, 3000);
    }

    // 模态框控制
    document.getElementById('addPasswordBtn').addEventListener('click', () => {
      document.getElementById('addPasswordModal').classList.add('active');
    });

    document.getElementById('addFirstPasswordBtn')?.addEventListener('click', () => {
      document.getElementById('addPasswordModal').classList.add('active');
    });

    document.getElementById('cancelAddPasswordBtn').addEventListener('click', () => {
      document.getElementById('addPasswordModal').classList.remove('active');
    });

    document.getElementById('cancelEditPasswordBtn').addEventListener('click', () => {
      document.getElementById('editPasswordModal').classList.remove('active');
    });

    document.querySelectorAll('.modal-close').forEach(closeBtn => {
      closeBtn.addEventListener('click', function () {
        this.closest('.modal').classList.remove('active');
      });
    });

    // 点击模态框外部关闭
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', function (e) {
        if (e.target === this) {
          this.classList.remove('active');
        }
      });
    });

    // 保存新密码
    document.getElementById('savePasswordBtn').addEventListener('click', async () => {
      const website = document.getElementById('newWebsite').value;
      const username = document.getElementById('newUsername').value;
      const password = document.getElementById('newPassword').value;
      const notes = document.getElementById('newNotes').value;

      if (!website || !username || !password) {
        showToast('请填写所有必填字段', 'error');
        return;
      }

      try {
        const result = await window.api.addPassword({
          website,
          username,
          password,
          notes
        });

        if (result.success) {
          showToast('密码已保存');
          document.getElementById('addPasswordModal').classList.remove('active');

          // 清空表单
          document.getElementById('newWebsite').value = '';
          document.getElementById('newUsername').value = '';
          document.getElementById('newPassword').value = '';
          document.getElementById('newNotes').value = '';

          // 重新加载列表
          loadPasswords();
        } else {
          showToast('保存失败: ' + (result.message || '未知错误'), 'error');
        }
      } catch (error) {
        console.error('保存密码失败:', error);
        showToast('保存过程中发生错误', 'error');
      }
    });

    // 更新密码
    document.getElementById('updatePasswordBtn').addEventListener('click', async () => {
      const id = document.getElementById('editPasswordId').value;
      const website = document.getElementById('editWebsite').value;
      const username = document.getElementById('editUsername').value;
      const password = document.getElementById('editPassword').value;
      const notes = document.getElementById('editNotes').value;

      if (!website || !username || !password) {
        showToast('请填写所有必填字段', 'error');
        return;
      }

      try {
        const result = await window.api.updatePassword(id, {
          website,
          username,
          password,
          notes
        });

        if (result.success) {
          showToast('密码已更新');
          document.getElementById('editPasswordModal').classList.remove('active');
          loadPasswords();
        } else {
          showToast('更新失败: ' + (result.message || '未知错误'), 'error');
        }
      } catch (error) {
        console.error('更新密码失败:', error);
        showToast('更新过程中发生错误', 'error');
      }
    });

    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', () => {
      window.api.logout().then(() => {
        mainApp.style.display = 'none';
        loginView.style.display = 'block';
        document.getElementById('loginPassword').value = '';
      });
    });

    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
      // ESC键关闭所有模态框
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
          modal.classList.remove('active');
        });
      }

      // 登录界面回车键登录
      if (e.key === 'Enter' && loginView.style.display !== 'none') {
        document.getElementById('loginBtn').click();
      }

      // 设置界面回车键提交
      if (e.key === 'Enter' && setupView.style.display !== 'none') {
        document.getElementById('setupBtn').click();
      }
    });

    // 添加密码表单回车键提交
    document.getElementById('newPassword').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('savePasswordBtn').click();
      }
    });

    // 编辑密码表单回车键提交
    document.getElementById('editPassword').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('updatePasswordBtn').click();
      }
    });

    // 导出密码
    document.getElementById('exportPasswordsBtn').addEventListener('click', async () => {
      try {
        // 显示保存文件对话框
        const result = await window.api.saveFile([
          { name: 'Excel Files', extensions: ['xlsx'] },
          { name: 'Text Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]);
        
        if (!result.success) {
          if (result.message !== '用户取消保存') {
            showToast('保存文件失败: ' + result.message, 'error');
          }
          return;
        }
        
        const filePath = result.filePath;
        const fileExtension = filePath.split('.').pop().toLowerCase();
        
        let fileType = 'text';
        if (fileExtension === 'xlsx') {
          fileType = 'excel';
        }
        
        // 导出密码
        const exportResult = await window.api.exportPasswords(filePath, fileType);
        if (exportResult.success) {
          showToast(exportResult.message, 'success');
        } else {
          showToast('导出失败: ' + exportResult.message, 'error');
        }
      } catch (error) {
        console.error('导出密码失败:', error);
        showToast('导出过程中发生错误: ' + error.message, 'error');
      }
    });

    // 搜索功能
    document.getElementById('passwordSearch').addEventListener('input', function() {
      // 显示或隐藏清除按钮
      const clearSearchBtn = document.getElementById('clearSearch');
      if (this.value.trim() !== '') {
        clearSearchBtn.style.display = 'flex';
      } else {
        clearSearchBtn.style.display = 'none';
      }
      
      // 延迟执行搜索以提高性能
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        loadPasswords();
      }, 300);
    });

    // 清除搜索
    document.getElementById('clearSearch').addEventListener('click', function() {
      document.getElementById('passwordSearch').value = '';
      this.style.display = 'none';
      loadPasswords();
    });

    // 导入密码
    document.getElementById('importPasswordsBtn').addEventListener('click', async () => {
      try {
        // 显示文件选择对话框
        const result = await window.api.selectFile([
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
          { name: 'Text Files', extensions: ['txt', 'csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]);
        
        if (!result.success) {
          if (result.message !== '用户取消选择') {
            showToast('选择文件失败: ' + result.message, 'error');
          }
          return;
        }
        
        const filePath = result.filePath;
        const fileExtension = filePath.split('.').pop().toLowerCase();
        
        let fileType = 'text';
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          fileType = 'excel';
        }
        
        // 导入密码
        const importResult = await window.api.importPasswords(filePath, fileType);
        if (importResult.success) {
          showToast(importResult.message, 'success');
          loadPasswords(); // 重新加载密码列表
        } else {
          showToast('导入失败: ' + importResult.message, 'error');
        }
      } catch (error) {
        console.error('导入密码失败:', error);
        showToast('导入过程中发生错误: ' + error.message, 'error');
      }
    });

    // 清空密码库
    document.getElementById('clearPasswordsBtn').addEventListener('click', async () => {
      // 确认对话框
      if (!confirm('确定要清空整个密码库吗？此操作无法撤销！')) {
        return;
      }

      try {
        const result = await window.api.clearPasswords();
        if (result.success) {
          showToast('密码库已清空', 'success');
          loadPasswords(); // 重新加载列表
        } else {
          showToast('清空失败: ' + (result.message || '未知错误'), 'error');
        }
      } catch (error) {
        console.error('清空密码库失败:', error);
        showToast('清空过程中发生错误: ' + error.message, 'error');
      }
    });
