<script setup lang="ts">
// Политика конфиденциальности (§6, §10).
import { LEGAL, THIRD_PARTIES } from '~~/shared/config/legal'
useHead({ title: 'Политика конфиденциальности — INKMADE' })
</script>

<template>
  <article class="max-w-2xl mx-auto py-8 space-y-5">
    <h1 class="ink-display text-h2">Политика конфиденциальности</h1>
    <p class="text-caption text-ink-gray-400 font-mono uppercase tracking-wider">
      Редакция {{ LEGAL.privacyVersion }} · в силе с {{ LEGAL.effectiveDate }} · юрисдикция: {{ LEGAL.jurisdiction }}
    </p>

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
      <h2 class="text-h3 font-bold">Аналитика, реклама и передача третьим лицам</h2>
      <p>Мы используем веб-аналитику и рекламные пиксели для измерения эффективности рекламы. При этом
        обезличенные данные о действиях на сайте передаются перечисленным ниже сервисам. Серверы части
        из них находятся за пределами {{ LEGAL.jurisdiction }} — это трансграничная передача данных,
        осуществляемая на основании вашего согласия.</p>
      <ul class="space-y-1 mt-2">
        <li v-for="tp in THIRD_PARTIES" :key="tp.name" class="text-caption text-ink-gray-600">
          <span class="font-semibold text-ink-black">{{ tp.name }}</span> ({{ tp.country }}) — {{ tp.purpose }}
        </li>
      </ul>
    </section>

    <section class="space-y-2">
      <h2 class="text-h3 font-bold">Ваши права</h2>
      <p>Вы можете запросить доступ к своим данным, их исправление или удаление, а также отозвать
        согласие на обработку, написав на
        <a :href="`mailto:${LEGAL.supportEmail}`" class="text-ink-burgundy font-semibold">{{ LEGAL.supportEmail }}</a>.</p>
    </section>

    <NuxtLink to="/" class="text-ink-burgundy inline-flex items-center gap-1"><UIcon name="i-lucide-arrow-left" class="size-4" />На главную</NuxtLink>
  </article>
</template>
