import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — 888clinic" },
      {
        name: "description",
        content:
          "Privacy Policy for 888clinic covering personal information, appointments, website use, AI skin analysis and skin scan photos.",
      },
      { property: "og:title", content: "Privacy Policy — 888clinic" },
      {
        property: "og:description",
        content:
          "How 888clinic collects, uses, stores and protects personal information and skin scan photos.",
      },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    title: "1. About this Privacy Policy",
    paragraphs: [
      "This Privacy Policy explains how 888clinic collects, uses, stores and protects personal information when you use our website, contact us, request an appointment, purchase or use our services, or use our AI skin analysis and related features.",
      "By using our website or services, you acknowledge that you have read this Privacy Policy. Where applicable, we will request your consent before collecting or using information for purposes that require consent.",
    ],
  },
  {
    title: "2. Information We Collect",
    paragraphs: [
      "Depending on how you use 888clinic, we may collect information such as your name, telephone number, email address, appointment or enquiry details, and information that you voluntarily provide when communicating with us.",
      "If you use our AI skin analysis or skin scanning features, you may provide photographs or other images of your skin. Please do not upload information that you do not want us to process.",
      "We may also receive technical information about your use of the website, such as browser, device, approximate location, IP address, pages visited and information collected through cookies or similar technologies.",
    ],
  },
  {
    title: "3. How We Use Your Information",
    paragraphs: [
      "We may use personal information to respond to enquiries, arrange and manage appointments, provide requested services, operate the website, provide AI skin analysis features, communicate with you about our services, maintain website security, improve our services and comply with applicable legal obligations.",
      "Where we use information for marketing or promotional communications, we will provide appropriate choices or consent mechanisms where required by applicable law.",
    ],
  },
  {
    title: "4. AI Skin Analysis and Skin Images",
    paragraphs: [
      "888clinic may process photographs submitted for AI skin analysis. The analysis is intended to provide preliminary information and should not be treated as a medical diagnosis or a substitute for assessment by a qualified medical professional.",
      "Image quality, lighting, camera angle and other factors may affect analysis results. You should seek professional medical advice when you have concerns about your skin or health.",
      "We will handle submitted images and related information in accordance with this Privacy Policy and applicable data-protection requirements.",
    ],
  },
  {
    title: "5. Cookies and Similar Technologies",
    paragraphs: [
      "Our website may use cookies and similar technologies to keep the website functioning, remember preferences, understand how visitors use the website, improve performance and, where applicable, support analytics or marketing activities.",
      "You may be able to control cookies through your browser settings. Disabling certain cookies may affect some website features.",
    ],
  },
  {
    title: "6. Sharing of Information",
    paragraphs: [
      "We may share personal information only where reasonably necessary for the purposes described in this Privacy Policy, including with authorised clinic personnel, technology or hosting providers, service providers supporting our website or communications, and other providers acting on our behalf.",
      "We may also disclose information when required or permitted by applicable law, regulation, legal process, or to protect the rights, safety and security of 888clinic, our users or others.",
    ],
  },
  {
    title: "7. Data Security",
    paragraphs: [
      "We take reasonable technical and organisational measures designed to protect personal information against unauthorised access, loss, misuse, alteration or disclosure.",
      "No internet transmission or electronic storage system can be guaranteed to be completely secure. Please contact us promptly if you believe your information has been accessed or disclosed without authorisation.",
    ],
  },
  {
    title: "8. Data Retention",
    paragraphs: [
      "We retain personal information only for as long as reasonably necessary for the purposes for which it was collected, to provide services, maintain appropriate records, resolve disputes, enforce agreements, and meet applicable legal or regulatory requirements.",
      "Retention periods may vary depending on the type of information and the reason it was collected.",
    ],
  },
  {
    title: "9. Your Rights",
    paragraphs: [
      "Depending on applicable law, you may have rights relating to your personal information, including rights to request access, correction, deletion, restriction or objection to certain processing, withdraw consent where processing is based on consent, and request information about how your data is processed.",
      "To exercise a privacy right or ask a question about your information, contact us using the details below. We may need to verify your identity before completing a request.",
    ],
  },
  {
    title: "10. Third-Party Websites and Services",
    paragraphs: [
      "Our website may contain links to third-party websites, social-media platforms, booking services, payment services or other external services. Their privacy practices are governed by their own policies, and 888clinic is not responsible for the privacy practices of third parties.",
    ],
  },
  {
    title: "11. Children's Privacy",
    paragraphs: [
      "Our website and services are not intended to knowingly collect personal information from children without appropriate involvement or consent from a parent or legal guardian where required by law.",
    ],
  },
  {
    title: "12. Changes to This Privacy Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time to reflect changes to our services, technology, legal requirements or privacy practices. The updated version will be published on this page with a revised update date.",
    ],
  },
];

function PrivacyPage() {
  return (
    <div className="bg-shell">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <p className="eyebrow">LEGAL</p>

        <h1 className="mt-4 text-4xl leading-tight">
          Privacy Policy
        </h1>

        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: October 7, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold text-foreground">
                {section.title}
              </h2>

              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}

          <section>
            <h2 className="text-lg font-semibold text-foreground">
              13. Contact 888clinic
            </h2>

            <p className="mt-3">
              If you have questions about this Privacy Policy or want to
              exercise a privacy right, contact 888clinic at{" "}
              <a
                href="mailto:care@888clinic.co"
                className="text-foreground underline hover:text-gold"
              >
                care@888clinic.co
              </a>
              .
            </p>

            <p className="mt-3">
              Website:{" "}
              <a
                href="https://888clinic.co"
                className="text-foreground underline hover:text-gold"
                target="_blank"
                rel="noreferrer"
              >
                888clinic.co
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
