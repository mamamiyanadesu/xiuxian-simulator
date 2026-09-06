# GitHub Pages 部署

用户已授权将游戏部署到公网并上传 GitHub。目标地址为 https://mamamiyanadesu.github.io/xiuxian-simulator/ 。

发布源为 `design/visual-directions` 分支，工作流位于 `.github/workflows/pages.yml`。该分支的代码、依赖、测试或工作流更新后，会安装锁定依赖、运行测试、使用 `/xiuxian-simulator/` 资源前缀构建，然后上传 `dist` 发布。文档修改不会单独触发部署。主分支与现有 PR 保留。

网页仅提供静态游戏；没有后端账号或模型接口。存档仍保存在访问者自己的浏览器，公网与本机域名的存档相互独立。旧版规则存档键保留。

手工本地检查发布产物可运行 `npm run build -- --base=/xiuxian-simulator/`，再通过 `npm run preview` 访问 `/xiuxian-simulator/`。日常本地开发继续使用 `npm run dev`。

若以后把发布源改为 main，需要同时更新工作流分支和 GitHub Pages 环境的分支策略。回滚应恢复发布分支上的游戏代码并重新通过工作流部署，不删除用户浏览器里的存档。
