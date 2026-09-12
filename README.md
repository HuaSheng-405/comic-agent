# comic-agent · AI 漫剧创作多智能体流水线

输入一个故事想法 → 多智能体协作产出 **故事大纲 → 角色设定 → 分镜脚本 → 角色形象图 → 分镜画面 → 成片预览** 的完整漫剧创作链路,并配一个可直接使用的 Web 工作台。

一个学习/演示 **LangGraph 多智能体编排 + 长链路生成系统** 的项目,重点复现生产级长流程的核心难点:

- **HITL 审批门 ×6**:每类产物产出后,流水线用 LangGraph 动态 `interrupt()` 挂起等人裁决;用户可"通过"或输入修改意见
- **反馈智能分诊回炉**:审批点收到非空反馈时,review 节点判定"该动哪一层"(大纲/角色/分镜/立绘/分镜图),带路由护栏防回退到未发生的阶段,清空下游产物后从正确阶段重入;**未点名内容逐字保留**(定向修改,不整段重写)
- **质量闭环 ×2**:critic 对角色图/分镜图分别质检,低分退回各自的渲染段重做,轮数上限防死循环
- **两段渲染分离 + 身份锚定**:角色形象图先冻结;渲染分镜时把"在场角色"的立绘作为参考图喂给编辑类一致性模型,跨镜锁脸(多角色镜走官方多图参考字段,上限 3 张,第 4+ 角色文本摘要兜底)
- **真实媒体链路**:图像走 SiliconFlow 图像接口(URL 产物自动落盘);成片走火山方舟 seedance 图生视频任务 + ffmpeg 拼接;**视频服务未就绪不硬失败** —— 本次 run 正常收尾并打 `video_pending`,配置完善后可『补生成成片』
- **台词配音(可选)**:成片合成时把各镜对白逐句 TTS 合成、按真实段长对齐铺进音轨(CosyVoice2 / MOSS-TTSD,复用图像服务凭据);失败只留一句说明,绝不废掉已成片的画面
- **裁决只认"正在等待的门"**:审批 confirm 必须打在 run 确实停在门上的时刻 —— 门与门之间(回炉/下一生产阶段,阶段名仍显示旧门)的重复点击会被 409 拒绝,陈旧裁决不会被下一道门"先到先得"吞掉;用户消息先落库才唤醒 run,回炉的定向修改不丢
- **fake/real 双 provider**:零 API Key 跑通全流程(fake 占位),接真实 LLM/图像/视频只改配置,图与节点零改动
- **断点续跑**:LangGraph checkpoint 落盘同库 SQLite;进程崩溃后启动清扫把遗留 run 标为 `interrupted`,`/resume` 从 checkpoint 续跑,已完成阶段不重放
- **运营配置双通道**:.env 只做首次种子,之后以 Web『设置』页/DB 为准并热更;密钥只回显"已设置",明文不进响应
- **前端工作台**:Vite + React + Tailwind 的卡通宇宙风 SPA(创作台 / 项目舱 / 工作台 / 设置),2.5s 轮询驱动进度、消息流与门禁确认

## 流水线(15 阶段)

```
输入故事想法 + 风格
  plan_outline ─────────▶ outline_approval [HITL门①]
  plan_characters ──────▶ characters_approval [门②]
  plan_shots ───────────▶ shots_approval [门③]
  render_characters ────▶ critique_character_images(低分 → 自动回炉重渲)
                            → character_images_approval [门④]
  render_shots ─────────▶ critique_shot_images(低分 → 自动回炉重渲)
                            → shot_images_approval [门⑤]
  compose ──────────────▶ compose_approval [门⑥] → 完成
  review(反馈分诊:白名单内回退到任意已发生阶段,清下游后重跑)
```

- 任何门输入非空反馈 → 交给 review 分诊(大纲门反馈例外:直接回 plan_outline,无需 AI 分诊);
  带 `第N镜/角色名` 的点名会被解析,渲染层只重画点名对象、其余复用旧图(不重复烧钱)。
- 成片阶段若视频服务未就绪(`compose_blocked_reason`)→ 跳过并不打终审门,直达 END,
  run 标记 `video_pending`,设置页补齐后可『补生成成片』(start_stage=compose 定点重入)。

## 快速开始

