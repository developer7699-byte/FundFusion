round({
  id: "ate-r1",
  title: "Round 1 — Automation testing platform: scope forks",
  settled: "Nothing settled yet. This is the opening round.",
  qs: [
    {
      id: "q1",
      t: "What is the purpose and context of this platform?",
      ctx: "This answer shapes every later decision: scale, hosting, polish, and business model.",
      o: [
        "Commercial SaaS product sold to other companies",
        "Internal tool for your own team or your clients",
        "Open-source project for the community",
        "Learning or portfolio project"
      ],
      r: 1,
      why: "An internal tool lets you cut scope hard and solve one real problem first. You can still open-source or commercialise it later."
    },
    {
      id: "q2",
      t: "What does the platform test?",
      ctx: "Each target needs a different engine and skill set. A mix multiplies the work.",
      o: [
        "Web UI in a browser",
        "HTTP and REST APIs",
        "Mobile apps (iOS and Android)",
        "A mix of several targets"
      ],
      r: 0,
      why: "Web UI is the narrowest useful MVP. The tooling is mature and most teams need it first. Add API and mobile later."
    },
    {
      id: "q3",
      t: "Who writes the tests?",
      ctx: "The author decides the whole authoring experience and the hardest part of the product.",
      o: [
        "Developers who write test code",
        "QA engineers who use low-code or record-and-playback",
        "AI that generates tests from requirements",
        "Non-technical staff with a visual builder"
      ],
      r: 0,
      why: "Code-first authoring is the cheapest to build and the easiest to keep stable. Record-and-playback and AI generation are hard problems you can add after the core works."
    },
    {
      id: "q4",
      t: "Which layer is the core of the platform?",
      ctx: "The word platform hides about four separate products. Pick the one that gives the most value first.",
      o: [
        "Test authoring and editing",
        "Test execution and a device or browser grid",
        "Reporting, analytics, and flaky-test triage",
        "Test management (plans, cases, runs, coverage)"
      ],
      r: 2,
      why: "Reporting and flaky-test triage is a real pain that existing runners handle poorly. It also lets you build on an existing engine instead of writing your own."
    },
    {
      id: "q5",
      t: "What engine runs the tests?",
      ctx: "This is the biggest scope trap. A home-grown runner can swallow the whole project.",
      o: [
        "Build on Playwright",
        "Build on Selenium",
        "Build on Appium (for mobile)",
        "Write your own runner from scratch"
      ],
      r: 0,
      why: "Playwright is fast, modern, and handles browsers, waiting, and tracing for you. Building on it saves months. Write your own only if no engine fits."
    },
    {
      id: "q6",
      t: "What is missing in the tools you use today?",
      ctx: "The gap is the reason to build at all. Name the one thing current tools do badly.",
      o: [
        "Flaky tests are too hard to find and fix",
        "Setup and maintenance cost too much time",
        "Reports are poor and hard to share with non-engineers",
        "Existing tools cost too much money"
      ],
      r: 0,
      why: "Flakiness is the top complaint about UI test suites and no tool solves it well. It is a sharp, defensible wedge. Confirm it matches your own pain."
    },
    {
      id: "q7",
      t: "Where does the platform run?",
      ctx: "Hosting decides the architecture and the operations burden.",
      o: [
        "SaaS that you host for users",
        "Self-hosted by each user",
        "Local tool on one machine first",
        "Not decided yet"
      ],
      r: 2,
      why: "A local-first tool removes servers, auth, and billing from the MVP. You prove the value first, then add a hosted mode."
    }
  ]
});

answer("ate-r1", {
  q1: [0, "Building a prototype"],
  q2: [2, ""],
  q3: [0, ""],
  q4: [2, "CUSTOM: the user can run the tests AND see a detailed report and analytics — execution is in scope, not just reporting."],
  q5: [2, "for web playwright and for app appium"],
  q6: [0, "CUSTOM: we are not using any tools right now — greenfield, no incumbent to replace."],
  q7: [2, ""]
});

