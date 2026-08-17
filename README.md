# dsh-whale-balance

DeepSeek Harness 原生插件：页面右下角一只小鲸鱼，气泡里实时显示 DeepSeek 账户余额。装上即用，随 DSH 启动自动加载。

## 快速使用

1. 按下方「安装」装好后，**重启 `dsh web`**；
2. 右下角自动出现小鲸鱼并显示余额——**默认就是内置的鲸鱼图，无需配置图片**；
3. 点一下小鲸鱼 = 手动刷新；按住拖动 = 换位置；每 60 秒自动刷新一次。

想换成自己的图片？在 profile 的 `cordis.patch.yml` 里加 `imagePath` 配置：

```yaml
- insert:
    - id: whale-balance
      name: 'dsh-whale-balance'
      config:
        imagePath: 'C:\你的图片.png'   # 图片的绝对路径；不填/填错都自动用内置鲸鱼图
```

## 安装（三步）

1. 把 `dsh-whale-balance` 文件夹放进 `~/.dsh/profiles/web/node_modules/`；
2. 在 `~/.dsh/profiles/web/package.json` 的 `dependencies` 里加：

   ```json
   "dsh-whale-balance": "file:./node_modules/dsh-whale-balance"
   ```

3. 在 `~/.dsh/profiles/web/cordis.patch.yml` 里加上面的 insert 段——**这步是加载插件，必做**；只有里面的 `imagePath` 一行可选（不填就用内置鲸鱼图）。

重启 `dsh web`，完成。

## 功能

- 🐳 余额来自官方 [`GET /user/balance`](https://api-docs.deepseek.com/api/get-user-balance/)，免费、不耗额度
- 🖼️ 内置鲸鱼图（`lib/assets/DSniang02.png`），也可用 `imagePath` 指定任意 PNG
- 🖱️ 可拖动、点击刷新、每 60 秒自动刷新
- 🌗 明暗主题自适应，运行时零 token

## 目录结构

```
.
├── package.json        # dsh.client 声明（客户端 bundle 靠它被发现）
├── lib
│   ├── index.js        # Host 半边：/dsh-whale/whale.png + /dsh-whale/balance
│   ├── client.js       # Client 半边：挂件 UI（fetch + setInterval）
│   └── assets          # 内置鲸鱼图 DSniang02.png
├── README.md
└── LICENSE
```

## 环境要求

- `DEEPSEEK_API_KEY`（Settings → Models 页面，或 `~/.dsh/.credentials.yaml`）
- `curl`（Windows 10+ / macOS / Linux 均自带）

## License

MIT
