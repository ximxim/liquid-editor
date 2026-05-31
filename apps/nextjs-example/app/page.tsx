'use client'

import dynamic from 'next/dynamic'

const LiquidRenderer = dynamic(
  () => import('@liquid-ai/renderer').then((mod) => ({ default: mod.LiquidRenderer })),
  { ssr: false }
)

export default function Page() {
  return <LiquidRenderer />
}
