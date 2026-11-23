# 项目结构与交互

## 加载顺序

入口按以下顺序加载普通脚本，不需要模块打包器：

```text
Three.js → OrbitControls → campuses.js → walk.js → scene.js → app.js → visits.js
```

- `window.CAMPUSES` 提供两个校区的参数。
- `window.CampusWalking` 提供独立导航计算与角色控制器。
- `window.createCampusScene()` 创建渲染器、场景、相机和模型构建器。
- `app.js` 绑定页面按钮并管理浏览状态。
- `visits.js` 是可选统计，不参与建模和漫游。

## 场景接口

`createCampusScene(host, onChoose, onManual)` 返回场景控制对象，主要接口包括：

| 接口                              | 用途                                           |
| --------------------------------- | ---------------------------------------------- |
| `load(campus)`                    | 释放上一校区资源，生成当前校区，返回可展示地点 |
| `choose(id, close)`               | 定位地点；`close` 指定近景                     |
| `overview()`、`top()`、`north()`  | 鸟瞰、俯视、恢复北向                           |
| `project(place)`                  | 把建筑坐标投影到页面标注坐标                   |
| `startWalking()`、`stopWalking()` | 进入或结束徒步                                 |
| `walkState()`                     | 返回角色位置、速度状态、方向与当前校服         |
| `setUniform(name)`                | 换校服（`blue` / `green`），切换校区后保持     |
| `capture()`                       | 返回当前 WebGL 画布                            |
| `onFrame`                         | 每个渲染帧后的回调，供页面标注或视频合成使用   |
| `dispose()`                       | 释放渲染器、模型、监听器与控制器               |

`app.js` 的漫游每站停留 6.5 秒。首次加载默认北校区并开始漫游；手动选择地点、拖动相机、切换校区或进入徒步会结束当前漫游。`#north`、`#south` 可直接指定校区。

## 点选与标注

建筑使用不可见拾取盒进行射线检测，拾取结果对应地点 ID。只有显示名单中的地点进入可选列表；未标注的楼仍然渲染和参与碰撞。

地图名称由 DOM 元素显示，每帧更新投影位置并避让重叠。模型本身的题字则是场景里的 Canvas 纹理。两者是不同的显示层。

## 手机与输入

移动端使用可收起地点面板。面板打开时暂停角色输入；浏览器失焦或切到后台时清空按键，防止角色继续移动。摇杆用 Pointer Events，视角通过拖动调整；快走可用触屏按钮切换。

## 访问计数

`visits.js` 仅在 `neverwinhao.github.io/xxyz/` 启用不蒜子，显示整站访问量 `site_pv`。不蒜子按请求的 Referer 区分页面，而 iOS 上的所有浏览器和 Safari 会把跨站 Referer 截成域名，若用 `page_pv`，苹果设备与其他设备会落在两个计数上。`site_pv` 只按域名累计，所有设备合并为一个总数；该域名下目前只有本页接入不蒜子，所以它就是校园页的总访问量。计数从接入时开始累计，不代表接入前的访问量。

部署到其他站点时，可以修改该文件的域名/路径条件，或从 `index.html` 移除它。请求失败或超时只会隐藏访问数，模型仍然运行。原理与服务用法见 <https://busuanzi.ibruce.info/>。

## 视频工具

`tools/record-showcase.html` 独立于正式页面，复用 `src/` 模型。`record-showcase.js` 读取相同的两校区漫游路线，加入轻缓镜头偏转，合成校区和建筑名称，使用 Canvas `captureStream()` 与 `MediaRecorder` 录制。

视频中的北校区角色沿用同一个校服模型和碰撞算法；录制器单独调整展示相机和步行节奏。它不会修改正式页面，也不会上传视频。