```bash
# 后端
uv sync
cp .env.example .env            # 默认全 fake,零配置离线可跑
uv run pytest                   # 全量测试(158 个,单测 + 集成,零网络)
uv run uvicorn app.main:app --port 18766

# 前端(另开终端)
cd frontend
npm install
npm run build                   # 产出 dist;后端启动时自动托管,无需反向代理
```

打开 http://localhost:18766 → 创作台输入一句话故事 →「生成并进入工作台」,
每步产物会停在确认门等验收(见下方 curl 或直接在 UI 操作)。

接真实服务:在页面右上「⚙️ 设置」里选服务商并填参数(**保存即热更,无需重启**):

| 分组 | 服务商 | 说明 |
|---|---|---|
| 文本生成 | fake / OpenAI 兼容(DeepSeek 等) | 模型为预设下拉(如 deepseek-v4-flash);结构化 JSON 直接出 |
| 图像服务 | fake / SiliconFlow | 生图模型 + 尺寸下拉;身份锚定用的编辑模型(如 Qwen-Image-Edit-2509)锁跨镜长相 |
| 视频服务 | fake / 火山方舟 Ark | 接入点(ep- 开头)或模型 ID 按你的账号填;时长/画幅/合成镜头数 |
| 台词配音 | 视频组内开关 + 模型/音色下拉 | 换配音模型自动落到该模型默认音色;失败不阻塞成片 |

> 服务商下拉可随时切回「fake(离线模板,零配置可跑)」做离线演示;
> 密钥类字段只显示"已设置 / 未设置",留空保存 = 不改动;真实密钥只在服务端内存与 DB,明文不进任何接口响应。
> 其他参数(.env 键,无页面入口)见 `.env.example` 注释。

### 推荐服务模型配置(以下取值已实测跑通)

> **重要**:本项目按下列模型的接口契约构造请求与解析响应(字段名、必填参数、返回结构各家不同),并被回归测试锁定。**换用其他模型极大概率因参数不匹配导致运行异常**(400 报错、纯黑图、空内容、静默降级等)。要接别的模型,请先对照官方文档核对参数,再改 `app/services/` 下对应客户端。

| 分组 | 推荐取值 | 实测要点 |
|---|---|---|
| 文本生成 | 服务商 OpenAI 兼容;**base_url** `https://api.deepseek.com/v1`;**模型** `deepseek-v4-flash` | 推理模型必须关思考(`TEXT_THINKING=disabled`,env 配):思考会先吃掉 max_tokens,结构化 JSON 出不来 |
| 图像服务 | 服务商 SiliconFlow;**base_url** `https://api.siliconflow.cn/v1`;**生图模型** `Tongyi-MAI/Z-Image-Turbo`;**尺寸** `1024x576`(16:9 漫剧)/`512x512`/`768x1024`/`576x1024` | **image_size 必传**:缺了会出纯黑图(服务端默认尺寸与画幅不匹配);URL 产物 1 小时过期,本项目自动下载落盘 |
| 视频服务 | 服务商 火山方舟 Ark;**接口地址** 默认 `https://ark.cn-beijing.volces.com/api/v3`;**模型/接入点** 填自己账号的推理接入点(ep- 开头)或已开通模型 ID(如 `doubao-seedance-1-5-pro-251215`) | 接入点账号绑定、每人不同;未开通模型服务会报 `InvalidEndpointOrModel.NotFound`;时长 5/10 秒、画幅 adaptive/16:9/9:16/1:1;省钱演示把「成片合成镜头上限」设为 2-3 |
| 台词配音 | SiliconFlow TTS(复用图像凭据,无需新密钥);**模型** `FunAudioLLM/CosyVoice2-0.5B`(单音色)或 `fnlp/MOSS-TTSD-v0.5`(对白);**音色** anna/claire/bella(女)、alex/benjamin/charles(男) | **音色必填**:缺了报 20052;请求内部自动拼 `model:voice` 全名;采样率显式 44100(默认 32k 档发闷) |
| 身份锚定(可选) | 编辑类模型 `Qwen/Qwen-Image-Edit-2509`(`IMAGE_CONSISTENCY_MODEL`,env 配) | 不配 = 纯文字生成,跨镜长相会漂移;多角色镜走官方多图参考字段(上限 3 张,第 4+ 角色文本摘要兜底) |

