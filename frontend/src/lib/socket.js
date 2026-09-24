import { io } from 'socket.io-client'
import { API_ORIGIN } from '../api/axios'

// One authenticated connection per signed-in session, shared by chat and notifications
let socket = null

export function getSocket() {
  const token = localStorage.getItem('cms_token')
  if (!token) return null
  if (socket && socket.auth?.token === token) return socket
  socket?.disconnect()
  socket = io(API_ORIGIN, { auth: { token } })
  return socket
}

export function closeSocket() {
  socket?.disconnect()
  socket = null
}
