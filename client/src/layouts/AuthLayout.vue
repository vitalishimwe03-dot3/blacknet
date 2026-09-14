<template>
  <div class="auth-page">
    <div class="matrix-bg" aria-hidden="true"></div>
    <router-view />
  </div>
</template>

<script setup>
</script>

<style scoped lang="scss">
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 20px;
}
</style>