<script setup lang="ts">
import { darkTheme, NConfigProvider, NDialogProvider, NMessageProvider } from 'naive-ui'
import { onMounted, ref } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import TopBar from '@/components/topbar/TopBar.vue'
import LoaderPanel from '@/components/loader/LoaderPanel.vue'
import RealtimeEventsPane from '@/components/events/RealtimeEventsPane.vue'
import EntityBoard from '@/components/entity/EntityBoard.vue'
import CommandDock from '@/components/command/CommandDock.vue'
import MapPane from '@/components/map/MapPane.vue'
import ConnectionBanners from '@/components/status/ConnectionBanners.vue'
import { useWorkbench } from '@/composables/useWorkbench'
import { useSessionStore } from '@/stores/sessionStore'

const loaderOpen = ref(true), session = useSessionStore(), workbench = useWorkbench()
onMounted(() => workbench.boot())
async function build() { await workbench.build(); if (session.sessionState === 'READY') loaderOpen.value = false }
</script>

<template>
  <NConfigProvider :theme="darkTheme">
    <NDialogProvider><NMessageProvider>
      <AppShell>
        <template #top><TopBar @open-loader="loaderOpen = true" /></template>
        <template #events><RealtimeEventsPane /></template>
        <template #map><MapPane /></template>
        <template #entities><EntityBoard /></template>
        <template #dock><CommandDock /></template>
      </AppShell>
      <ConnectionBanners />
      <LoaderPanel v-model:open="loaderOpen" @build="build" />
    </NMessageProvider></NDialogProvider>
  </NConfigProvider>
</template>
