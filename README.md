# Pelagos OC-8

Vue + Vite + Three.js 机械八爪鱼数字孪生展示。所有物理参数均为 **my guess / 设计估算**，没有真实设备遥测接入。

## 运行

```powershell
npm install --cache .tools/npm-cache
npm run dev -- --port 5173
```

浏览器打开 http://127.0.0.1:5173/ 。`npm run build` 输出静态站点至 `dist/`。

## 使用

- 拖动模型旋转，滚轮缩放，H 隐藏面板，空格播放/暂停。
- 拖动底部相位滑块检查任意姿态，滑块会暂停物理循环。
- 选择子系统，再选隔离、剖切、单独或展开；完整装配恢复所有部件。
- 自动导览的光标点击真实按钮；真实输入立即接管，静置 25 秒恢复导览。
- Studio / Balanced / Integrated GPU 三档切换像素比、阴影尺寸和面板刷新频率。全档不使用 AO。
- 检修展开是展示变换，不代表真实设备可开壳运行。

## 单一物理模型

`src/model.js` 的 `stateAt(phase, current)` 为全部物理读数的唯一来源，`armPoints(index, phase, current)` 生成每个关节位置。压力历史重新采样同一个函数，没有独立图表动画。

`src/parameters.json` 保存 SI 参数及来源声明。周期 2.4 s、排量 1.2 L、喷口直径 18 mm、密度 1000 kg/m³、Cd=0.8 均为估算。

在 p=0.25：Q≈1.571 L/s，v≈6.173 m/s，P≈29.77 kPa，F≈9.696 N。后半周期补水，喷射推力为零。半周期流量积分为 1.2 L。

`machine.js` 保存可编辑装配结构，`batching.js` 仅建立 GPU 实例化绘制副本。所有变换仍来自原始结构，不改变物理模型。

## Blender 源文件

打开 `blender/Pelagos_OC8.blend`。选中根对象 `Pelagos_OC8`：

- `jet_phase` 是唯一物理输入；时间线第 1–145 帧以 60 FPS 对应一个周期。
- `service_open` 为检修展开量，不参与喷射物理计算。
- 原生短表达式驱动器连接机械臂、外套膜、泵芯、镜头及阀门；不依赖自动执行外部 Python。
- 文件包含可编辑几何、材料、装配层级、摄影棚灯光、相机和来源说明。

重新生成（本项目 `.tools` 中已准备便携 Blender）：

```powershell
npm run export:blender
& '.\.tools\blender-4.5.3-windows-x64\blender.exe' --background --python blender/build_scene.py
& '.\.tools\blender-4.5.3-windows-x64\blender.exe' --background blender/Pelagos_OC8.blend --python blender/validate_scene.py
```

Blender 使用从网页装配导出的 `scene-data.json`，无需另行手工建模。官方运行包来源：[Blender 下载目录](https://download.blender.org/release/Blender4.5/)。

## 检查

```powershell
npm test
npm run qa
node scripts/review-regressions.mjs
python scripts/contact-sheet.py
```

浏览器检查使用本机 Chrome；运行前保留 Vite 服务。QA 会保存八个导览节点、过渡 0.2 s 采样、移动版截图、交互结果与实际 GPU 帧耗时。

见 `docs/verification.md`、`artifacts/qa-results.json`、`artifacts/blender-validation.json`。`artifacts/tour-contact-sheet.jpg` 为导览静帧总览。

## 文件组织

- `src/App.vue`：控制台与接管/导览生命周期。
- `src/viewer.js`：镜头、预热、剖切、轨道控制、质量档。
- `src/model.js` / `parameters.json`：纯函数与参数。
- `src/machine.js` / `batching.js`：机械装配与高效绘制。
- `src/tour.js`：导览节点。
- `blender/`：源文件、导出数据和生成/验证脚本。
- `tests/`：守恒、关节、碰撞代理、模式可见性测试。

## 验证范围

这是可交互的机构研究模型，并非经 CFD、结构计算或水下实验校准的工程数字孪生。碰撞检查针对采样相位、关节连接和机械臂保守包络，不能视为全部零件的制造公差认证。

## Water current and sound
The fluid panel now includes a live 0–3 m/s current slider. Use Enable sound for the procedural live score. See [current and scored-tour documentation](docs/current-and-score.md) for model assumptions, export commands and measured mastering results.

