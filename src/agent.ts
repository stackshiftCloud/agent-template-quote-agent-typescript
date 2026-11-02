import { readFile } from 'node:fs/promises'
import { agent } from '@stackshift-cloud/agent'

interface Price {
  unit?: string
  price: string
  currency: string
}

interface PriceList {
  deliveryDays?: number
  items: Record<string, Price>
}

interface Line {
  description: string
  quantity: string
  unit?: string
}

interface Message {
  id: string
  direction: string
  type: string
  items?: Line[]
}

const prices = JSON.parse(await readFile(new URL('../prices.json', import.meta.url), 'utf8')) as PriceList
const scale = 1_000_000n

const handToOwner = agent.action('hand_to_owner', async (details: { thread_id: string; reason: string }) => {
  return { handed_over: details.thread_id }
})

function quoteFor(lines: Line[]) {
  const currencies = new Set<string>()
  const priced = lines.map((line) => {
    const entry = prices.items[line.description.trim().toLowerCase()]
    if (!entry) return null
    currencies.add(entry.currency)
    const [whole, fraction = ''] = line.quantity.split('.')
    const quantity = BigInt(whole) * scale + BigInt(fraction.padEnd(6, '0'))
    const amount = BigInt(entry.price)
    return { line, entry, subtotal: (quantity * amount + scale / 2n) / scale }
  })
  if (lines.length === 0 || priced.includes(null) || currencies.size !== 1 || prices.deliveryDays === undefined) return null
  const [currency] = currencies
  const total = priced.reduce((sum, item) => sum + item!.subtotal, 0n)
  return {
    items: priced.map((item) => ({ description: item!.line.description, quantity: item!.line.quantity, unit: item!.line.unit ?? item!.entry.unit, unit_price: { amount: item!.entry.price, currency } })),
    total: { amount: total.toString(), currency },
  }
}

agent.on('agreement.offer_received', async ({ data }) => {
  const threadId = data.thread_id
  const { messages } = await agent.agreements.inspect<{ messages: Message[] }>(threadId)
  const request = messages.filter((message) => message.direction === 'in' && message.type === 'ask_quote').at(-1)
  const quote = request?.items ? quoteFor(request.items) : null
  if (!request || !quote) {
    await handToOwner({ thread_id: threadId, reason: 'The request has something the price list does not cover.' })
    return
  }
  const deliveryBy = new Date(Date.now() + (prices.deliveryDays ?? 0) * 86_400_000).toISOString().slice(0, 10)
  await agent.agreements.propose({ type: 'quote', thread_id: threadId, in_reply_to: request.id, items: quote.items, total: quote.total, delivery_by: deliveryBy })
})

await agent.start()
