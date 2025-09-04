<template>
  <LoginView v-if="!isLoggedIn" />
  <SignatureView v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import LoginView from '@/views/LoginView.vue'
import SignatureView from '@/views/Signature.vue'
const isLoggedIn = computed(() => useUserStore().isLoggedIn)
</script>

<template>
  <div>배포 완료!</div>
</template>