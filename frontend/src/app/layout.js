import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import AppShell from './components/AppShell'
import { ThemeProvider } from './lib/ThemeContext'
import './globals.css'

export const metadata = {
  title: 'trackeD — Social Media Analytics',
  description: 'Real-time social media metrics and video analytics tracker for TikTok, YouTube, and Facebook.',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
          socialButtonsVariant: 'blockButton',
          socialButtonsPlacement: 'top',
        },
        variables: {
          colorPrimary: '#ffffff',
          colorBackground: '#121215',
          colorInputBackground: '#18181b',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#a1a1aa',
          colorTextOnPrimaryBackground: '#09090b',
          borderRadius: '10px',
        },
        elements: {
          card: {
            backgroundColor: '#121215',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.95)',
          },
          socialButtonsIconButton__tiktok: { display: 'none' },
          socialButtonsBlockButton__tiktok: { display: 'none' },
          footerAction: { display: 'none' },
          footerActionText: { display: 'none' },
          footerActionLink: { display: 'none' },
          footer: { display: 'none' },
          headerTitle: {
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '19px',
          },
          headerSubtitle: {
            color: '#d4d4d8',
            fontSize: '13px',
          },
          formFieldLabel: {
            color: '#f4f4f5',
            fontSize: '13px',
            fontWeight: 600,
          },
          dividerText: {
            color: '#a1a1aa',
            fontSize: '12px',
          },
          formFieldHintText: {
            color: '#a1a1aa',
            fontSize: '12px',
          },
          formFieldWarningText: {
            color: '#facc15',
            fontSize: '12px',
          },
          formFieldErrorText: {
            color: '#f87171',
            fontSize: '12px',
          },
          formFieldSuccessText: {
            color: '#4ade80',
            fontSize: '12px',
          },
          formFieldInput: {
            backgroundColor: '#18181b',
            borderColor: '#3f3f46',
            color: '#ffffff',
          },
          formButtonPrimary: {
            backgroundColor: '#ffffff',
            color: '#09090b',
            fontWeight: 700,
            fontSize: '14px',
            '&:hover': {
              backgroundColor: '#f4f4f5',
            },
          },
          socialButtonsBlockButton: {
            backgroundColor: '#18181b',
            border: '1px solid #3f3f46',
            color: '#ffffff',
            '&:hover': {
              backgroundColor: '#27272a',
            },
          },
          socialButtonsBlockButtonText: {
            color: '#ffffff',
            fontWeight: 600,
          },
          dividerLine: {
            backgroundColor: '#27272a',
          },
          dividerText: {
            color: '#71717a',
            fontSize: '12px',
          },
          footerActionText: {
            color: '#a1a1aa',
          },
          footerActionLink: {
            color: '#ffffff',
            fontWeight: 600,
            textDecoration: 'underline',
          },
        },
      }}
    >
      <html lang="en" data-theme="dark" suppressHydrationWarning>
        <body>
          <ThemeProvider>
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}