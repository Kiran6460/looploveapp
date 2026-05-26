import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/LegalShell";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Loop Love" },
      { name: "description", content: "How Loop Love collects, uses, and protects your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="May 26, 2026">
      <p>This Privacy Policy explains how Loop Love ("we") collects, uses, and shares information when you use our app and website (the "Service").</p>

      <h2>1. Information we collect</h2>
      <ul>
        <li><strong>Account info:</strong> email, password (hashed), name, age, city, bio, interests, profile photo.</li>
        <li><strong>Activity:</strong> swipes, matches, messages, reports and blocks you submit.</li>
        <li><strong>Technical:</strong> device type, IP address, log data, and basic analytics.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To create your account, show you potential matches, and enable chats.</li>
        <li>To moderate the platform, investigate reports, and enforce our Terms and Community Guidelines.</li>
        <li>To improve the Service and communicate with you about it.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>3. What we do NOT do</h2>
      <ul>
        <li>We do not sell your personal data.</li>
        <li>We do not share your private messages with other users beyond the match you're chatting with.</li>
      </ul>

      <h2>4. Visibility of your profile</h2>
      <p>Your profile (name, age, city, bio, interests, photo) is visible to other authenticated Loop Love users. Don't put information in your profile you wouldn't want other users to see.</p>

      <h2>5. Data retention</h2>
      <p>We retain your account data while your account is active. When you delete your account, we delete or anonymize your profile within 30 days, except where retention is required for legal, safety, or fraud-prevention reasons.</p>

      <h2>6. Your rights</h2>
      <p>Depending on your jurisdiction (GDPR / CCPA / etc.), you may have the right to access, correct, export, or delete your personal data. Contact <a href="mailto:privacy@looplove.app" className="text-primary underline">privacy@looplove.app</a> to make a request.</p>

      <h2>7. Children</h2>
      <p>Loop Love is strictly 18+. We do not knowingly collect data from anyone under 18. If you believe a minor has created an account, please report it immediately so we can remove it.</p>

      <h2>8. Security</h2>
      <p>We use industry-standard security including TLS in transit, encrypted storage, and row-level access controls. No system is 100% secure; please use a strong, unique password.</p>

      <h2>9. Changes</h2>
      <p>We will notify you of material changes to this policy in-app.</p>

      <h2>10. Contact</h2>
      <p>Privacy questions: <a href="mailto:privacy@looplove.app" className="text-primary underline">privacy@looplove.app</a>.</p>
    </LegalShell>
  );
}
