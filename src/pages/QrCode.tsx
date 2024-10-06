import { encodeData, generateSVGQRCode } from 'easygenqr'
import { Sigui } from 'sigui'
import { state } from '~/src/state.ts'

export function QrCode() {
  using $ = Sigui()

  const info = $({
    qrCode: <div class="w-40 h-40 fixed left-[calc(50%-5rem)] top-[calc(50%-5rem)] rounded-xl overflow-hidden" />,
  })

  $.fx(() => {
    const { url } = state
    $()
    const qr = encodeData({
      text: url.href,
      errorCorrectionLevel: 2
    })
    info.qrCode.innerHTML = generateSVGQRCode(qr, {
      bgColor: "#ccc",
      dotColor: "#333",
      dotMode: 1,
      markerColor: "#333",
      markerMode: 1,
    })
  })

  return <div>
    {info.qrCode}
  </div>
}
