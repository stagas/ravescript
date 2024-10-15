import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide'
import { Sigui, refs, type Signal } from 'sigui'
import { icon } from '~/lib/icon.ts'
import type { RemoteSdp } from '~/src/pages/Chat/Chat.tsx'
import * as actions from '~/src/rpc/chat.ts'

const pcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
}

function VideoButton(props: Record<string, any>) {
  return <button class="border-none bg-white-500 bg-opacity-40 hover:bg-opacity-80 cursor-pointer" onclick={props.onclick}>
    {props.children}
  </button>
}

export function VideoCall({ type, targetNick, remoteSdp }: {
  type: Signal<null | 'offer' | 'answer'>,
  targetNick: Signal<null | string>,
  remoteSdp: Signal<RemoteSdp | null>
}) {
  using $ = Sigui()

  const info = $({
    type,
    targetNick,
    remoteSdp,

    localVideoStream: null as null | MediaStream,
    remoteVideoStream: null as null | MediaStream,
    pc: null as null | RTCPeerConnection,

    cameraOn: true,
    micOn: true,
  })

  const el = <div class='top-0 left-0 absolute flex w-[100dvw] h-[100dvh]'>
    <div class='w-[70dvw] relative h-[calc(100%-10dvh)] m-auto p-4 border-8 border-neutral-700 bg-black flex items-center justify-center'>
      <video
        ref='remoteVideo'
        class="h-full"
        srcObject={() => info.remoteVideoStream}
        style="image-rendering: pixelated"
        autoplay
      />
      <div class="absolute z-10 w-full right-0 bottom-0 p-8 flex items-end justify-between">
        <div class="flex justify-between gap-1">
          <VideoButton onclick={() => info.cameraOn = !info.cameraOn}>
            {() => icon(info.cameraOn ? Video : VideoOff)}
          </VideoButton>
          <VideoButton onclick={() => info.micOn = !info.micOn}>
            {() => icon(info.micOn ? Mic : MicOff)}
          </VideoButton>
          <VideoButton onclick={() => info.type = info.targetNick = null}>
            {icon(PhoneOff)}
          </VideoButton>
        </div>
        <video
          ref='localVideo'
          srcObject={() => info.localVideoStream}
          autoplay
          muted
          style="image-rendering: pixelated"
          class='w-[20dvw] border-8 border-neutral-700 pointer-events-none'
        />
      </div>
    </div>
  </div>

  const localVideo = refs.localVideo as HTMLVideoElement

  async function startLocalVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { exact: 100 },
        height: { exact: 50 },
      },
      audio: true,
    })
    info.localVideoStream = stream
    await localVideo.play()
  }

  startLocalVideo()

  function createPc(stream: MediaStream) {
    const pc = new RTCPeerConnection(pcConfig)
    pc.addEventListener('track', (ev) => {
      if (ev.track.kind === 'video') {
        info.remoteVideoStream = ev.streams[0]
      }
    })
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream)
    }
    return pc
  }

  $.fx(() => {
    const { type, localVideoStream: stream, targetNick } = $.of(info)
    $()
    if (type === 'offer') {
      const pc = info.pc = createPc(stream)
      pc.createOffer()
        .then(offer => {
          pc.setLocalDescription(offer)
          actions.sendMessageToUser('webrtc:offer', targetNick, offer.sdp)
        })
    }
  })

  $.fx(() => {
    const { type, localVideoStream: stream, targetNick, remoteSdp } = $.of(info)
    $()
    if (type === 'answer') {
      const pc = createPc(stream)
      const theirOffer = new RTCSessionDescription({
        type: 'offer',
        sdp: remoteSdp.text,
      })
      pc.setRemoteDescription(theirOffer)
      pc.createAnswer()
        .then(answer => {
          pc.setLocalDescription(answer)
          pc.addEventListener('icecandidate', (ev) => {
            if (ev.candidate !== null) return
            actions.sendMessageToUser('webrtc:answer', targetNick, pc.localDescription!.sdp)
          })
        })
    }
    else if (type === 'offer') {
      const theirAnswer = new RTCSessionDescription({
        type: 'answer',
        sdp: remoteSdp.text,
      })
      info.pc?.setRemoteDescription(theirAnswer)
    }
  })

  $.fx(() => () => {
    info.localVideoStream?.getTracks().forEach(track => track.stop())
    info.remoteVideoStream?.getTracks().forEach(track => track.stop())
    info.pc?.close()
    info.remoteSdp =
      info.localVideoStream =
      info.remoteVideoStream =
      info.pc =
      null
  })

  return el
}