- 设置页里的模型/尺寸/画幅/音色全部是**严格下拉**,选项即上表取值;`TEXT_THINKING`、`IMAGE_NEGATIVE_PROMPT`、`IMAGE_SEED`、`IMAGE_CONSISTENCY_MODEL` 等高级参数无页面入口,只在 `.env` 配置;
- 前置校验:真实 provider 未配全时点「开始生成」会 409 并引导去『设置』页(视频除外 —— 未就绪只跳过成片并打 `video_pending`,不阻塞文本与图像)。

### Docker 一键部署(可选)

```bash
cp .env.example .env          # 留空即 fake 离线模式,零 API Key 可跑;接真实服务再填密钥
docker compose up --build -d  # 单容器:前端打包 + 后端运行时;首次构建约 2-5 分钟
# → http://localhost:18766   (docker compose logs -f 看日志;down 停止)
```

- **数据持久化**:业务库 + LangGraph checkpoint + 图片/视频/配音都落在 `./data/`(`data/db`、`data/static` 两个挂载卷),重建容器、升级镜像均不丢;要清空删掉 `./data` 目录即可;
- **密钥不进镜像**:`.env` 只经 compose `env_file` 运行时注入,`.dockerignore` 已把 `.env`、本地库文件、虚拟环境挡在构建上下文之外;
- **单进程语义是刻意的**:人工确认唤醒走进程内 asyncio 信号(`app/gateway.py`),镜像固定单 worker;要做多实例水平扩展,先把 gateway 换成 Redis pub/sub(图与驱动器零改动);
- **重启不丢在途 run**:容器收到 SIGTERM 会优雅收尾,在途 run 落 `interrupted`(可续跑);重启后在「工作台」点『恢复续跑』接着走,已完成阶段不重放;

```bash
# bash / Git Bash
DEBIAN_MIRROR=mirrors.aliyun.com PYPI_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple \
  docker compose up --build -d
```

```powershell
# Windows PowerShell
$env:DEBIAN_MIRROR="mirrors.aliyun.com"; $env:PYPI_INDEX="https://pypi.tuna.tsinghua.edu.cn/simple"
docker compose up --build -d
```

- 不用 compose 的裸 `docker` 等价命令(注意把库路径显式指到卷内,否则数据随容器丢失):

```bash
docker build -t comic-agent .
docker run -d --name comic-agent -p 18766:18766 --env-file .env \
  -e DATABASE_URL=sqlite+aiosqlite:////app/data/comic-agent.db \
  -v comic-agent-data:/app/data -v comic-agent-static:/app/app/static comic-agent
```

## HTTP API(薄壳;业务读模型与动作推导见 `services/project_view.py`)

```bash
# 建项目
curl -X POST localhost:18766/api/v1/projects -H 'Content-Type: application/json' \
  -d '{"topic":"咖啡师与时间旅行者","style":"日系动漫"}'
# 启动生成(auto_mode=false → 每道门等人裁决;start_stage=compose 可定点补成片)
curl -X POST localhost:18766/api/v1/projects/1/generate -H 'Content-Type: application/json' -d '{}'
# 轮询:看卡在哪道门(latest_run.current_stage 以 _approval 结尾 = 等待确认)
curl localhost:18766/api/v1/projects/1
# 确认门:feedback 为空=通过;非空=修改意见(走分诊回炉)
curl -X POST localhost:18766/api/v1/projects/1/confirm -H 'Content-Type: application/json' \
  -d '{"run_id":1,"feedback":"主角改成银白长发"}'
# 其他:GET/PUT /api/v1/config(设置页数据源)、DELETE /projects/{id}(删除)、
#      /resume(续跑 interrupted run)、/cancel(停止进行中的 run)
```

### 并发与生命周期语义

- 同一项目同时只允许一条 run 在跑(409 挡住);`interrupted`(进程重启遗留)优先 resume,崩溃早于首个执行断点时允许整轮重开;
- 失败/取消/中断都会如实回写项目状态(failed/draft/interrupted),列表不再永久"生成中";
- **整轮重新生成** = 推倒重来:旧产物引用立即清空;`render_shots`/`compose` 定点补跑复用已批准内容;
- **删除项目**(不可恢复):若有 run 在生成会先自动停止并等其收尾,再级联删 run/消息/checkpoint/静态文件。

## 设计说明

