# 课题组官网 GitHub Pages 部署包

本目录是一份可直接发布到 GitHub Pages 的纯静态网站。

## 文件

- `index.html`：网站入口
- `styles.css`：页面样式
- `script.js`：页面交互
- `.nojekyll`：让 GitHub Pages 按原样发布静态文件

## GitHub Pages 发布步骤

1. 在 GitHub 新建一个仓库，例如 `hu-lab-website`。
2. 将本目录中的全部文件推送到仓库 `main` 分支。
3. 打开仓库的 **Settings → Pages**。
4. 在 **Build and deployment** 中选择 **Deploy from a branch**。
5. Branch 选择 `main`，目录选择 `/(root)`，然后保存。
6. 等待 GitHub 完成发布。

项目站点地址通常为：

```text
https://<GitHub用户名>.github.io/<仓库名>/
```

## 更新网站

修改文件后提交并推送到 `main` 分支，GitHub Pages 会自动重新发布。

## 注意

- 公开发布前，请确认页面中的姓名、邮箱、论文与项目资料均可公开。
- 不要在本目录中加入密码、访问令牌、内部文档或其他敏感文件。
