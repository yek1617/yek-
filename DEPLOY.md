# 部署到公网（5 分钟）

打包好的文件就是这个 zip 里的全部内容（`index.html` 在根目录）。任选一个免费托管，上传后就能用手机流量随时打开。

---

## 方案 A：Netlify Drop（最快，拖拽即可）

1. 电脑浏览器打开 <https://app.netlify.com/drop>
2. 把**这个 zip 直接拖进页面**
3. 等 10 秒，得到一个网址，形如 `https://xxx-yyy-123.netlify.app`
4. 手机上打开这个网址 → 分享 → 「添加到主屏幕」

要点：
- 拖的是 **zip**，不用解压
- 不登录也能用，但网址 24 小时后会失效；**想永久保存需要注册（免费）**
- 注册后再拖一次，可以在 Site settings 里改名字

---

## 方案 B：GitHub Pages（永久、免费、可版本管理）

1. 注册 <https://github.com>，新建仓库（Public），比如 `yek`
2. 把 zip 里的**所有文件**上传到仓库根目录
3. Settings → Pages → Source 选 `Deploy from a branch` → 分支 `main`、目录 `/ (root)` → Save
4. 等 1 分钟，网址是 `https://你的用户名.github.io/yek/`

优点：永久有效、可反复更新；缺点：要传文件。

---

## 方案 C：Cloudflare Pages

1. <https://dash.cloudflare.com> → Workers & Pages → Create → Pages → Upload assets
2. 把 zip 里的文件拖进去 → Deploy
3. 得到 `https://xxx.pages.dev`

---

## 上传后的好处

- 任何网络都能打开，**不需要电脑开着**
- 自带 https → Service Worker 生效 → **第一次打开后，断网也能用**
- 添加到主屏幕后是全屏 App，和原生体验一致
- 做题进度存在手机浏览器本地，换网络不丢

## 注意

- 上传时**不要再套一层文件夹**，`index.html` 必须在最外层
- 如果打开是 404，检查托管平台的项目根目录里是不是直接能看到 `index.html`
- 更新题库后，把新的 `data/` 文件重新上传即可，手机端刷新就会更新
