/** Plain-language explanations shared by the info buttons and the Help page. */
export const HELP = {
  rti: {
    title: "What is an RTI request?",
    body: "The Right to Information Act, 2005 lets any Indian citizen ask a public authority for information it holds. You don't have to give a reason (section 6(2)).",
  },
  publicAuthority: {
    title: "Which public authority?",
    body: "Choose the central ministry or department that holds the records. If you pick the wrong one, its nodal officer can transfer your request within 5 days (section 6(3)). State and municipal offices aren't covered here.",
  },
  stateBodies: {
    title: "Why not state offices?",
    body: "This portal covers central government authorities only. Requests for state government, municipal or panchayat offices go to the state's own RTI system. The real RTI Online portal returns them without refunding the fee.",
  },
  fee: {
    title: "The ₹10 fee",
    body: "The RTI Rules, 2012 set a ₹10 application fee (rule 3). There is no fee for a first appeal.",
  },
  bpl: {
    title: "Below poverty line (BPL)",
    body: "People below the poverty line pay no fees if they attach a BPL certificate from the government (RTI Rules 2012, rule 5).",
  },
  lifeLiberty: {
    title: "Life or liberty",
    body: "If the information concerns someone's life or liberty, for example an unexplained detention, the reply is due within 48 hours (section 7(1)). Explain why; the officer decides whether the 48-hour limit applies.",
  },
  wordLimit: {
    title: "The 500-word guide",
    body: "The RTI Rules suggest keeping a request under 500 words, but a longer request can't be rejected for its length (rule 3). Clear, specific questions get better answers.",
  },
  regNo: {
    title: "Your registration number",
    body: "It identifies your request, e.g. DOPPW/R/E/26/00412: the authority code, R for request or A for appeal, E for online, the year, and a serial number. Quote it in any follow-up.",
  },
  nodal: {
    title: "Nodal officer",
    body: "Each ministry's nodal officer receives online requests and forwards them to the right CPIO, or transfers them to another authority within 5 days.",
  },
  cpio: {
    title: "CPIO",
    body: "The Central Public Information Officer is the official who must reply to your request within 30 days (section 7(1)).",
  },
  pausedClock: {
    title: "Why the clock is paused",
    body: "When the CPIO asks for an additional fee (for copies, ₹2 a page), the days until you pay don't count toward the 30 days (section 7(3)).",
  },
  firstAppeal: {
    title: "First appeal",
    body: "If you get no reply within 30 days, or you're unhappy with the reply, you can appeal to a senior officer, the First Appellate Authority, within 30 days (section 19(1)). It's free. They must decide within 30 days, or 45 with reasons (section 19(6)).",
  },
  secondAppeal: {
    title: "Second appeal",
    body: "If the first appeal doesn't resolve it, you can appeal to the Central Information Commission within 90 days of the decision (section 19(3)).",
  },
} as const;

export type HelpKey = keyof typeof HELP;
