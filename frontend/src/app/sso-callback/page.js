import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallbackPage() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#ffffff', fontFamily: 'sans-serif' }}>
      <AuthenticateWithRedirectCallback />
    </div>
  )
}
