import { Chat } from './types'

const HOUR = 60 * 60 * 1000

function chatAt(id: string, title: string, hoursAgo: number, exchange: [string, string]): Chat {
  const createdAt = Date.now() - hoursAgo * HOUR
  return {
    id,
    title,
    updatedAt: createdAt,
    messages: [
      { id: `${id}-1`, role: 'user', content: exchange[0], createdAt },
      { id: `${id}-2`, role: 'assistant', content: exchange[1], createdAt: createdAt + 4000 }
    ]
  }
}

export function seedChats(): Chat[] {
  return [
    chatAt('seed-1', 'Weekend trip to Lisbon', 2, [
      'Can you put together a loose 3-day itinerary for Lisbon, mostly food and walking, no museums?',
      "Here's a loose 3-day pass through Lisbon — Alfama and a pastel de nata stop on day one, Belém and the river on day two, LX Factory and Bairro Alto at night on day three. Want me to slot in specific restaurants?"
    ]),
    chatAt('seed-2', 'Draft reply to Sam re: contract', 20, [
      'Draft a short reply to Sam confirming the contract terms we discussed, keep it casual.',
      "Draft ready — kept it to three short paragraphs, confirmed the rate and start date, left the deliverables section open since you said that's still moving. Want me to tighten it further?"
    ]),
    chatAt('seed-3', 'Debugging notes: flaky test', 30, [
      "This test passes locally but fails in CI about 1 in 5 runs, any ideas what to check first?",
      "Most likely a race condition or a shared-state leak between tests. I'd start by checking test order dependence — run the suite with randomized ordering locally and see if it reproduces."
    ]),
    chatAt('seed-4', 'Summarize the Q3 planning doc', 50, [
      'Can you summarize the key decisions from this planning doc into five bullets?',
      "Five bullets: scope frozen for Q3, two features cut to Q4, one new hire approved for platform, budget flat vs Q2, and the review cadence moves to biweekly."
    ]),
    chatAt('seed-5', 'Explain this regex', 90, [
      'What does this regex actually match: ^(?=.*[A-Z])(?=.*\\d).{8,}$',
      "It matches strings that are at least 8 characters long, contain at least one uppercase letter, and at least one digit — a typical password-strength check, using lookaheads so it doesn't care about order or position."
    ])
  ]
}
