# dsh-whale-balance

一个 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/DeepSeek-Harness) 的**原生插件**：在页面右下角显示一只小鲸鱼，头顶气泡里实时显示 DeepSeek 平台账户余额。装进 profile 组合后**随 DSH 重启自动加载**，无需再手动运行。

- 🐳 余额来自官方 [`GET /user/balance`](https://api-docs.deepseek.com/api/get-user-balance/)（免费接口，不耗额度）
- 🖼️ 内置默认鲸鱼图（`config.imagePath` 留空即用），也可指向自己的 PNG
- 🖱️ 可拖动、点击刷新、每 60 秒自动刷新
- 🌗 明暗主题自适应；⚡ 运行时零 token

## 目录结构

```
.
├── package.json        # dsh.client 声明（客户端 bundle 靠它被发现）
├── lib
│   ├── index.js        # Host 半边：/dsh-whale/whale.png + /dsh-whale/balance
│   └── client.js       # Client 半边：挂件 UI（fetch + setInterval）
├── README.md
└── LICENSE
```

## 安装（宿主组合）

把本包放进 DSH 的 profile 依赖里，再在 profile 的 `cordis.patch.yml` 加一行，重启 DSH：

```bash
# 1) 把本目录装成 profile 的一个依赖（示例：拷贝到 node_modules）
mkdir -p "$DSH_HOME/profiles/web/node_modules"
cp -r . "$DSH_HOME/profiles/web/node_modules/dsh-whale-balance"
```

`$DSH_HOME/profiles/web/package.json` 的 `dependencies` 增加：

```json
"dsh-whale-balance": "file:./node_modules/dsh-whale-balance"
```

`$DSH_HOME/profiles/web/cordis.patch.yml`（顶层 YAML 数组）确保有这一行：

```yaml
- insert:
    - id: whale-balance
      name: 'dsh-whale-balance'
      config:
        imagePath: ''        # 留空=内置默认图；或填自定义 PNG 绝对路径
```

重启 DSH 后，右下角即出现小鲸鱼。

## 配置

| 字段 | 位置 | 说明 |
| --- | --- | --- |
| `config.imagePath` | 组合行 | 自定义图片绝对路径；留空用内置默认图（仓库自带 `DSniang02.png` 示例，`git clone` 后可直接引用） |
| `--hb-w` | `lib/client.js` | 显示宽度（文字联动缩放） |
| `.hb-text` 的 `left/top` | `lib/client.js` | 气泡中心百分比（`cx/W`、`cy/H`） |
| `color: #536ba9` | `lib/client.js` | 文字颜色 |
| `60000` | `lib/client.js` | 自动刷新间隔（毫秒） |

## 环境要求

- `DEEPSEEK_API_KEY`（Settings → Models 页面，或 `~/.dsh/.credentials.yaml`）
- 一个 `curl` 可执行文件（Windows 10+ / macOS / Linux 均自带）

## License

MIT

