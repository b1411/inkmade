<script setup lang="ts">
// Футер (§5.11): тёмный, структурированный — лого+слоган, колонки ссылок,
// соцсети, копирайт-дисклеймер. grain для фактуры, mono-лейблы колонок.
import { LEGAL, SELLER } from '~~/shared/config/legal'
// «Личный кабинет» показываем только авторизованным — иначе гостя кидает на логин.
const { isAuthenticated } = useAuth()
</script>

<template>
  <footer class="ink-grain bg-ink-black text-ink-cream/70 mt-24">
    <div
      class="mx-auto max-w-(--container-max) px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
      style="padding-block: var(--section-pad)"
    >
      <div>
        <img src="/logo-light.svg" alt="INKMADE" width="1328" height="305" class="h-7 w-auto">
        <p class="ink-label mt-2 text-ink-cream/50">{{ $t('footer.tagline') }}</p>
        <p class="text-caption mt-3">{{ $t('footer.about') }}</p>
      </div>
      <div class="space-y-2">
        <p class="ink-label text-ink-cream/60">{{ $t('footer.catalogCol') }}</p>
        <NuxtLink to="/catalog" class="footer-link block text-caption">{{ $t('footer.allCategories') }}</NuxtLink>
        <NuxtLink to="/cart" class="footer-link block text-caption">{{ $t('footer.cart') }}</NuxtLink>
        <ClientOnly>
          <NuxtLink v-if="isAuthenticated" to="/account" class="footer-link block text-caption">{{ $t('footer.account') }}</NuxtLink>
        </ClientOnly>
      </div>
      <div class="space-y-2">
        <p class="ink-label text-ink-cream/60">{{ $t('footer.infoCol') }}</p>
        <NuxtLink to="/legal/offer" class="footer-link block text-caption">{{ $t('footer.offer') }}</NuxtLink>
        <NuxtLink to="/legal/terms" class="footer-link block text-caption">{{ $t('footer.terms') }}</NuxtLink>
        <NuxtLink to="/legal/privacy" class="footer-link block text-caption">{{ $t('footer.privacy') }}</NuxtLink>
        <NuxtLink to="/legal/cookies" class="footer-link block text-caption">{{ $t('footer.cookies') }}</NuxtLink>
        <NuxtLink to="/legal/delivery" class="footer-link block text-caption">{{ $t('footer.delivery') }}</NuxtLink>
        <NuxtLink to="/legal" class="footer-link block text-caption">{{ $t('footer.allDocs') }}</NuxtLink>
      </div>
      <div class="space-y-2">
        <p class="ink-label text-ink-cream/60">{{ $t('footer.contactsCol') }}</p>
        <a :href="`mailto:${LEGAL.supportEmail}`" class="footer-link block text-caption">{{ LEGAL.supportEmail }}</a>
        <a v-if="SELLER.isFilled" :href="`tel:${SELLER.phone.replace(/\s/g, '')}`" class="footer-link block text-caption">{{ SELLER.phone }}</a>
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
      <div class="mx-auto max-w-(--container-max) px-4 py-4 space-y-1">
        <!-- Реквизиты продавца — показываем, когда заполнены (Закон РК «О защите прав потребителей», ст. 25) -->
        <p v-if="SELLER.isFilled" class="text-caption text-ink-cream/60">
          {{ SELLER.entityType }} {{ SELLER.legalName }} · {{ $t('footer.bin') }} {{ SELLER.bin }} · {{ SELLER.address }} · {{ SELLER.phone }}
        </p>
        <p v-if="SELLER.isFilled" class="text-caption text-ink-cream/60">{{ $t('footer.payment') }}</p>
        <p class="ink-label text-ink-cream/60">{{ $t('footer.copyright') }}</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-link {
  /* block + fit-content: ссылки встают в столбик (раньше inline-block перебивал
     утилиту `block` → «Все категорииКорзина» слипались), подчёркивание ::after
     остаётся по ширине текста. */
  display: block;
  width: fit-content;
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
