# GitHub Pages 部署

用户已授权将游戏部署到公网并上传 GitHub。在线地址为 https://mamamiyanadesu.github.io/xiuxian-simulator/ 。

2026-09-06 首次上线验证完成。发布提交 `ce7f4f6`，GitHub Actions 运行 [34021888821](https://github.com/mamamiyanadesu/xiuxian-simulator/actions/runs/34021888821)。CI 的依赖安装、31 项测试、子路径构建和 Pages 发布通过；公网浏览器实际从 0/12/0 启程进入随机洞府，调查扣除 1 寿元并展示线索。HTTPS 已开启。

初次部署被新环境默认仅允许 main 的策略阻挡，已在 `github-pages` 环境中添加 `design/visual-directions` 的指定分支许可后重新部署，未移除其他保护。Pages API 在 workflow 模式下仍显示 source 为 main；真正执行发布的是下述工作流及其分支策略。

发布源为 `design/visual-directions` 分支，工作流位于 `.github/workflows/pages.yml`。该分支的代码、依赖、测试或工作流更新后，会安装锁定依赖、运行测试、使用 `/xiuxian-simulator/` 资源前缀构建，然后上传 `dist` 发布。文档修改不会单独触发部署。主分支与现有 PR 保留。

网页仅提供静态游戏；没有后端账号或模型接口。存档仍保存在访问者自己的浏览器，公网与本机域名的存档相互独立。旧版规则存档键保留。

手工本地检查发布产物可运行 `npm run build -- --base=/xiuxian-simulator/`，再运行 `npm run preview`，访问 `/xiuxian-simulator/`。日常本地开发继续使用 `npm run dev`。

若以后把发布源改为 main，需要同时更新工作流分支和 GitHub Pages 环境的分支策略。回滚应恢复发布分支上的游戏代码并重新通过工作流部署，不删除用户浏览器里的存档。
