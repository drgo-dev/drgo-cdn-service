<!-- src/views/HomeView.vue -->
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const isLoggedIn = computed(() => !!userStore.user?.id)
const nickname = computed(() => userStore.profile?.nickname || userStore.user?.email || '게스트')

async function goSignature() {
  if (!isLoggedIn.value) return router.push({ name: 'login' })
  router.push({ name: 'signature' })
}

async function handleSignOut() {
  await userStore.signOut()
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="home">
    <h1>DRGO CDN Service</h1>
    <p class="sub">간단한 업로드 & 시그니처 관리 데모</p>

    <div v-if="isLoggedIn" class="card">
      <h3>안녕하세요, {{ nickname }}님 👋</h3>
      <p class="muted">
        시그니처 파일(이미지/오디오)을 업로드하고 목록을 관리할 수 있습니다.
      </p>
      <div class="actions">
        <button class="btn primary" @click="goSignature">시그니처 관리로 이동</button>
        <button class="btn ghost" @click="handleSignOut">로그아웃</button>
      </div>

      <div v-if="userStore.profile" class="profile">
        <div><b>등급</b> : {{ userStore.profile.grade || '-' }}</div>
        <div>
          <b>사용량</b> :
          {{ ((userStore.profile.storage_used || 0) / (1024 * 1024)).toFixed(2) }} MB
        </div>
      </div>
    </div>

    <div v-else class="card">
      <h3>로그인이 필요합니다</h3>
      <p class="muted">로그인하거나 회원가입을 진행해 주세요.</p>
      <div class="actions">
        <router-link class="btn primary" :to="{ name: 'login' }">로그인</router-link>
        <router-link class="btn ghost" :to="{ name: 'signup' }">회원가입</router-link>
      </div>
    </div>

  </div>
</template>

<style scoped>
.home { max-width: 960px; margin: 32px auto; padding: 0 16px; }
.sub { color:#6b7280; margin-top: -6px; }
.card {
  border:1px solid #eee; border-radius: 12px; padding: 20px;
  box-shadow: 0 6px 16px rgba(0,0,0,.05); margin-top: 16px;
}
.muted { color:#6b7280; }
.actions { display:flex; gap:10px; margin-top: 12px; }
.btn {
  display:inline-flex; align-items:center; justify-content:center;
  padding:10px 14px; border-radius:8px; cursor:pointer; text-decoration:none;
  border:1px solid transparent;
}
.btn.primary { background:#007bff; color:#fff; border-color:#007bff; }
.btn.ghost { background:#fff; color:#007bff; border-color:#007bff; }
.profile { margin-top: 12px; display:grid; gap:6px; color:#374151; }
.tips { margin-top: 24px; color:#6b7280; }
code { background:#f3f4f6; padding:2px 6px; border-radius:6px; }
</style>