round({
  id: "ate-r2",
  title: "Round 2 — Run tests, then report: the MVP spine",
  settled: "From R1 (updated): the tool both RUNS mobile tests and shows a detailed report with analytics (q4). Dev-authored (q3), Appium for app plus Playwright for web later (q5), local-first (q7), goal a commercial SaaS (q1). You use no testing tools today, so this is greenfield with no incumbent to replace (q6). This round defines the smallest thing that runs a suite and reports on it.",
  qs: [
    {
      id: "q8",
      t: "What does the prototype prove first?",
      ctx: "A prototype needs one clear success test. Pick the first thing that must work.",
      o: [
        "It runs a real Appium suite end to end and shows an accurate report",
        "It detects flaky tests reliably",
        "A developer finds the report useful enough to keep using it",
        "It is polished enough to demo to a customer"
      ],
      r: 0,
      why: "Running a suite and reporting the result accurately is the foundation. Flaky detection, trust, and demos all sit on top of it, so prove this first."
    },
    {
      id: "q9",
      t: "How does the tool run the tests?",
      ctx: "This is the core architecture choice and it decides how engine-agnostic you stay.",
      o: [
        "Wrap the user's existing test command, run it, and read the result file",
        "Drive the Appium API directly from inside the tool",
        "Provide its own test authoring on top of running tests"
      ],
      r: 0,
      why: "Wrapping the test command keeps the tool blind to Appium internals, so Playwright later is just a different command (your q5 plan). The tool only needs to run a command and read a standard results file (JUnit or Allure)."
    },
    {
      id: "q10",
      t: "What goes in the detailed report and analytics for the MVP?",
      ctx: "Detailed report and analytics can mean many things. Scope the first version.",
      o: [
        "Per-run detail: each test's pass or fail, duration, error, and a screenshot or log",
        "Cross-run trends: pass rate and duration over time",
        "Flaky-test detection on top of the runs",
        "All of the above at once"
      ],
      r: 0,
      why: "Per-run detail is the base every other view builds on and is the fastest to ship. Trends and flaky detection reuse the same stored data, so add them next, not now."
    },
    {
      id: "q11",
      t: "Where do the mobile tests run first?",
      ctx: "Running real tests needs a real environment. This is the main operations choice.",
      o: [
        "Android emulator",
        "iOS simulator",
        "Real-device cloud (BrowserStack, Sauce Labs)"
      ],
      r: 0,
      why: "Android emulators are free, fast, and scriptable, with no Apple signing or account hurdles. That makes running and rerunning cheap while you build."
    },
    {
      id: "q12",
      t: "How does the user see the report?",
      ctx: "The report is the stated value, so its surface matters more here than in a pure runner.",
      o: [
        "A local web dashboard",
        "A static HTML report file per run",
        "A CLI table plus a JSON file"
      ],
      r: 1,
      why: "A static HTML report per run is cheap to build, easy to open, and easy to share, yet it still looks like a real report. It is a clean stepping stone to the live web dashboard you will need for SaaS."
    },
    {
      id: "q13",
      t: "Where does the tool store run data?",
      ctx: "Reports and analytics need the results saved and queryable.",
      o: [
        "A local SQLite file",
        "Flat JSON files on disk",
        "In memory only, nothing saved"
      ],
      r: 0,
      why: "SQLite is one local file, needs no server, and makes trends and flaky analytics easy to query later. It ports cleanly to a server database when you go SaaS."
    }
  ]
});

answer("ate-r2", {
  q8: [0, ""],
  q9: [0, ""],
  q10: [0, ""],
  q11: [0, ""],
  q12: [1, ""],
  q13: [0, ""]
});

round({
  id: "ate-r3",
  title: "Round 3 — Concrete build plan",
  settled: "Settled: the tool wraps the user's test command, runs an Appium suite on an Android emulator, reads a standard results file, stores runs in SQLite, and writes a static HTML report with per-test pass/fail, duration, error, and screenshot or log. Goal a commercial SaaS, built local-first, greenfield. This round fixes the last choices needed to start building.",
  qs: [
    {
      id: "q14",
      t: "What language do you build the tool in?",
      ctx: "The tool runs a command, parses a results file, writes HTML, and talks to SQLite. Its language is independent of the test language.",
      o: [
        "TypeScript on Node",
        "Python",
        "Go"
      ],
      r: 0,
      why: "TypeScript on Node is one language for the tool now, the HTML report, and the web dashboard and Playwright work later. Python is also fine; the wrap-the-command design makes this easy to change."
    },
    {
      id: "q15",
      t: "Which results format do you parse first?",
      ctx: "The tool reads what the test run writes. The format decides how much detail you get for free.",
      o: [
        "JUnit XML (universal, but carries no screenshots or rich attachments)",
        "Allure results (richer, embeds screenshots and steps, but needs an adapter in the tests)",
        "Both"
      ],
      r: 0,
      why: "Almost every runner emits JUnit XML out of the box, so it is the fastest path to a working parse. You add screenshots by collecting files (see next question). Allure gives attachments natively and is worth adding once the base works."
    },
    {
      id: "q16",
      t: "How do screenshots and logs get into the report?",
      ctx: "Because the tool only wraps the command, it cannot take screenshots itself. The test run must produce them.",
      o: [
        "Collect artifact files the test writes to a known folder, then link them in the report",
        "The tool captures screenshots itself during the run",
        "Skip screenshots and logs in the first version"
      ],
      r: 0,
      why: "With the wrap-the-command design the tool never drives the app, so it cannot capture screenshots. Collecting files from an agreed folder is the honest fit and works with plain JUnit XML. The test code saves a screenshot on failure; the tool just picks it up."
    },
    {
      id: "q17",
      t: "What do you run to prove the prototype works?",
      ctx: "You have no suite yet, so you need something real to run end to end.",
      o: [
        "A small Appium suite against an existing public demo app (for example the Appium sample app)",
        "A demo Android app you build yourself, plus a suite",
        "Assume the user brings their own suite; do not make one"
      ],
      r: 0,
      why: "A public demo app plus a few Appium tests gives you a real end-to-end run without building an app. You control the tests, so you can prove the report is accurate (q8)."
    },
    {
      id: "q18",
      t: "How does the user tell the tool what to run?",
      ctx: "The tool needs the test command and the folders for results and artifacts.",
      o: [
        "A small config file (JSON or YAML) in the project",
        "Command-line flags only",
        "Both a config file and flags"
      ],
      r: 0,
      why: "A config file keeps the run repeatable and documents the setup in the repo. It is also what a CI step or a future SaaS run would read. Flags can come later for quick overrides."
    },
    {
      id: "q19",
      t: "Does the first version rerun tests, or run once?",
      ctx: "Reruns are the basis of flaky detection, but they add cost and complexity.",
      o: [
        "Run once now; add reruns and flaky detection next",
        "Support N reruns from the start",
        "Run once, but store data so reruns slot in later with no schema change"
      ],
      r: 2,
      why: "Run once keeps the first version small and matches q8 (prove a clean single run first). Designing the SQLite schema so each test can hold many results later means flaky detection is an added feature, not a rebuild."
    }
  ]
});

