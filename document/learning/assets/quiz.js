function mountQuizzes() {
  document.querySelectorAll("[data-quiz]").forEach((root) => {
    const correct = root.getAttribute("data-correct");
    const feedbackOk = root.getAttribute("data-ok") ?? "Yes.";
    const feedbackBad = root.getAttribute("data-bad") ?? "Not that one.";
    const box = root.querySelector(".feedback");
    root.querySelectorAll("button[data-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = btn.getAttribute("data-choice");
        const ok = choice === correct;
        box.textContent = ok ? feedbackOk : feedbackBad;
        box.className = "feedback " + (ok ? "ok" : "bad");
        root.querySelectorAll("button[data-choice]").forEach((b) => {
          b.setAttribute("aria-disabled", "true");
          b.disabled = true;
        });
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", mountQuizzes);
