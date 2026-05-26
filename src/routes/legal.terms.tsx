import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalShell } from "@/components/LegalShell";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Loop Love" },
      { name: "description", content: "Terms & Conditions for using Loop Love." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalShell title="Terms & Conditions" updated="May 26, 2026">
      <p>Welcome to Loop Love ("we", "us", "our"). By creating an account or using the Loop Love app and website (the "Service"), you agree to these Terms & Conditions ("Terms"). If you do not agree, do not use the Service.</p>

      <h2>1. Eligibility</h2>
      <p>You must be at least <strong>18 years old</strong> to use Loop Love. By using the Service, you represent and warrant that you are 18+ and that you have the legal capacity to enter into this agreement. We may terminate accounts of any user found to be under 18.</p>

      <h2>2. Your account</h2>
      <p>You are responsible for the accuracy of the information in your profile, for keeping your credentials secure, and for all activity under your account. You may only have one account. Impersonation, fake profiles, and accounts created with another person's photos are prohibited.</p>

      <h2>3. Acceptable use</h2>
      <p>You agree not to use the Service to harass, threaten, defraud, solicit minors, post explicit sexual content, advertise paid sexual services, spam, scrape, or violate any law. See our <Link to="/legal/guidelines" className="text-primary underline">Community Guidelines</Link> for details.</p>

      <h2>4. Content you submit</h2>
      <p>You retain ownership of content you upload (photos, bio, messages). You grant Loop Love a worldwide, non-exclusive, royalty-free license to host, store, display, and distribute that content solely for operating and improving the Service. You represent that you have all rights necessary to grant this license.</p>

      <h2>5. Moderation and enforcement</h2>
      <p>We may, at our sole discretion and without prior notice, remove content, restrict features, suspend, or permanently terminate accounts that violate these Terms, our Community Guidelines, or applicable law. Repeat or severe violations may result in permanent bans and reports to law enforcement.</p>

      <h2>6. No screening</h2>
      <p>Loop Love does not conduct criminal background checks on its users. You are solely responsible for your interactions with other users. <strong>Always meet in a public place and tell someone where you'll be.</strong></p>

      <h2>7. Disclaimer & limitation of liability</h2>
      <p>The Service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Loop Love and its operators are not liable for any indirect, incidental, consequential, or special damages arising from your use of the Service or interactions with other users.</p>

      <h2>8. Termination</h2>
      <p>You may delete your account at any time from the Profile page. We may suspend or terminate access at any time for any reason, including violations of these Terms.</p>

      <h2>9. Changes</h2>
      <p>We may update these Terms. Material changes will be communicated in-app. Continued use after changes means you accept them.</p>

      <h2>10. Contact</h2>
      <p>Questions about these Terms: <a href="mailto:support@looplove.app" className="text-primary underline">support@looplove.app</a>.</p>
    </LegalShell>
  );
}
