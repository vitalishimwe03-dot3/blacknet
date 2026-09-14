<template>
  <div class="not-found">
    <div class="not-found__content">
      <pre class="ascii-art not-found__ascii">
 ██████╗  ██████╗ ██╗  ██╗
██╔════╝ ██╔═══██╗╚██╗██╔╝
██║      ██║   ██║ ╚███╔╝
██║      ██║   ██║ ██╔██╗
╚██████╗ ╚██████╔╝██╔╝ ██╗
 ╚═════╝  ╚═════╝ ╚═╝  ╚═╝
      </pre>
      <div class="not-found__code glitch-text">404</div>
      <div class="terminal-window" style="max-width: 500px; margin: 0 auto;">
        <div class="terminal-window__header">
          <span class="terminal-window__dot terminal-window__dot--red"></span>
          <span class="terminal-window__dot terminal-window__dot--yellow"></span>
          <span class="terminal-window__dot terminal-window__dot--green"></span>
          <span class="terminal-window__title">error.log</span>
        </div>
        <div class="terminal-window__body">
          <div class="log-line">
            <span class="log-line__level log-line__level--error">ERR</span>
            <span class="log-line__message">Route not found in network map</span>
          </div>
          <div class="log-line">
            <span class="log-line__level log-line__level--warning">WARN</span>
            <span class="log-line__message">The requested node does not exist</span>
          </div>
          <div class="log-line">
            <span class="log-line__level log-line__level--info">INFO</span>
            <span class="log-line__message">Try navigating back to a known node</span>
          </div>
        </div>
      </div>
      <router-link to="/" class="btn-hacker btn-hacker--solid" style="margin-top: 24px;">
        [ RETURN TO MAINFRAME ]
      </router-link>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.not-found__content {
  text-align: center;
}

.not-found__ascii {
  margin-bottom: 16px;
  font-size: 10px;
}

.not-found__code {
  font-family: var(--font-mono);
  font-size: 80px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 24px;
  line-height: 1;
}
</style>
