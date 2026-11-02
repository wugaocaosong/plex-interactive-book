# 星轨书库首页视觉提案

2026-11-02。使用内置 imagegen 生成，用户已确认这套视觉方向。以下为设计阶段的静态概念图，实时交互实现与验收另见 `../../GALAXY_HOME_REDESIGN.md`。

## 画稿

- [01 银河选书](01-galaxy-library.png)：单一前景 PLEX 星球、六个远景待上架席位、倾斜银河旋臂、漫画导航。
- [02 立体书近景](02-book-inspection.png)：现有封面贴于实体书外观，展示书脊与纸张厚度，标出旋转与进入操作。
- [03 睁眼入书分镜](03-opening-storyboard.png)：封皮展开、渐暗黑场、曲线遮罩揭幕、阅读终态。四格表示时间顺序，不是同时呈现的界面。

均为 1672×941 横版图片，约 16:9。参考封面为 `web/public/images/cover.png`；第二张以第一张作为视觉参考，第三张参考前两张及封面。生成图中的印刷文字、封面比例和书体结构属于概念表现；实现时使用原封面文件、真实 DOM 文本、书脊铰链和几何书体，不把整张效果图作为交互界面。

## 提示词要点（对应生成顺序）

1. One polished 16:9 desktop UI concept for PLEX 星轨书库. Persona 5 inspired manga space, midnight navy/cyan/violet, sparse vermilion and ivory, diagonal galaxy arms, one integrated foreground teal book planet and six distant planets labeled 待上架. Sharp cut-paper navigation 继续探索 and 简化显示; no dashboard cards, no row of circles. Coherent light, perspective and atmospheric depth.
2. Match image 1 visual language and faithfully use the supplied existing cover. One complete floating hardback at three-quarter angle, front/spine/paper block visible, cyan rim illumination and darkened galaxy. Manga controls 返回银河、按住拖动·旋转查看、点击封面，开始探索、开始探索、回正. No hands or extra books; entire model inside frame.
3. Match prior images and cover. One 16:9 motion storyboard: three smaller upper frames show opening 0.7s, fade/black 0.45s, eyelid-shaped mask reveal 1.2s; larger lower frame shows comfortable ivory double-page reading. No anatomical eyes, white flashes or large graphics over reading text. Distinguish sequential storyboard from the final application layout.

## 实现衔接

定稿后已开展 Galaxy Explorer 开源场景移植、星球点选、真实三维书旋转、点击与拖动区分、转场加载保障、性能降级和浏览器测试。运行版本不使用概念图中的整张合成界面；正文和后端未改变。
