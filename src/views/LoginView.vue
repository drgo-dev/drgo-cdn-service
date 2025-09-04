<script setup>
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/user'

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const userStore = useUserStore()

async function handleLogin() {
  errorMessage.value = ''
  isLoading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value, password: password.value
    })
    if (error) throw error
    const { data: { session } } = await supabase.auth.getSession()
    userStore.user = session?.user ?? null
    await userStore.fetchProfile()
  } catch (e) {
    errorMessage.value = e.message || '로그인 실패'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div style="max-width:420px;margin:80px auto">
    <h2>로그인</h2>
    <input v-model="email" type="email" placeholder="이메일" style="width:100%;margin:8px 0;padding:8px"/>
    <input v-model="password" type="password" placeholder="비밀번호" style="width:100%;margin:8px 0;padding:8px"/>
    <p v-if="errorMessage" style="color:#c00">{{ errorMessage }}</p>
    <button :disabled="isLoading" @click="handleLogin" style="width:100%;padding:10px">
      {{ isLoading ? '로그인 중...' : '로그인' }}
    </button>
  </div>
</template>
