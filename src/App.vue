<template>
  <div>
    <nav class="nav">
      <router-link to="/">Home</router-link>
      <router-link to="/signature">Signature</router-link>
      <span class="grow"></span>
      <router-link to="/login">Login</router-link>
      <router-link to="/signup">Signup</router-link>
    </nav>
    <router-view />
  </div>
</template>

<style scoped>
.nav { display:flex; gap:12px; padding:12px 16px; border-bottom:1px solid #eee; align-items:center; }
.grow { flex:1 }
</style>