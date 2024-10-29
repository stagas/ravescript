import { Login } from '~/src/comp/Login.tsx'
import { OAuthLogin } from '~/src/comp/OAuthLogin.tsx'
import { Register } from '~/src/comp/Register.tsx'

export function LoginOrRegister() {
  return <div class="flex flex-col items-center">
    <div class="flex flex-col sm:flex-row flex-wrap gap-8">
      <Login />
      <span class="self-center italic">or</span>
      <Register />
    </div>

    <OAuthLogin />
  </div>
}
