<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { uploadToR2 } from '@/api/upload'

const userStore = useUserStore()
const imageUrl = ref('')
const status = ref('')

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  status.value = '업로드 중...'
  try {
    const { publicUrl } = await uploadToR2(file)
    imageUrl.value = publicUrl
    status.value = '완료'
  } catch (err) {
    status.value = err.message
  } finally {
    e.target.value = ''
  }
}
</script>

<template>
  <div style="max-width:640px;margin:40px auto">
    <h2>시그니처 업로드</h2>
    <p>사용자: {{ userStore.user?.email }}</p>
    <input type="file" @change="onFile" />
    <p>{{ status }}</p>
    <img v-if="imageUrl" :src="imageUrl" style="max-width:100%;margin-top:12px"/>
  </div>
</template>
