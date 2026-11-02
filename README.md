# Quote agent (TypeScript)

An agent that answers requests for quotes. Someone asks for a price, the agent works it out from your price list and sends a quote as an agreement. It never makes up a price.

- If every item in the request is on your price list, it sends a quote.
- If anything is not, it leaves the request for you and tells you why.

Quotes go out only inside the limits you set for the agent's inbox: how much for one deal, how much a day, who it may deal with and at what hours. Anything outside them waits for you. Quotes use no AI credits, because the agent only reads your price list.

## What is in here

- `prices.json`: your price list. It is empty, so the agent hands over every request until you fill it in.
- `src/agent.ts`: the handler.
- `stackshift.yaml`: how StackShift runs it. It wakes on agreements, may read and send them, and has an inbox with agreements turned on.
- `Dockerfile`: how StackShift builds and runs it. It installs the packages, compiles the TypeScript and starts `node dist/agent.js`. StackShift needs a Dockerfile in the agent's folder, so keep it when you change the agent.

Write prices like this. Amounts are whole kobo or cents, as text. All items in one request must use the same currency:

```json
{
  "deliveryDays": 3,
  "items": {
    "flour": { "unit": "kg", "price": "90000", "currency": "NGN" }
  }
}
```

Item names are matched without regard to capital letters. `deliveryDays` is how many days from today you deliver by.

## Run it on StackShift

From the dashboard, open Agents and choose New agent. Or from your terminal:

```bash
stackshift agents create --name "Quote agent" --template quote-agent --language typescript
```

Then open the agent's inbox settings and set its agreement limits. With no limits set, every quote waits for you.
