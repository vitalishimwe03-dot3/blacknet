<template>
  <div class="p-4 lg:p-6 space-y-6">
    <div>
      <h1 class="text-xl font-bold text-bn-text font-mono">&#9783; Anonymous Chat Rooms</h1>
      <p class="text-sm text-bn-muted font-mono">Pseudonymous, topic-based conversations</p>
    </div>

    <!-- Create room -->
    <div class="card p-5">
      <h2 class="text-sm font-semibold text-bn-text font-mono mb-3">Create a Room</h2>
      <div class="flex flex-col sm:flex-row gap-2">
        <input v-model="roomName" class="input font-mono text-sm flex-1" placeholder="Room name" />
        <input v-model="roomDesc" class="input font-mono text-sm flex-1" placeholder="Description" />
        <button @click="createRoom" :disabled="!roomName.trim()" class="btn-primary font-mono text-sm">Create</button>
      </div>
    </div>

    <!-- Chat rooms list -->
    <div class="grid lg:grid-cols-2 gap-4">
      <div v-for="room in rooms" :key="room.id" class="card-hover p-5 cursor-pointer" @click="joinRoom(room)">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-bn-accent/10 border border-bn-accent/20 flex items-center justify-center text-xl text-bn-accent">
            &#9783;
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-bn-text">{{ room.name }}</h3>
            <p class="text-sm text-bn-muted mt-0.5 truncate">{{ room.description || 'Anonymous chat room' }}</p>
            <div class="flex items-center gap-3 mt-2">
              <span class="text-xs text-bn-green font-mono">&#9679; {{ room.online_count || 0 }} online</span>
              <span class="text-xs text-bn-muted font-mono">{{ room.participant_count || 0 }} participants</span>
              <span v-if="room.is_participant" class="text-xs text-bn-cyan font-mono">joined</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!rooms.length" class="text-center py-12">
      <p class="text-bn-muted font-mono text-sm">No chat rooms yet. Create one above.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api'

const router = useRouter()
const rooms = ref([])
const roomName = ref('')
const roomDesc = ref('')

async function fetchRooms() {
  const { data } = await api.get('/chat-rooms')
  rooms.value = data.rooms
}

async function createRoom() {
  if (!roomName.value) return
  const { data } = await api.post('/chat-rooms', {
    name: roomName.value,
    description: roomDesc.value,
  })
  roomName.value = ''
  roomDesc.value = ''
  router.push(`/chat-rooms/${data.room.id}`)
}

function joinRoom(room) {
  router.push(`/chat-rooms/${room.id}`)
}

onMounted(fetchRooms)
</script>