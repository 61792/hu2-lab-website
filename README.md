# 胡宏教授课题组官网

这是课题组网站的正式开发与 GitHub Pages 部署仓库。

- GitHub：<https://github.com/61792/hu2-lab-website>
- 网站：<https://61792.github.io/hu2-lab-website/>

## 目录

- `docs/`：公开网页文件，包含 HTML、CSS、JavaScript 和静态资源。
- `local-data/`：成员资料、成果原始资料、原图和 QA 结果；不会上传 GitHub。
- `tools/`：本地 QA 与发布脚本。

## 本地预览

```powershell
cd docs
python -m http.server 4173
```

访问 <http://127.0.0.1:4173/>。

## QA

在仓库根目录运行：

```powershell
node tools/qa-edge.mjs --suffix=local-01
```

报告和截图保存在 `local-data/qa/`。

## GitHub Pages 部署

GitHub Pages 的发布来源应设置为 `main` 分支的 `/docs` 目录。

确认内容可以公开后，在仓库根目录运行：

```powershell
.\tools\发布网站.ps1 -Message "更新网站内容"
```

公开前请确认姓名、成果、联系方式和图片均已获得发布许可。
