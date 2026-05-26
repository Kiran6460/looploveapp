import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/LegalShell";

export const Route = createFileRoute("/legal/guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — Loop Love" },
      { name: "description", content: "The rules that keep Loop Love safe and respectful." },
    ],
  }),
  component: GuidelinesPage,
});

function GuidelinesPage() {
  return (
    <LegalShell title="Community Guidelines" updated="May 26, 2026">
      <p>Loop Love is built on respect, honesty, and consent. Following these rules keeps the community safe. Violations can result in content removal, suspension, or a permanent ban — and in serious cases, reports to law enforcement.</p>

      <h2>Be real</h2>
      <ul>
        <li>Use your real name and your own clear photos. No catfishing, no impersonation.</li>
        <li>One account per person. You must be 18 or older.</li>
      </ul>

      <h2>Be respectful</h2>
      <ul>
        <li>No harassment, hate speech, slurs, threats, or discrimination based on race, gender, sexuality, religion, disability, or any other protected characteristic.</li>
        <li>No unsolicited explicit messages or images. Consent matters here too.</li>
      </ul>

      <h2>Keep it safe and legal</h2>
      <ul>
        <li>No nudity, pornography, or sexually explicit content in photos or bios.</li>
        <li>No content involving minors. Period.</li>
        <li>No promoting violence, self-harm, drugs, weapons, or illegal activity.</li>
        <li>No prostitution, escort services, or commercial sexual solicitation.</li>
      </ul>

      <h2>No spam or scams</h2>
      <ul>
        <li>No phone numbers, emails, or links to other platforms in your bio.</li>
        <li>No crypto, MLM, "sugar daddy" requests, or any financial scams.</li>
        <li>No fake profiles, bots, or scraping.</li>
      </ul>

      <h2>If something goes wrong</h2>
      <ul>
        <li>Use the <strong>Report</strong> button on any profile that violates these rules.</li>
        <li>Use the <strong>Block</strong> button to prevent any further contact.</li>
        <li>If you are in immediate danger, contact your local emergency services.</li>
      </ul>

      <h2>Safe dating tips</h2>
      <ul>
        <li>Always meet in a public place for the first time.</li>
        <li>Tell a friend where you'll be and who you're meeting.</li>
        <li>Don't share financial information or send money to anyone you met on the app.</li>
        <li>Trust your instincts. If something feels off, leave.</li>
      </ul>
    </LegalShell>
  );
}
