<script setup lang="ts">
// Политика конфиденциальности (§6, §10).
useHead({ title: 'Политика конфиденциальности — INKMADE' })
</script>

<template>
  <article class="max-w-2xl mx-auto py-8 space-y-5">
    <h1 class="ink-display text-h2">Политика конфиденциальности</h1>

    <section class="space-y-2">
      <h2 class="text-h3 font-bold">Какие данные мы собираем</h2>
      <p>Email и имя при регистрации, контакты и адрес доставки при оформлении заказа, загруженные
        макеты и собранные дизайны, история заказов.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-h3 font-bold">Как используем</h2>
      <p>Для выполнения и доставки заказов, связи по заказу, улучшения сервиса. Данные хранятся в
        защищённой инфраструктуре с разграничением доступа.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-h3 font-bold">Аналитика и реклама</h2>
      <p>Мы используем веб-аналитику и рекламные пиксели для измерения эффективности рекламы. Эти
        сервисы могут собирать обезличенные данные о действиях на сайте.</p>
    </section>

    <section class="space-y-2">
      <h2 class="text-h3 font-bold">Ваши права</h2>
      <p>Вы можете запросить доступ к своим данным или их удаление, написав в поддержку.</p>
    </section>

    <NuxtLink to="/" class="text-ink-burgundy inline-flex items-center gap-1"><UIcon name="i-lucide-arrow-left" class="size-4" />На главную</NuxtLink>
  </article>
</template>
