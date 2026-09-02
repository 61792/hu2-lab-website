# 胡宏教授课题组官网

这是课题组网站的**唯一正式开发与 GitHub Pages 部署仓库**。后续功能优化、内容更新、版本提交和线上发布都从本目录进行。

- GitHub 仓库：<https://github.com/61792/hu2-lab-website>
- GitHub Pages：<https://61792.github.io/hu2-lab-website/>
- 当前正式基线：六届、14 名成员、12 项组内成果

## 当前版本口径

| 届次 | 成员 |
|---|---|
| 第六届 | 蔡隽晴、卞雪婷 |
| 第五届 | 王天豪、辛楚梁 |
| 第四届 | 刘伟嘉、周含笑 |
| 第三届 | 张高峰、曾洁霖 |
| 第二届 | 陈美伊、赵慧敏、QuangAnhTranCong |
| 第一届 | 卞新寅、李可昕、王颜 |

正式公开前仍应由导师或资料负责人复核姓名、成果归属、图片授权与联系方式。

## 文件结构

| 文件 | 作用 | 常见修改场景 |
|---|---|---|
| `index.html` | 页面结构与文字内容 | 增减成员、成果、栏目和链接 |
| `styles.css` | 视觉系统与响应式布局 | 调整颜色、字号、间距和移动端表现 |
| `script.js` | 页面交互 | 导航、成果筛选、滚动状态和 Canvas 动效 |
| `qa-edge.mjs` | Edge 自动验收 | 检查桌面端、移动端、菜单、筛选和内容数量 |
| `.gitignore` | 排除本地过程文件 | QA 截图、报告、依赖、日志和密钥不进入 Git |
| `.nojekyll` | GitHub Pages 配置 | 保持静态文件按原样发布 |
| `发布网站.ps1` | 正式发布脚本 | 检查远程状态、提交并推送 `main` |

在 VS Code 中搜索 `[LEARN-HTML-*]`、`[LEARN-CSS-*]`、`[LEARN-JS-*]` 或 `[LEARN-QA-*]`，可以快速定位各页面模块及其控制代码。

## 本地预览

在本目录打开 PowerShell：

```powershell
python -m http.server 4173
```

浏览器访问 <http://127.0.0.1:4173/>。结束预览时按 `Ctrl+C`。

## 推荐的版本迭代流程

1. 先同步正式分支：

   ```powershell
   git switch main
   git pull --ff-only origin main
   ```

2. 为一项明确改动创建分支，例如：

   ```powershell
   git switch -c feat/member-profile
   ```

3. 在 VS Code 中完成小范围修改，并随时查看：

   ```powershell
   git status
   git diff
   ```

4. 运行语法检查和页面 QA：

   ```powershell
   node --check script.js
   node --check qa-edge.mjs
   node qa-edge.mjs --suffix=v5
   ```

   QA 报告及截图只用于本地检查，默认不会提交到公开仓库。后续每次运行应使用新的后缀。

5. 提交一个可说明、可回退的小版本：

   ```powershell
   git add index.html styles.css script.js
   git commit -m "feat: 增加成员详情入口"
   ```

6. 检查无误后把功能分支合并回 `main`，再执行正式发布。不要把多个无关功能塞入同一次提交。

## 正式发布

确认当前处于 `main` 分支后运行：

```powershell
.\发布网站.ps1 -Message "feat: 更新成员与成果"
```

脚本会检查 JavaScript、GitHub 远程状态和待提交差异，然后创建提交并推送。推送后 GitHub Pages 通常会自动重新部署。

> 发布前不要把密码、令牌、内部资料、未授权照片或不可公开的成员信息放进本仓库。

## 版本命名建议

- `v0.x`：结构、视觉与内容仍在持续完善；
- `v1.0.0`：资料经确认、主要页面齐全并正式对外；
- 后续使用 `v主版本.功能版本.修订版本`，例如 `v1.2.1`。

每个重要节点可创建标签：

```powershell
git tag -a v0.2.0 -m "完成成员详情页"
git push origin v0.2.0
```

标签与推送属于公开仓库操作，应在确认版本可发布后执行。
