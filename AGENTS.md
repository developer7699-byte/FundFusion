Instructions for coding agents in this repo. CLAUDE.md holds the same shared rules and imports this file for the repo-specific part. When you change shared rules here, change them in CLAUDE.md and in the global CLAUDE.md in the same turn.

# Shared rules (keep in sync with the global CLAUDE.md, this repo's AGENTS.md and CLAUDE.md)

## Output format rules

- Match the format to the task. Do not make a heavy artifact when a light one is sufficient.
- Use this order of formats. Go up one level only when it adds real understanding:
  1. Prose
  2. Prose in Simplified Technical English (ASD-STE100)
  3. Diagram or image
  4. HTML page (interactive)
- For dense or technical answers, write in ASD-STE100. Use short sentences. Use one instruction per sentence. Use the active voice. Use simple words.
- If full ASD-STE100 is too stiff for the topic, write "80% of the way". Keep the short sentences and the clean structure. Relax the approved-word limit.
- For structure, flow, parts, or relations, make a diagram instead of a paragraph.
- For data a person must explore, make an HTML page. Add interaction only when it helps.
- Treat large custom artifacts as cheap to make. A web app or a page made for one question is acceptable.
- Keep every HTML file you generate (labs, variations, explorations, questions pages). Never delete them unless I ask. I collect them across all repos to extract a design library of my taste.
- Before you build a big artifact, tell me the format you chose and why, in one line.
- Ask first before any HTML page or web app. Diagrams and prose need no check.
- My role moves toward oversight. Make your output easy to check. Show your sources and your steps.

## Asking me questions

- If the questions are few and simple, ask them in the chat.
- Otherwise use the repo's questions page: `questions/questions.html` (fixed template) and `questions/data.js` (append-only data). This is a standing exception to "ask first before any HTML page".
- Give each question its options and your recommended answer, with a short reason.
- Never read or rewrite questions.html or data.js. Append to data.js with a heredoc (`cat >> questions/data.js <<'EOF'`). Append a round: `round({ id, title, settled, qs:[ { id, t, ctx, o:[...], r, why } ] });` (r = index of the recommended option).
- When I paste answers back, append `answer(roundId, { Q1:[pickedIndex, "comment"], ... });`. Move unanswered questions into the next round.
- Open the page for me after each new round (`Start-Process questions/questions.html`).

## Grilling

- During any grilling session, keep a `docs/decisions/grilling.md` file. Update it after each answered round, not only at the end.
- For each round, write a table: question, chosen answer, my comment.
- Add a short summary of how the answers shaped the idea. I must understand it at a glance.
- If I change a decision, mark it "Changed". Do not delete it.
- Use the questions page for the whole grilling session.

## Keep CLAUDE.md and AGENTS.md in sync

- The global CLAUDE.md, the repo's AGENTS.md and the repo's CLAUDE.md (if it exists) must always hold the same shared rules.
- When you change one of these files, make the same change in the others in the same turn. This applies in every direction.
- Put repo-specific content (for example "Where things are") only in that repo's AGENTS.md. Keep global-only lines (for example "If the repo has no ...") only in the global CLAUDE.md.
- Tell me which files you changed.