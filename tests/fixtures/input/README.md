# 输入模型测试素材

- `right_hands.jpg`：Google MediaPipe 官方测试素材，来源 https://storage.googleapis.com/mediapipe-assets/right_hands.jpg 。所属项目 https://github.com/google-ai-edge/mediapipe ，Apache-2.0。浏览器测试将图像绘制到移动画布，作为合成摄像头帧；不是实体摄像头或真人挥手验收。
- `next-page.wav`：2026-10-30 本机 Windows System.Speech / Microsoft Huihui Desktop 合成“下一页”，用于验证 Vosk 实际识别与清理，不是麦克风录音，不含个人声音。

纯模型测试阻止所有非 localhost/127.0.0.1 请求。模型处理的是上述实际图像与 PCM 音频；控制单元测试另外注入确定性坐标，不将二者混称为真机验收。
