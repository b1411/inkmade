<script setup lang="ts">
// Футер (§5.11): тёмный, структурированный — лого+слоган, колонки ссылок,
// соцсети, копирайт-дисклеймер. grain для фактуры, mono-лейблы колонок.
import { LEGAL } from '~~/shared/config/legal'
</script>

<template>
  <footer class="ink-grain bg-ink-black text-ink-cream/70 mt-24">
    <div
      class="mx-auto max-w-(--container-max) px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
      style="padding-block: var(--section-pad)"
    >
      <div>
        <p class="ink-logo text-xl text-ink-cream">INKMADE</p>
        <p class="ink-label mt-2 text-ink-cream/50">{{ $t('footer.tagline') }}</p>
        <p class="text-caption mt-3">{{ $t('footer.about') }}</p>
      </div>
      <div class="space-y-2">
        <p class="ink-label text-ink-cream/50">{{ $t('footer.catalogCol') }}</p>
        <NuxtLink to="/catalog" class="footer-link block text-caption">{{ $t('footer.allCategories') }}</NuxtLink>
        <NuxtLink to="/cart" class="footer-link block text-caption">{{ $t('footer.cart') }}</NuxtLink>
        <NuxtLink to="/account" class="footer-link block text-caption">{{ $t('footer.account') }}</NuxtLink>
      </div>
      <div class="space-y-2">
        <p class="ink-label text-ink-cream/50">{{ $t('footer.infoCol') }}</p>
        <NuxtLink to="/legal/terms" class="footer-link block text-caption">{{ $t('footer.terms') }}</NuxtLink>
        <NuxtLink to="/legal/privacy" class="footer-link block text-caption">{{ $t('footer.privacy') }}</NuxtLink>
      </div>
      <div class="space-y-2">
        <p class="ink-label text-ink-cream/50">{{ $t('footer.contactsCol') }}</p>
        <a :href="`mailto:${LEGAL.supportEmail}`" class="footer-link block text-caption">{{ LEGAL.supportEmail }}</a>
        <div class="flex items-center gap-3 pt-1">
          <a
            href="https://instagram.com/inkmade"
            target="_blank"
            rel="noopener"
            aria-label="Instagram"
            class="hover:text-ink-cream transition-colors"
          >
            <UIcon name="i-lucide-instagram" class="size-5" />
          </a>
          <a
            href="https://tiktok.com/@inkmade"
            target="_blank"
            rel="noopener"
            aria-label="TikTok"
            class="hover:text-ink-cream transition-colors"
          >
            <UIcon name="i-lucide-music-2" class="size-5" />
          </a>
        </div>
      </div>
    </div>
    <div class="border-t border-white/10">
      <div class="mx-auto max-w-(--container-max) px-4 py-4 ink-label text-ink-cream/40">
        {{ $t('footer.copyright') }}
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-link {
  display: inline-block;
  position: relative;
  transition: color var(--dur-fast) var(--ease-out);
}
.footer-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -1px;
  height: 1px;
  width: 100%;
  background: var(--color-ink-cream);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur-base) var(--ease-out);
}
.footer-link:hover {
  color: var(--color-ink-cream);
}
.footer-link:hover::after {
  transform: scaleX(1);
}
</style>
