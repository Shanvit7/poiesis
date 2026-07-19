Propose 3–5 tests as learning checkpoints. Call poiesis_confirm_test_plan with:
- chapterNum: {{chapterNum}}
- intro: 1–2 sentences on what the student will have built by the end
- tests: array of { name, why } — name in plain words, why explains what it proves

Do NOT write the list in chat first. Do NOT call ask_user_question.
The tool renders its own full-screen dialog. Just call the tool.

If the tool returns "add": ask the student what to add, then re-call with it appended.
If "skip": ask which one, then re-call without it.
