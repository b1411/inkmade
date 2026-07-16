<template>
  <div class="min-h-screen bg-ink-raised text-ink-text overflow-x-clip">
    <a href="#main-content" class="skip-link">{{ $t('a11y.skipToContent') }}</a>
    <LayoutTopInfoBar />
    <LayoutAppHeader />
    <main id="main-content" tabindex="-1" class="mx-auto w-full max-w-[1600px] px-4 pb-8 pt-20 focus:outline-none">
      <slot />
    </main>
    <UiCustomCursor />
  </div>
</template>
