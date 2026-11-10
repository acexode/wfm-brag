/** Narration, one entry per beat. Scenes speak these while performing the matching actions. */
export const N = {
  s00: {
    b1: 'Every contact center runs on a simple promise: the right people, in the right seat, at the right time. Workforce management software is how that promise gets kept.',
    b2: "But the leading tools, like NICE, Genesys and Assembled, were built for in-house teams that staff to a service level. Outsourcers don't work that way.",
    b3: 'One client pays for forty seats, nine to five. Another sends a staffing grid every week, and penalizes every fifteen-minute interval you miss. A third pays per ticket. So planners rebuild the real requirement in spreadsheets, outside the system.',
    b4: "Kasuwa makes the contract the source of truth. Each campaign defines what correctly staffed means, and forecasting, scheduling, publishing and compliance all follow it. Let's take a look.",
  },
  s01: {
    b1: 'This is Meridian Contact Solutions, an outsourcer serving several clients. Each customer signs in to its own workspace.',
    b2: "Every workspace is isolated at the database level, with row-level security. One tenant can never see another's people, schedules or clients.",
  },
  s02: {
    b1: 'Here are Meridian\'s clients. Notice that each one runs on a different operating model: a telecom that buys a service level, a healthcare line that buys seats, a retailer that pays for work done.',
    b2: "Let's onboard a new client, Northwind Delivery, with a voice support campaign.",
    b3: "Every campaign carries an effective-dated contract. We set the interval, the time zone, shrinkage, and whether the client's requirement is locked.",
    b4: 'And here is the key decision. What does correctly staffed mean for this client? Service level. Headcount. Interval compliance. Or ticket workload.',
    b5: "Northwind measures us on every fifteen-minute interval, so we apply interval compliance. Kasuwa sets up the matching requirement source, and the policies we'll be judged on, with warning and breach thresholds.",
    b6: 'Every other screen now adapts to this one choice. Legacy workforce tools have no concept of the contract at all.',
  },
  s03: {
    b1: 'Next, we link the campaign to its voice queue.',
    b2: 'Northwind sends its staffing requirement as a spreadsheet. The import wizard takes any layout.',
    b3: 'We tell it how the file is shaped: the orientation, how dates and times are written, and what the numbers mean.',
    b4: 'Before anything is committed, we see exactly what changed, any rejected rows, and how many people this demand actually needs, by week, by queue, and by hour.',
    b5: 'We commit, and the grid is versioned. Every change the client sends is traceable.',
  },
  s04: {
    b1: 'Not every client sends a grid. Brightline Telecom pays for a service level, so here, Kasuwa forecasts demand itself.',
    b2: 'We run the forecast. Weeks of history become an interval-by-interval prediction, with a confidence band.',
    b3: 'Volume becomes staffing by channel: Erlang C for voice, Erlang with concurrency for chat, and a workload model for email, which many tools get wrong. Required versus scheduled, the gap, and the projected service level, all in one place.',
    b4: "Planners can add a special event, like a product launch, and the forecast re-runs instantly. Any interval can be overridden, with a reason that's audited.",
    b5: 'And forecast accuracy is tracked continuously, so you know when to trust the numbers.',
  },
  s05: {
    b1: 'Back to Northwind. The team is assigned and the shift templates are ready. One click on Generate.',
    b2: 'In seconds, Kasuwa builds the full week. It respects skills, queues, labor rules and fairness, keeps crews together across the week, groups days off, and places breaks where coverage can afford them.',
    b3: "The coverage heatmap shows where we're under or over the client's requirement, interval by interval.",
    b4: "Zoom into a single day, and every agent's activities are laid out: queue time, breaks, and lunch.",
    b5: 'Planners stay in control. Every edit is checked live against the labor rules and the coverage.',
    b6: 'And before anything goes out, Publish checks the schedule against the client\'s contract, policy by policy. You find the breach before the client does.',
  },
  s06: {
    b1: 'This is where an account manager prepares for the quarterly business review. Every grid the client sends is stored, versioned, and viewable as of any date.',
    b2: "The policies come straight from the contract, so the schedule is measured against the client's own definition of success.",
    b3: 'And where data is missing, Kasuwa says not measurable, instead of inventing a number.',
  },
  s07: {
    b1: "Here's Meridian's whole workforce: skills, queues, sites and teams, as a table, a board, or grouped by site.",
    b2: 'Filter, select, and reassign skills or queues in bulk. Onboard hundreds of agents from a single CSV.',
    b3: 'An agent can work across several campaigns, and Kasuwa prevents double-booking across every schedule in the business.',
  },
  s08: {
    b1: 'On the floor, supervisors see adherence live. Kasuwa compares what each agent is doing with what they were scheduled to do.',
    b2: 'Queue staffing against need, wait times, and trends, all update in real time.',
    b3: "When someone drifts out of adherence, a breach is raised after a grace period, and the right people are alerted. Legitimate exceptions, like a system outage, are recorded, so agents aren't penalized.",
  },
  s09: {
    b1: "Phone systems only see agents while they're on a call. Kasuwa's lightweight desktop collector shows what happens in between.",
    b2: 'Open any agent, and their day is laid directly against the schedule: desktop evidence, the application in focus, and session events, down to the minute.',
    b3: 'Devices enroll with a one-time token, and every sign-in is mapped to an agent.',
    b4: "And it's private by design. No keystrokes. Window titles need a stated purpose and a separate permission, and every access is logged. Agents see their own day, and can request corrections.",
  },
  s10: {
    b1: "Now, the agent's view. Amara signs in and sees her schedule the moment it's published.",
    b2: "When we're overstaffed, voluntary time off is offered, and she can claim it in one click.",
    b3: 'Leave requests are checked against her live balance, and auto-approve when coverage allows.',
    b4: 'Teammates can swap shifts with her in a click. In contact centers, attrition is the biggest cost of all. Giving agents control of their own schedule is how you bring it down.',
  },
  s11: {
    b1: 'Many operations also split work across outsourcing partners. Kasuwa tracks what each vendor committed against what they actually staffed, week by week.',
    b2: 'And vendor users sign in and see only their own data.',
  },
  s12: {
    b1: 'Finally, governance. Seven role levels, with a clear permissions matrix.',
    b2: 'Labor rules are configuration, not code: minimum rest, consecutive days, overtime caps, and auto-approval thresholds.',
    b3: 'Notifications go to Slack and email, and every change is captured in the audit log.',
  },
  s13: {
    b1: 'So, how is Kasuwa different? NICE and Genesys are excellent if your phones already run on their platform, and you staff to a service level. Assembled is strong for in-house digital support teams.',
    b2: "None of them was designed for the operator running twenty clients under twenty different contracts. That's the outsourcing industry, and today, it plans in spreadsheets.",
    b3: "Kasuwa models the contract, proves compliance before the client measures it, shows what really happens between calls, and isn't tied to any phone system.",
  },
  s14: {
    b1: "Everything you've seen is live today. Next, we connect natively to the phone and ticketing systems our customers already use, add AI forecasting and an agent copilot, and roll out enterprise single sign-on.",
    b2: 'The outsourcing industry has been planning in spreadsheets, because no workforce tool spoke its language. Kasuwa does.',
  },
} as const;
