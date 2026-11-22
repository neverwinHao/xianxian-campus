# 献县第一中学 · 三维校园

用 **JavaScript + Three.js** 程序化搭建献县一中南、北校区。楼体、屋顶、门窗、道路、树木、雕塑和校服小人都由代码生成，没有使用 Blender 建模，也不依赖 `.blend`、`.glb` 或实景照片贴图。

[在线体验](https://neverwinhao.github.io/xxyz/) · [建模过程](docs/MODELING.md) · [项目结构与交互](docs/ARCHITECTURE.md) · [迭代记录](docs/EVOLUTION.md)

![北校区](docs/images/north.jpg)

## 运行

可以直接用现代浏览器打开根目录的 `index.html`。使用本地服务时，需要 Node.js 20 或更新版本：

```bash
npm start
```

打开 <http://127.0.0.1:5173/>。项目没有 npm 依赖，运行和检查都不需要执行 `npm install`。Three.js r146 与 OrbitControls 已保存在 `vendor/three/`。

```bash
npm run check  # JavaScript 语法检查
npm test       # 步行与碰撞测试
npm run build  # 生成 dist/index.html 和三方许可证
```

`dist/index.html` 将代码和样式打包成单文件，可独立打开。生成目录不提交到 Git；需要部署时，将 `dist/` 内容复制到 GitHub Pages 或其他静态托管目录。当前体验地址由独立站点仓库维护。

## 功能

- 默认北校区，支持南北切换；首次打开自动漫游。
- 鼠标旋转、缩放、平移，建筑定位、近景、俯视和截图。
- 建筑名称搜索与标注，漫游路线只经过已指定的地点。
- 校服小人：电脑 WASD / 方向键移动，Shift 快走；手机摇杆、拖动视角和快走按钮。
- 室外建筑碰撞、校园边界限制和跟随镜头。
- 线上页面访问次数；本地和离线版本不发送统计请求。

## 代码目录

```text
index.html                 页面入口
src/
  campuses.js              校区坐标、楼体参数、名称与漫游路线
  scene.js                 几何构建、材质、实例化、光照与相机
  walk.js                  校服小人、键盘/触摸输入、碰撞与跟随镜头
  app.js                   页面状态、地点选择、漫游和校区切换
  visits.js                线上访问计数
  style.css                桌面和手机页面样式
vendor/three/              本地 Three.js、OrbitControls 及 MIT 许可证
tools/                     开发服务、检查、单文件打包和展示视频录制
tests/                     步行导航测试
docs/                      建模方法、结构、迭代记录和模型截图
```

## 如何修改模型

先读 [建模过程](docs/MODELING.md)。调整楼的位置、尺寸、用途，通常只需修改 `src/campuses.js`；调整窗户、屋顶、食堂或雕塑的形状，修改 `src/scene.js` 中对应的构建函数。更换校服或移动规则则修改 `src/walk.js`。

照片和航拍用于人工分析，坐标及尺寸为近似。参考图没有作为仓库素材分发；这里的截图都是程序渲染结果。当前展示关系见 [迭代记录](docs/EVOLUTION.md)。

![南校区](docs/images/south.jpg)

## 导出校园展示视频

启动本地服务后，打开 <http://127.0.0.1:5173/tools/record-showcase.html>，点击“录制完整视频”。录制页复用相同的模型和路线，依次展示北校区、南校区、北校区小人行走，并加入轻缓运镜。完成后保存视频。

输出画面为 1920 × 1080，路线约 106.5 秒。浏览器支持 H.264 MediaRecorder 时输出 MP4，否则尝试 WebM。录制期间保持页面可见；生成视频不提交到 Git。此工具是模型画面录制，不是桌面屏幕录像。

## 推送这个仓库

本地仓库已初始化，可以先创建一个空的远端仓库，然后在本目录执行：

```bash
git remote add origin <你的仓库地址>
git push -u origin main
```

第三方代码来源与许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
