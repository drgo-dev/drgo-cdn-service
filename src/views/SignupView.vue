<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const message = ref('')

async function handleSignup() {
  errorMessage.value = ''
  message.value = ''
  isLoading.value = true
  try {
    const { error } = await supabase.auth.signUp({
      email: email.value, password: password.value,
    })
    if (error) throw error
    message.value = '회원가입 완료! 이메일 인증 후 로그인하세요.'
    setTimeout(() => router.replace({ name: 'login' }), 800)
  } catch (err) {
    errorMessage.value = err.message || '회원가입에 실패했습니다.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="card">
      <h2>회원가입</h2>
      <form @submit.prevent="handleSignup" class="form">
        <label>이메일</label>
        <input type="email" v-model="email" placeholder="you@example.com" />
        <label>비밀번호</label>
        <input type="password" v-model="password" placeholder="최소 6자" />
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <p v-if="message" class="ok">{{ message }}</p>
        <button class="btn" :disabled="isLoading">{{ isLoading ? '처리 중…' : '회원가입' }}</button>
      </form>
      <p class="hint">이미 계정이 있으신가요? <router-link to="/login">로그인</router-link></p>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap { min-height: 70vh; display:flex; align-items:center; justify-content:center; }
.card { width:100%; max-width:420px; border:1px solid #eee; border-radius:10px; padding:24px; box-shadow:0 6px 18px rgba(0,0,0,.06); }
.form { display:grid; gap:10px; margin:12px 0 16px; }
input { padding:10px 12px; border:1px solid #ccc; border-radius:8px; }
.btn { padding:10px 12px; border-radius:8px; border:none; background:#28a745; color:#fff; cursor:pointer; }
.btn:disabled { opacity:.6; cursor:not-allowed; }
.hint { margin-top:10px; }
.error { background:#fde8ea; color:#b1001f; padding:8px; border-radius:6px; }
.ok { background:#e9f7ef; color:#207044; padding:8px; border-radius:6px; }
</style>