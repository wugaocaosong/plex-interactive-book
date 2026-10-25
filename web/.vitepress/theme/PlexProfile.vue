<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { account, login, logout, plex } from "./plex-client";
import { copyGuestLearning } from "./learning-store";
const user = account(),
  username = ref(""),
  password = ref(""),
  message = ref(""),
  busy = ref(false),
  profile = ref<any>(),
  confirmCopy = ref(false);
let disposed = false;
function describe(value: any) {
  if (value && typeof value === "object" && "value" in value)
    return value.value || "暂无足够信息";
  return typeof value === "string" || typeof value === "number"
    ? value
    : "暂无足够信息";
}
async function signIn() {
  busy.value = true;
  try {
    await login(username.value, password.value);
  } catch (e) {
    message.value = String(e);
  } finally {
    password.value = "";
    busy.value = false;
  }
}
async function signOut() {
  busy.value = true;
  try {
    await logout();
  } catch (e) {
    message.value = String(e);
    busy.value = false;
  }
}
async function load() {
  if (!user) return;
  message.value = "读取服务端学习画像…";
  try {
    const data = await plex("/student/profile");
    if (!disposed) {
      profile.value = data;
      message.value = "画像来自 PLEX 服务端。本机活动单独记录。";
    }
  } catch (e) {
    if (!disposed) message.value = String(e);
  }
}
async function copy() {
  try {
    await copyGuestLearning();
    confirmCopy.value = false;
    message.value = "已复制访客记录；同一记录的不同版本保留在备份冲突区。";
  } catch (e) {
    message.value = String(e);
  }
}
function expired() {
  profile.value = undefined;
  message.value = "登录已失效，请重新登录。";
}
onMounted(() => {
  window.addEventListener("plex-session-expired", expired);
  message.value = sessionStorage.getItem("plex-auth-notice") || "";
  sessionStorage.removeItem("plex-auth-notice");
  void load();
});
onBeforeUnmount(() => {
  disposed = true;
  window.removeEventListener("plex-session-expired", expired);
});
const dimensionLabels: Record<string, string> = {
  major_background: "专业背景",
  knowledge_foundation: "知识基础",
  learning_goal: "学习目标",
  explanation_preference: "讲解偏好",
  mistake_pattern: "常见错误",
  learning_pace: "学习节奏",
  interest_direction: "兴趣方向",
  cognitive_state: "认知状态",
};
</script>
<template>
  <section class="plex-profile">
    <h3>我的 PLEX 学习画像</h3>
    <p>
      登录可以使用真实学习画像、在线判题与小E辅导，也可以直接以访客身份开始。
    </p>
    <p v-if="user">
      本机空间：{{ user.real_name || user.username }}（{{ user.id }}）
    </p>
    <form @submit.prevent="signIn">
      <label class="unit-field"
        >PLEX 学生账号<input
          v-model="username"
          autocomplete="username"
          required /></label
      ><label class="unit-field"
        >密码<input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
      /></label>
      <div class="unit-actions">
        <button :disabled="busy" class="primary" type="submit">
          {{ user ? "重新登录／切换账号" : "登录 PLEX" }}</button
        ><button v-if="user" type="button" :disabled="busy" @click="signOut">
          退出到访客
        </button>
      </div>
    </form>
    <div v-if="user" class="unit-actions">
      <button @click="load">刷新画像</button
      ><button @click="confirmCopy = true">复制访客学习记录到此账号</button>
    </div>
    <div v-if="confirmCopy" class="unit-explanation">
      <p>
        将复制访客笔记、草稿、板书及单元活动，访客原记录保留。发生冲突时两个版本分别保存。
      </p>
      <button @click="copy">确认复制这些记录</button
      ><button @click="confirmCopy = false">取消</button>
    </div>
    <p role="status">{{ message }}</p>
    <div v-if="profile" class="profile-data">
      <h4>服务端画像</h4>
      <dl>
        <template
          v-for="(value, key) in profile.dimensions || profile"
          :key="key"
          ><dt>{{ dimensionLabels[key] || key }}</dt>
          <dd>{{ describe(value) }}</dd></template
        >
      </dl>
    </div>
  </section>
</template>