- **HTTP 层薄、业务在 service**:路由只接参校验;项目读模型、按钮可用性与门禁状态推导(`can_generate / can_resume / can_cancel / waiting_gate`)集中在 `services/project_view.py`,前端 UI 状态与后端语义单一来源;
- **错误分层**:业务异常携带 `message`(日志细节)+ `user_message`(用户可读文案),边界处经 `errors.user_facing()` 取出 —— 用户永远看到"去『设置』页补配置"而不是密钥/堆栈;
- **执行信号隔离**:人工确认走进程内 asyncio 事件网关(带先到先得竞态保护);多实例部署换成 Redis pub/sub 时只改 `gateway.py` 内部,图与驱动器零改动;
- **HITL 策略可注入**:`runner.py` 通过 `on_interrupt` 回调把"等谁、等多久"注入驱动器 —— 审批策略可单测、可换自动模式;
- **幂等是恢复的地基**:审批门消息先查后插(动态 interrupt 的 resume 会重放节点,落库副作用会执行两遍);生产阶段靠 `artifact_lineage` 跳过已完成工作,回炉必须显式 `force_rerun`;
- **双闸顺序 = 先机后人**:critique 质检排在审批门【之前】—— 机器低分批次自动回炉重渲,不打扰人;只有机器放行的候选才到门,**人只审最终候选**(每版流向下游的画面都过机器质检 + 人工终审双闸)。用户改动意见(经 review 回炉)同样先过机器再回门,保证门看到的永远是"待定稿";
- **配置可覆盖,不留焊死的硬编码**:厂商地址/模型/密钥全在 .env 与设置页;个别地址有平台默认值兜底(cn-beijing 等)但一律可经设置项覆盖(如 Ark 的 doubao_base_url);测试环境逐行中和 .env 真实键,密钥不进测试进程;
- **SQLite 一库装天下**:业务表 + LangGraph checkpoint 同文件,备份即全量;换 Postgres 只改连接串(并换 checkpoint saver);
- **两套测试风格**:单测注入 transport 走生产代码路径(请求构造/解析不旁路);集成测试用真实 TestClient + 真实 DB 文件 + fake provider 全流程过 6 门到 succeeded —— 每条业务语义都有回归用例锁死。


## 结构

```
comic-agent/
  app/
    config.py               # pydantic-settings;厂商字段留空由 .env/设置页给
    main.py                 # FastAPI 装配(static 托管 + 前端 dist 挂载)
    runner.py               # 一条 AgentRun 的执行器(状态机收尾)
    gateway.py              # 人工确认信号网关(单进程 asyncio 事件)
    errors.py               # 错误分层:开发细节 / 用户可读文案
    agents.py               # 各阶段"生产者":fake 模板 / LLM 双实现 + 媒体渲染
    models/                 # ComicProject / AgentRun / Message / ConfigItem
    api/
      projects.py           # 项目 CRUD + generate/confirm/resume/cancel/delete
      config.py             # 设置页读写(薄壳)
    orchestration/
      graph.py              # 图拓扑(纯声明:15 节点 + 条件路由)
      nodes.py              # 生产/审批(interrupt)/批评/review 节点
      state.py              # 阶段词表 + 进度换算(6 等分坐标系)
      driver.py             # interrupt/resume 执行循环(策略注入)
      persistence.py        # checkpoint 落盘(thread_id 绑定业务 run)
    prompts/                # 提示词目录(每 agent 一模块,与逻辑解耦)
    services/
      project_view.py       # 项目读模型 + 可执行动作推导
      config_service.py     # 配置持久化/掩码/热更/预检
      llm.py                # OpenAI 兼容 LLM 客户端(JSON 防御解析)
      media.py              # 图像(SiliconFlow)/视频(Ark 任务轮询)/静态资产
      tts.py                # 台词配音(SiliconFlow TTS;失败只留 note 不阻塞成片)
      video_merger.py       # ffmpeg 拼接/音轨合成(音轨先裁齐,视频永不被 -shortest 剪短)
  frontend/                 # Vite + React + TS + Tailwind(HashRouter SPA)
    src/pages/              # 创作台 / 项目舱 / 工作台 / 设置
    src/components/         # 顶栏 / 阶段轨道 / 消息流+门禁 / 内容舞台
    src/hooks/              # 项目视图轮询(2.5s)
  tests/                    # 158 个:单测(注入 transport)+ 集成(TestClient)
```
