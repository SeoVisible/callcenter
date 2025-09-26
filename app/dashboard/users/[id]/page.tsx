// Server wrapper page — forwards to client component
import ClientPage from './ClientPage'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Next passes params as a Promise in the App Router typing. Await it.
  const { id } = await params
  return <ClientPage params={{ id }} />
}
