import { Sigui } from 'sigui'
import * as actions from '~/src/rpc/auth.ts'

export function VerifyEmail() {
  using $ = Sigui()

  const info = $({
    isVerified: false,
    error: ''
  })

  const token = new URLSearchParams(location.search).get('token')
  if (!token) return <div>Token not found</div>

  actions
    .verifyEmail(token)
    .then(() => info.isVerified = true)
    .catch(err => info.error = err.message)

  return <div>{
    () => info.isVerified
      ?
      <div>
        Your email has been verified! You can now <a href="/">proceed</a>.
      </div>
      : info.error
      || 'Loading...'
  }</div>
}
