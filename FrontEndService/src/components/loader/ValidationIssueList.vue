<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '@/stores/sessionStore'
const session = useSessionStore()
const issues = computed(() => Object.values(session.slots).flatMap((slot) => [...(slot.report?.errors ?? []), ...(slot.report?.warnings ?? [])]))
</script>
<template>
  <section class="issues">
    <h3>Validation issues <span>{{ issues.length }}</span></h3>
    <div v-if="!issues.length" class="no-issues">✓ No validation issues in the current revisions.</div>
    <div v-else class="issue-list scroll">
      <article v-for="item in issues" :key="`${item.document_kind}-${item.code}-${item.json_pointer}`" :class="item.severity">
        <div><strong>{{ item.code }}</strong><span>{{ item.document_kind }} {{ item.json_pointer }}</span></div><p>{{ item.message }}</p>
      </article>
    </div>
  </section>
</template>
<style scoped>.issues { min-height: 0; padding: 14px; background: #081522; border: 1px solid var(--line); border-radius: 5px; }.issues h3 { display: flex; justify-content: space-between; margin: 0 0 12px; color: #aac3d4; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }.issues h3 span { color: var(--muted); }.no-issues { padding: 18px 6px; color: var(--green); }.issue-list { max-height: 235px; }.issue-list article { padding: 9px; margin-bottom: 7px; border-left: 3px solid; background: #101e2c; }.issue-list article.error { border-color: var(--red); }.issue-list article.warning { border-color: var(--amber); }.issue-list div { display: flex; justify-content: space-between; gap: 8px; }.issue-list strong { font-size: 10px; }.issue-list span { color: var(--muted); font: 9px monospace; }.issue-list p { margin: 5px 0 0; color: #bfd0dc; font-size: 11px; }</style>
