The student's profile:
{{profileContext}}

Look at this chapter's primary tech. Does it appear in their known stack or project summaries?

FAMILIAR (tech is in their stack or a recent project uses it):
  → Call poiesis_prereq_done with result="familiar"
  → (No questions needed — move straight to theory with tradeoff-focused depth.)

UNFAMILIAR (tech NOT in their known stack or projects):
  → Ask 2–3 prerequisite questions via ask_user_question first.
  → Then call poiesis_prereq_done with result="primed" regardless of score.
  → (Score only calibrates depth — never blocks progress.)

Never block progress. The goal is calibration only.