answer("ate-r3", {
  q14: [0, ""],
  q15: [0, ""],
  q16: [0, ""],
  q17: [0, "We have an Android app with username, password, static OTP — a trading app. Use it as the real target instead of a demo app."],
  q18: [0, ""],
  q19: [0, ""]
});

round({
  id: "ate-r4",
  title: "Round 4 — Trading-app test specifics",
  settled: "The MVP is fixed: a TypeScript/Node CLI that reads a config file, wraps and runs an Appium suite on an Android emulator against your real trading app, parses JUnit XML, collects screenshot and log files, stores runs in SQLite, and writes a static HTML report. This round nails the details needed to run the first real test, plus two safety points for a trading app.",
  qs: [
    {
      id: "q20",
      t: "What is the current Appium setup state?",
      ctx: "You have the app but no suite yet. This sets how much the prototype must also stand up.",
      o: [
        "Nothing set up — standing up Appium and the first login test is part of the prototype",
        "Appium is installed, but no tests are written yet",
        "Appium is set up and a login test already exists"
      ],
      r: 0,
      why: "Greenfield means the prototype includes getting one login test running. That is fine and expected. Pick the option that matches your real state."
    },
    {
      id: "q21",
      t: "Does the trading app run on an Android emulator?",
      ctx: "Many trading and banking apps detect emulators or rooted devices and refuse to start. If yours does, the emulator plan breaks and you need a real device.",
      o: [
        "Not sure yet — verify by installing the APK on an emulator before building",
        "Yes, it runs on an emulator",
        "No, it blocks emulators, so a real device or a device cloud is needed"
      ],
      r: 0,
      why: "This is the biggest risk to the plan. Confirm it first: install the APK on an emulator and open it. If it blocks emulators, switch q11 to a real device or a device cloud (BrowserStack, Sauce Labs) before writing any test."
    },
    {
      id: "q22",
      t: "How does the static OTP work in testing?",
      ctx: "A fixed OTP keeps login deterministic. A real SMS OTP is hard to automate and would block the first test.",
      o: [
        "A fixed constant in a test or staging build (for example always 123456)",
        "Generated, but readable from a test endpoint or database",
        "A real OTP sent by SMS"
      ],
      r: 0,
      why: "A fixed constant makes the login flow fully deterministic, which is exactly what you need for a reliable first test. A real SMS OTP needs extra plumbing and should be avoided for the prototype."
    },
    {
      id: "q23",
      t: "What account and backend do the tests run against?",
      ctx: "Automating a trading app can place real orders. The target environment must be safe.",
      o: [
        "A test or paper account on a staging backend (no real money)",
        "A dedicated test account on production, read-only flows only",
        "A real account on production"
      ],
      r: 0,
      why: "A staging backend with a paper account means no automated action can cost real money. Never automate orders against a real-money production account. If only production exists, keep the tests strictly read-only."
    },
    {
      id: "q24",
      t: "What is in the first test suite?",
      ctx: "Scope the first suite to prove the tool, not to cover the app.",
      o: [
        "Login then land on the dashboard, plus a few read-only flows (portfolio, watchlist)",
        "Login only",
        "Login plus a trade action (place or cancel an order)"
      ],
      r: 0,
      why: "Login plus a couple of read-only checks is enough to prove the report is real and useful, and it places no orders. A trade action adds risk and state, so leave it out of the first suite."
    },
    {
      id: "q25",
      t: "How do you prove the report is accurate?",
      ctx: "To trust the tool you need a run whose correct result you already know.",
      o: [
        "Include one test with a deliberately wrong assertion, so the report must show exactly one fail",
        "Compare the tool's report against Appium's own console output by eye",
        "Manually check each test result"
      ],
      r: 0,
      why: "A known-failing test gives you ground truth: if the report shows exactly that one failure and all else passing, the tool works (R2 q8). This is the cleanest proof and it is easy to set up."
    }
  ]
});

answer("ate-r4", {
  q20: [0, ""],
  q21: [0, ""],
  q22: [0, ""],
  q23: [1, "Read-only flows can be write as well — it's on us. (Caution: automating write/trade on production places real orders; gate behind an explicit flag, dedicated test account, smallest/cancellable orders.)"],
  q24: [0, ""],
  q25: [0, ""]
});
