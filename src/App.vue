<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import LoginView from '@/views/LoginView.vue'
import SignatureView from '@/views/Signature.vue'
const isLoggedIn = computed(() => useUserStore().isLoggedIn)
</script>



<template>
  <div style="padding:40px">프론트 렌더 OK</div>
  <LoginView v-if="!isLoggedIn" />
  <SignatureView v-else />
</template>


