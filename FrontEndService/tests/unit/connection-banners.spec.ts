import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import ConnectionBanners from '@/components/status/ConnectionBanners.vue'
import { useConnectionStore } from '@/stores/connectionStore'
import { useSessionStore } from '@/stores/sessionStore'

// R17 rev-4 UI-BANNER oracle: the Stage-1 backend creates its worker (and
// accepts the control handshake) only after START, so a disconnected control
// WS during pre-START states is the designed condition and must never be
// reported as stale committed state; a real RUNNING disconnect still is.
describe('control banner gating', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it.each(['EMPTY', 'LOADING', 'BUILDING', 'READY'] as const)(
    'renders no stale-control banner while disconnected in %s',
    (state) => {
      const connection = useConnectionStore()
      const session = useSessionStore()
      connection.control = 'disconnected'
      session.sessionState = state
      const wrapper = mount(ConnectionBanners)
      expect(wrapper.text()).not.toContain('last committed state is stale')
    }
  )
  it('still renders the stale-control banner on a RUNNING disconnect', () => {
    const connection = useConnectionStore()
    const session = useSessionStore()
    connection.control = 'disconnected'
    session.sessionState = 'RUNNING'
    const wrapper = mount(ConnectionBanners)
    expect(wrapper.text()).toContain('last committed state is stale')
  })
})
