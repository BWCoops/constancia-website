import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { SEOHead } from "@/components/seo-head";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen page-dark">
      <SEOHead
        title="Privacy Policy | Constancia"
        description="How 1QG GROUP LIMITED collects, uses, and protects your personal data. Our commitment to privacy, UK data protection compliance, and your rights."
        keywords={["privacy policy", "data protection", "GDPR", "personal data", "Constancia privacy"]}
      />
      
      <Navigation />

      <main className="pt-16 sm:pt-20">
        <section className="py-12 bg-gradient-to-b from-brand-navy to-brand-teal">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
                data-testid="link-back-home"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" data-testid="heading-privacy-policy">
                Privacy Policy
              </h1>
              <p className="text-lg text-white/80">
                Last updated: 1 May 2025
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-16 lg:py-24 bg-hp-primary">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="prose prose-lg prose-invert max-w-none"
            >
              <section className="mb-12" data-testid="section-about-policy">
                <h2 className="text-2xl font-bold text-foreground mb-4">About This Privacy Policy</h2>
                <p className="text-muted-foreground mb-4">
                  The website https://Constancia.com/ (the Site) is operated by 1QG GROUP LIMITED ("we", "us", "our"), a company incorporated in England and Wales under company number 16121837. Our registered office is at 86-90 Paul Street, London, EC2A 4NE, United Kingdom.
                </p>
                <p className="text-muted-foreground mb-4">
                  We are committed to protecting your privacy and complying with our data protection obligations under the Data Protection Act 2018 (the DPA 2018), the UK General Data Protection Regulation 2016/679 (the UK GDPR) and any other applicable UK legislation (together, Data Protection Law).
                </p>
                <p className="text-muted-foreground mb-4">
                  When you interact with us or use the Site, we act as the data controller of your personal data. This means that we are responsible for processing your personal data and deciding how to use it. This privacy policy explains the types of personal data we may collect about you when you interact with us, why we collect it, what we use it for and what rights you have over that data. Personal data is any information about an identifiable person. Processing is anything we do with your personal data, including using, storing, sharing and deleting it.
                </p>
                <p className="text-muted-foreground">
                  This policy was last updated on the date shown at the top. We may change this policy at any time by posting an updated version on the Site and will make reasonable efforts to bring any material changes to your attention. You may wish to check it before using the Site as any changes will be effective from the date that they are made.
                </p>
              </section>

              <section className="mb-12" data-testid="section-contact">
                <h2 className="text-2xl font-bold text-foreground mb-4">Contact Information</h2>
                <p className="text-muted-foreground">
                  If you have any concerns or would like further information about our use of data or this policy in general, you can contact us at{" "}
                  <a 
                    href="mailto:info@constancia.com" 
                    className="text-brand-teal hover:underline"
                    data-testid="link-contact-email"
                  >
                    info@constancia.com
                  </a>.
                </p>
              </section>

              <section className="mb-12" data-testid="section-what-we-collect">
                <h2 className="text-2xl font-bold text-foreground mb-4">What Information Do We Collect?</h2>
                <p className="text-muted-foreground">
                  We collect, store and use the types of personal data set out in the table at the end of this policy.
                </p>
              </section>

              <section className="mb-12" data-testid="section-how-we-use">
                <h2 className="text-2xl font-bold text-foreground mb-4">How Will We Use Your Personal Data?</h2>
                <p className="text-muted-foreground">
                  We will use your personal data for the purposes set out in the table at the end of this policy.
                </p>
              </section>

              <section className="mb-12" data-testid="section-data-sharing">
                <h2 className="text-2xl font-bold text-foreground mb-4">How Do We Share Your Personal Data?</h2>
                <p className="text-muted-foreground mb-4">
                  When we share personal data, we do so in accordance with Data Protection Law. We may share certain personal data, where necessary, with employees, contractors, consultants or advisers, to facilitate sales and for general commercial purposes.
                </p>
                <p className="text-muted-foreground">
                  We may also provide third parties with aggregated but anonymised information and analytics about our customers. Before we do so we will make sure that it does not identify you.
                </p>
              </section>

              <section className="mb-12" data-testid="section-third-party-links">
                <h2 className="text-2xl font-bold text-foreground mb-4">Third Party Links</h2>
                <p className="text-muted-foreground">
                  This Site may contain links to other websites over which we have no control. We are not responsible for and do not review or endorse the privacy policies or practices of other websites which you choose to access from this Site. We encourage you to review the privacy policies of those other websites, so you can understand how they collect, use and share your personal information.
                </p>
              </section>

              <section className="mb-12" data-testid="section-your-rights">
                <h2 className="text-2xl font-bold text-foreground mb-4">Your Rights</h2>
                <p className="text-muted-foreground mb-4">
                  We respect your rights to privacy and will respond to requests for access or control over information about you in accordance with Data Protection Law. We may require you to verify your identity before we take any action.
                </p>
                <p className="text-muted-foreground mb-4">
                  Depending on the reason we have your personal data, you have a right to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                  <li>Access the personal information we hold about you (commonly known as subject access)</li>
                  <li>Request that we correct or complete personal information we hold about you that is inaccurate or incomplete</li>
                  <li>Request that we erase your personal information in some circumstances, or object to our processing it</li>
                  <li>Restrict how we use your personal information, in certain circumstances</li>
                  <li>Request that we provide you with copies of your personal information in a machine-readable format or transfer it across different services</li>
                  <li>Where we have asked for your consent to process your data, to withdraw this consent</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  These rights are limited in some situations under Data Protection Law - for example, where we can demonstrate that we are under a legal obligation to process your data.
                </p>
                <p className="text-muted-foreground mb-4">
                  If you wish to exercise any of these rights, please contact us using the details above.
                </p>

                <h3 className="text-xl font-semibold text-foreground mb-3 mt-6">Your Right to Object</h3>
                <p className="text-muted-foreground mb-4">
                  You have a right to object to our processing of your personal data and ask us to stop doing so. If we are processing your personal data for direct marketing purposes (which includes profiling to the extent that it is related to such direct marketing) and you object to this, we will stop processing your personal data immediately.
                </p>
                <p className="text-muted-foreground mb-4">
                  If our processing of your personal data is in the public interest or pursuant to our legitimate interests and you object to this, we will stop processing your personal data unless we have compelling reasons which override your interests, or our use of your personal data is for the establishment, exercise or defence of legal claims.
                </p>
                <p className="text-muted-foreground">
                  We hope that we can satisfy any queries you may have about the way we process your data. However, if you have unresolved concerns you also have the right to complain to data protection authorities (in the UK, the Information Commissioner's Office). You can call the ICO on 0303 123 1113 or go to their website:{" "}
                  <a 
                    href="https://ico.org.uk/make-a-complaint/" 
                    target="_blank" 
                    rel="nofollow noopener noreferrer"
                    className="text-brand-teal hover:underline"
                    data-testid="link-ico"
                  >
                    https://ico.org.uk/make-a-complaint/
                  </a>
                </p>
              </section>

              <section className="mb-12" data-testid="section-data-retention">
                <h2 className="text-2xl font-bold text-foreground mb-4">Data Retention</h2>
                <p className="text-muted-foreground mb-4">
                  Your personal data will only be kept for as long as necessary for our purposes. Specific retention periods are set out in the table at the end of this policy.
                </p>
                <p className="text-muted-foreground">
                  At the end of the specified retention periods, your personal data will either be securely destroyed or anonymised, unless we are required to keep it to comply with our legal obligations.
                </p>
              </section>

              <section className="mb-12" data-testid="section-data-principles">
                <h2 className="text-2xl font-bold text-foreground mb-4">Data Protection Principles</h2>
                <p className="text-muted-foreground mb-4">
                  We process your personal data in accordance with the following principles:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
                  <li>We process your personal data lawfully, fairly and in a transparent way</li>
                  <li>We collect your personal data for specified, explicit and legitimate purposes; any further processing we do is compatible with the original purposes for which we collected it</li>
                  <li>We only process personal data that is adequate, relevant and limited to what is necessary to achieve the purpose for which it is processed</li>
                  <li>We take reasonable steps to ensure that all personal data is accurate and kept up to date where necessary</li>
                  <li>We do not store personal data in a form that identifies you for any longer than is necessary for the purposes of our processing</li>
                  <li>We process personal data securely and in a way that protects against unauthorised or unlawful processing, accidental loss, destruction or damage</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  When we ask for your personal data we will tell you whether you are required by law or contract to provide it, and what will happen if you do not provide the data.
                </p>
                <p className="text-muted-foreground">
                  Any request for consent to the processing of your personal data will be made directly to you and will include information about why we require the personal data and what will be done with it.
                </p>
              </section>

              <section className="mb-12" data-testid="section-lawful-basis">
                <h2 className="text-2xl font-bold text-foreground mb-4">What Is Our Lawful Basis for Processing?</h2>
                <p className="text-muted-foreground mb-4">
                  We will only process personal data when we have a lawful basis for doing that processing. The table at the end of this policy sets out the lawful basis we rely on for each type of data we process.
                </p>
                <p className="text-muted-foreground mb-4">
                  We will choose one of the lawful bases in the UK GDPR to justify how we use your personal data. These are:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Consent:</strong> You have given consent to the processing of your personal data for one or more specific purposes. You have the right to withdraw your consent at any time.</li>
                  <li><strong>Contract:</strong> The processing is necessary for the performance of a contract with you or to take steps at your request before entering into a contract.</li>
                  <li><strong>Legal obligation:</strong> We need to process your personal data to comply with a legal obligation.</li>
                  <li><strong>Vital interests:</strong> The processing is necessary to protect the vital interests of you or another person.</li>
                  <li><strong>Public interest:</strong> Processing is necessary for the performance of a task carried out in the public interest or in the exercise of some official authority.</li>
                  <li><strong>Legitimate interests:</strong> Processing is necessary for the purposes of legitimate interests pursued by us or someone else, except where such interests are overridden by your interests or fundamental rights and freedoms requiring the protection of your personal data.</li>
                </ul>
              </section>

              <section data-testid="section-data-table">
                <h2 className="text-2xl font-bold text-foreground mb-6">Table of Personal Information We Use</h2>
                <p className="text-muted-foreground mb-6">
                  The table below sets out detailed information about the types of personal information we collect, our purposes for processing, the basis for processing and the retention period for the personal data.
                </p>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-4 text-left text-foreground font-semibold">Category of Personal Data</th>
                        <th className="border border-border p-4 text-left text-foreground font-semibold">Purpose of Processing</th>
                        <th className="border border-border p-4 text-left text-foreground font-semibold">Lawful Basis for Processing</th>
                        <th className="border border-border p-4 text-left text-foreground font-semibold">Retention Period</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-border p-4 text-muted-foreground">Name and contact details</td>
                        <td className="border border-border p-4 text-muted-foreground">To provide consultancy services</td>
                        <td className="border border-border p-4 text-muted-foreground">Performance of contract; Compliance with legal obligation</td>
                        <td className="border border-border p-4 text-muted-foreground">For three years since you last logged on to the Site</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-4 text-muted-foreground">Browser, device and Site usage information</td>
                        <td className="border border-border p-4 text-muted-foreground">To improve the site; To protect the Site against fraud; To set default options for you, such as language and currency</td>
                        <td className="border border-border p-4 text-muted-foreground">Performance of contract; Legitimate interest in maintaining our Site</td>
                        <td className="border border-border p-4 text-muted-foreground">For three years since you last logged on to the Site</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-4 text-muted-foreground">Information generated in the course of the use of our products and services</td>
                        <td className="border border-border p-4 text-muted-foreground">For internal research and development purposes</td>
                        <td className="border border-border p-4 text-muted-foreground">Performance of contract; Legitimate interest in maintaining our Site and improving our products and/or services generally</td>
                        <td className="border border-border p-4 text-muted-foreground">For four years</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-4 text-muted-foreground">Information collected through cookies and similar technologies</td>
                        <td className="border border-border p-4 text-muted-foreground">To conduct and store Site usage analytics, statistical and trend analysis and market research; To generate customer profiles to facilitate marketing initiatives</td>
                        <td className="border border-border p-4 text-muted-foreground">Consent</td>
                        <td className="border border-border p-4 text-muted-foreground">For three years since you gave consent, or until you withdraw consent if earlier</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
